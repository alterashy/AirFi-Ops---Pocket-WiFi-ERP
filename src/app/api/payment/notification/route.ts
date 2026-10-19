import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const notification = await req.json();
    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    if (!orderId) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ orderNumber: orderId }, { midtransOrderId: orderId }],
      },
      include: {
        orderDevices: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const deviceIds = order.orderDevices.map((od) => od.deviceId);

    // Handle Midtrans payment status transitions
    if (
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && fraudStatus === "accept")
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
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "CANCELLED",
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
    }

    return NextResponse.json({ status: "OK" });
  } catch (error) {
    console.error("Error processing Midtrans notification:", error);
    return NextResponse.json(
      { error: "Internal notification processing error" },
      { status: 500 }
    );
  }
}
