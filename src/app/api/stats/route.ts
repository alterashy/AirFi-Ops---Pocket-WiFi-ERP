import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET(req: NextRequest) {
  req.nextUrl.searchParams.get("t");
  try {
    const [
      totalDevices,
      availableDevices,
      inUseDevices,
      maintenanceDevices,
      activeOrders,
      completedOrders,
      inspections,
      booths,
    ] = await Promise.all([
      prisma.device.count(),
      prisma.device.count({ where: { status: "AVAILABLE" } }),
      prisma.device.count({ where: { status: "IN_USE" } }),
      prisma.device.count({ where: { status: "MAINTENANCE" } }),
      prisma.order.count({ where: { orderStatus: "ACTIVE", paymentStatus: "PAID" } }),
      prisma.order.count({ where: { orderStatus: "COMPLETED" } }),
      prisma.inspection.findMany({
        select: { refundAmount: true, depositRefundStatus: true },
      }),
      prisma.airportBooth.count(),
    ]);

    const totalRefundDispatched = inspections.reduce(
      (sum, item) => sum + (item.refundAmount || 0),
      0
    );

    return NextResponse.json({
      fleet: {
        total: totalDevices,
        available: availableDevices,
        inUse: inUseDevices,
        maintenance: maintenanceDevices,
      },
      orders: {
        active: activeOrders,
        completed: completedOrders,
      },
      refunds: {
        totalDispatched: totalRefundDispatched,
        totalInspected: inspections.length,
      },
      boothsCount: booths,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
