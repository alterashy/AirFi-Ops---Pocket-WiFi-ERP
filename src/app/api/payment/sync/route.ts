import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMidtransStatus } from "@/lib/midtrans";

export async function GET(req: NextRequest) {
  req.nextUrl.searchParams.get("t");
  try {
    const pendingOrders = await prisma.order.findMany({
      where: {
        paymentStatus: "PENDING",
      },
      include: {
        orderDevices: true,
      },
    });

    if (pendingOrders.length === 0) {
      return NextResponse.json({ synced: 0, updated: 0 });
    }

    let updatedCount = 0;
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);

    for (const order of pendingOrders) {
      const midtransStatus = await checkMidtransStatus(order.orderNumber);
      const deviceIds = order.orderDevices.map((od) => od.deviceId);
      const isStale = new Date(order.createdAt).getTime() < twentyMinsAgo.getTime();

      if (
        midtransStatus &&
        (midtransStatus.transactionStatus === "settlement" ||
          (midtransStatus.transactionStatus === "capture" && midtransStatus.fraudStatus === "accept"))
      ) {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: "PAID",
              orderStatus: "ACTIVE",
            },
          });

          if (deviceIds.length > 0) {
            await tx.device.updateMany({
              where: { id: { in: deviceIds } },
              data: { status: "IN_USE" },
            });
          }
        });
        updatedCount++;
      } else if (
        midtransStatus?.transactionStatus === "cancel" ||
        midtransStatus?.transactionStatus === "deny" ||
        midtransStatus?.transactionStatus === "expire" ||
        (!midtransStatus && isStale)
      ) {
        // Auto-expire abandoned orders after 20 minutes and release pocket Wi-Fi hardware
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: isStale ? "EXPIRED" : "CANCELLED",
              orderStatus: "CANCELLED",
            },
          });

          if (deviceIds.length > 0) {
            await tx.device.updateMany({
              where: { id: { in: deviceIds } },
              data: { status: "AVAILABLE" },
            });
          }
        });
        updatedCount++;
      }
    }

    return NextResponse.json({
      synced: pendingOrders.length,
      updated: updatedCount,
    });
  } catch (error) {
    console.error("Failed to sync pending payments with Midtrans:", error);
    return NextResponse.json(
      { error: "Failed to sync payment statuses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
