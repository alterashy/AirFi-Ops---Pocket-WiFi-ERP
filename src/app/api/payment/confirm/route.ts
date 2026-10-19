import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderNumber, action = "CONFIRM" } = body;

    if (!orderNumber) {
      return NextResponse.json(
        { error: "orderNumber is required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ orderNumber }, { id: orderNumber }],
      },
      include: {
        orderDevices: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const deviceIds = order.orderDevices.map((od) => od.deviceId);

    if (action === "CANCEL") {
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const o = await tx.order.update({
          where: { id: order.id },
          data: {
            orderStatus: "CANCELLED",
            paymentStatus: "CANCELLED",
          },
        });

        if (deviceIds.length > 0) {
          await tx.device.updateMany({
            where: { id: { in: deviceIds } },
            data: { status: "AVAILABLE" },
          });
        }

        return o;
      });

      return NextResponse.json({ success: true, order: updatedOrder, action: "CANCELLED" });
    }

    // Default: CONFIRM payment -> Order becomes ACTIVE & PAID, Device becomes IN_USE
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id: order.id },
        data: {
          orderStatus: "ACTIVE",
          paymentStatus: "PAID",
        },
      });

      if (deviceIds.length > 0) {
        await tx.device.updateMany({
          where: { id: { in: deviceIds } },
          data: { status: "IN_USE" },
        });
      }

      return o;
    });

    return NextResponse.json({ success: true, order: updatedOrder, action: "CONFIRMED" });
  } catch (error) {
    console.error("Failed to process payment confirmation/cancellation:", error);
    return NextResponse.json(
      { error: "Failed to update payment status" },
      { status: 500 }
    );
  }
}
