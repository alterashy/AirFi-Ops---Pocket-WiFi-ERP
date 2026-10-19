import { NextRequest, NextResponse } from "next/server";
import { createSnapTransaction } from "@/lib/midtrans";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, grossAmount, customerName, customerEmail, customerPhone } = body;

    if (!orderId || !grossAmount || !customerName || !customerEmail) {
      return NextResponse.json(
        { error: "Missing required payment fields" },
        { status: 400 }
      );
    }

    const snapResult = await createSnapTransaction({
      orderId,
      grossAmount: Number(grossAmount),
      customerName,
      customerEmail,
      customerPhone,
      itemDetails: [
        {
          id: `${orderId}-rent`,
          price: Math.max(0, Number(grossAmount) - 500000),
          quantity: 1,
          name: "AirFi Pocket Wi-Fi Rental Fee",
        },
        {
          id: `${orderId}-deposit`,
          price: 500000,
          quantity: 1,
          name: "Security Deposit (Refundable)",
        },
      ],
    });

    try {
      await prisma.order.updateMany({
        where: { orderNumber: orderId },
        data: {
          midtransSnapToken: snapResult.token,
          midtransOrderId: orderId,
        },
      });
    } catch {
      //
    }

    return NextResponse.json({
      token: snapResult.token,
      redirectUrl: snapResult.redirectUrl,
      isMock: snapResult.isMock,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "SB-Mid-client-demo-key",
    });
  } catch (error) {
    console.error("Failed to generate Midtrans snap token:", error);
    return NextResponse.json(
      { error: "Failed to generate payment token" },
      { status: 500 }
    );
  }
}
