import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET(req: NextRequest) {
  try {
    const activeOnly = req.nextUrl.searchParams.get("active") === "true";
    const booths = await prisma.airportBooth.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        devices: {
          include: {
            orderDevices: {
              include: {
                order: true,
              },
            },
          },
        },
        _count: {
          select: {
            devices: true,
            pickupOrders: true,
            returnOrders: true,
          },
        },
      },
    });

    const enriched = booths.map((b) => {
      const isDeviceReallyAvailable = (d: (typeof b.devices)[number]) => {
        if (d.status !== "AVAILABLE") return false;
        const hasActiveOrder = d.orderDevices?.some(
          (od) => od.order && (od.order.orderStatus === "ACTIVE" || od.order.orderStatus === "BOOKED")
        );
        return !hasActiveOrder;
      };

      const availableCount = b.devices.filter(isDeviceReallyAvailable).length;
      const inUseCount = b.devices.filter((d) => d.status === "IN_USE" || !isDeviceReallyAvailable(d)).length;
      const maintenanceCount = b.devices.filter((d) => d.status === "MAINTENANCE").length;

      return {
        id: b.id,
        code: b.code,
        name: b.name,
        city: b.city,
        terminal: b.terminal,
        isActive: b.isActive,
        totalDevices: b.devices.length,
        availableDevices: availableCount,
        inUseDevices: inUseCount,
        maintenanceDevices: maintenanceCount,
      };
    });

    return NextResponse.json({ booths: enriched });
  } catch (error) {
    console.error("Failed to fetch booths:", error);
    return NextResponse.json({ error: "Failed to fetch booths" }, { status: 500 });
  }
}

