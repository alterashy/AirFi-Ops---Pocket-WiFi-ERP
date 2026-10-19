import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const boothId = searchParams.get("boothId");
    const status = searchParams.get("status");

    const where: { boothId?: string; status?: string } = {};
    if (boothId && boothId !== "ALL") where.boothId = boothId;
    if (status && status !== "ALL") where.status = status;

    const devices = await prisma.device.findMany({
      where,
      include: {
        booth: true,
        orderDevices: {
          include: {
            order: true,
          },
        },
      },
      orderBy: { serialNumber: "asc" },
    });

    return NextResponse.json({ devices });
  } catch (error) {
    console.error("Failed to fetch devices:", error);
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, boothId } = body;

    if (!id) {
      return NextResponse.json({ error: "Device ID is required" }, { status: 400 });
    }

    const updated = await prisma.device.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(boothId ? { boothId } : {}),
      },
    });

    return NextResponse.json({ device: updated });
  } catch (error) {
    console.error("Failed to update device:", error);
    return NextResponse.json({ error: "Failed to update device" }, { status: 500 });
  }
}
