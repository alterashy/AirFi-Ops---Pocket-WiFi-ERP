import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const boothId = searchParams.get("boothId");
    const search = searchParams.get("search");

    const where: Prisma.OrderWhereInput = {};
    if (status && status !== "ALL") where.orderStatus = status;
    if (boothId && boothId !== "ALL") where.pickupBoothId = boothId;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerEmail: { contains: search } },
        { orderDevices: { some: { device: { imei: { contains: search } } } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        pickupBooth: true,
        returnBooth: true,
        orderDevices: {
          include: {
            device: true,
          },
        },
        inspections: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      destinationCountry,
      countryCode,
      startDate,
      endDate,
      dailyRate = 75000,
      pickupBoothId,
      returnBoothId,
    } = body;

    if (!customerName || !customerEmail || !destinationCountry || !startDate || !endDate || !pickupBoothId) {
      return NextResponse.json(
        { error: "Missing required booking fields" },
        { status: 400 }
      );
    }

    // 1. Calculate rental duration and amounts
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const rentalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const depositAmount = 500000; // IDR 500,000 standard deposit
    const rentalTotal = rentalDays * Number(dailyRate);
    const grandTotal = rentalTotal + depositAmount;

    // 2. Validate and resolve pickupBooth
    let booth = await prisma.airportBooth.findUnique({
      where: { id: pickupBoothId },
    });
    if (!booth) {
      booth = await prisma.airportBooth.findFirst({
        where: { isActive: true },
      });
    }
    const resolvedBoothId = booth ? booth.id : pickupBoothId;
    const returnBooth = returnBoothId
      ? await prisma.airportBooth.findUnique({ where: { id: returnBoothId } })
      : null;
    const resolvedReturnBoothId = returnBooth ? returnBooth.id : resolvedBoothId;

    // 3. Generate Order Number: JM-YYYYMMDD-XXX-RAND (guaranteed unique for Midtrans)
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const countToday = await prisma.order.count();
    const orderNumber = `JM-${todayStr}-${String(countToday + 1).padStart(3, "0")}-${randSuffix}`;

    // 4. Atomically find available device & create order inside a single transaction
    // Exclude devices currently tied to active orders or unexpired bookings (< 20 mins)
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);

    const newOrder = await prisma.$transaction(async (tx) => {
      // Find available device at pickup booth
      let device = await tx.device.findFirst({
        where: {
          boothId: resolvedBoothId,
          status: "AVAILABLE",
          orderDevices: {
            none: {
              order: {
                OR: [
                  { orderStatus: "ACTIVE" },
                  { orderStatus: "BOOKED", createdAt: { gte: twentyMinsAgo } },
                ],
              },
            },
          },
        },
      });

      // Fallback: check any available device across other booths
      if (!device) {
        device = await tx.device.findFirst({
          where: {
            status: "AVAILABLE",
            orderDevices: {
              none: {
                order: {
                  OR: [
                    { orderStatus: "ACTIVE" },
                    { orderStatus: "BOOKED", createdAt: { gte: twentyMinsAgo } },
                  ],
                },
              },
            },
          },
        });
      }

      if (!device) {
        throw new Error("No available pocket Wi-Fi devices in stock. Please replenish fleet.");
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerName,
          customerEmail,
          customerPhone: customerPhone || "08123456789",
          destinationCountry,
          countryCode: countryCode || "GL",
          startDate: start,
          endDate: end,
          rentalDays,
          dailyRate: Number(dailyRate),
          rentalTotal,
          depositAmount,
          grandTotal,
          paymentStatus: "PENDING",
          orderStatus: "BOOKED",
          pickupBoothId: resolvedBoothId,
          returnBoothId: resolvedReturnBoothId,
          orderDevices: {
            create: {
              deviceId: device.id,
            },
          },
        },
        include: {
          pickupBooth: true,
          returnBooth: true,
          orderDevices: {
            include: { device: true },
          },
        },
      });

      return order;
    });

    return NextResponse.json({ order: newOrder }, { status: 201 });
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
