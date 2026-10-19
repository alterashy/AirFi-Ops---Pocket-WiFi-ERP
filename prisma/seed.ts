import { Device } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("[Seed] Starting AirFi Ops initial dataset seeding...");

  // 1. Clean existing records
  await prisma.inspection.deleteMany();
  await prisma.orderDevice.deleteMany();
  await prisma.order.deleteMany();
  await prisma.device.deleteMany();
  await prisma.airportBooth.deleteMany();

  // 2. Create Airport Booths
  const cgk = await prisma.airportBooth.create({
    data: {
      code: "CGK-T3",
      name: "Soekarno-Hatta T3 International Booth",
      city: "Tangerang / Jakarta",
      terminal: "Terminal 3 Departure & Arrival Gate 2",
      isActive: true,
    },
  });

  const sub = await prisma.airportBooth.create({
    data: {
      code: "SUB-T2",
      name: "Juanda International T2 Booth",
      city: "Surabaya",
      terminal: "Terminal 2 International Arrival Hall",
      isActive: true,
    },
  });

  const dps = await prisma.airportBooth.create({
    data: {
      code: "DPS-INT",
      name: "Ngurah Rai International Booth",
      city: "Bali",
      terminal: "International Arrival Corridor",
      isActive: true,
    },
  });

  console.log("[Seed] Seeded Airport Booths (CGK-T3, SUB-T2, DPS-INT)");

  // 3. Create Devices Fleet
  const devicesData = [
    { imei: "867452050123401", serialNumber: "AF-5G-CGK-01", model: "AirFi 5G Global Max", status: "IN_USE", boothId: cgk.id },
    { imei: "867452050123402", serialNumber: "AF-5G-CGK-02", model: "AirFi 5G Global Max", status: "IN_USE", boothId: cgk.id },
    { imei: "867452050123403", serialNumber: "AF-4G-CGK-03", model: "AirFi 4G Pro Unlimited", status: "AVAILABLE", boothId: cgk.id },
    { imei: "867452050123404", serialNumber: "AF-4G-CGK-04", model: "AirFi 4G Pro Unlimited", status: "AVAILABLE", boothId: cgk.id },
    { imei: "867452050123405", serialNumber: "AF-5G-CGK-05", model: "AirFi 5G Global Max", status: "AVAILABLE", boothId: cgk.id },
    { imei: "867452050123406", serialNumber: "AF-4G-CGK-06", model: "AirFi 4G Pro Unlimited", status: "MAINTENANCE", boothId: cgk.id },
    { imei: "867452050123407", serialNumber: "AF-5G-SUB-01", model: "AirFi 5G Global Max", status: "AVAILABLE", boothId: sub.id },
    { imei: "867452050123408", serialNumber: "AF-4G-SUB-02", model: "AirFi 4G Pro Unlimited", status: "AVAILABLE", boothId: sub.id },
    { imei: "867452050123409", serialNumber: "AF-5G-DPS-01", model: "AirFi 5G Global Max", status: "AVAILABLE", boothId: dps.id },
    { imei: "867452050123410", serialNumber: "AF-4G-DPS-02", model: "AirFi 4G Pro Unlimited", status: "AVAILABLE", boothId: dps.id },
  ];

  const devices: Device[] = [];
  for (const d of devicesData) {
    const dev = await prisma.device.create({ data: d });
    devices.push(dev);
  }

  console.log(`[Seed] Seeded ${devices.length} Devices across booths`);

  // 4. Create Sample Orders
  const now = new Date();
  await prisma.order.create({
    data: {
      orderNumber: "AF-20261018-001",
      customerName: "Budi Santoso",
      customerEmail: "budi.santoso@example.com",
      customerPhone: "+6281234567890",
      destinationCountry: "Japan",
      countryCode: "JP",
      startDate: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      endDate: now,
      rentalDays: 7,
      dailyRate: 75000,
      rentalTotal: 525000,
      depositAmount: 500000,
      grandTotal: 1025000,
      paymentStatus: "PAID",
      orderStatus: "ACTIVE",
      pickupBoothId: cgk.id,
      returnBoothId: cgk.id,
      orderDevices: {
        create: {
          deviceId: devices[0].id,
        },
      },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: "AF-20261018-002",
      customerName: "Siti Rahma",
      customerEmail: "siti.rahma@example.com",
      customerPhone: "+6281987654321",
      destinationCountry: "Singapore",
      countryCode: "SG",
      startDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      rentalDays: 4,
      dailyRate: 60000,
      rentalTotal: 240000,
      depositAmount: 500000,
      grandTotal: 740000,
      paymentStatus: "PAID",
      orderStatus: "ACTIVE",
      pickupBoothId: cgk.id,
      returnBoothId: cgk.id,
      orderDevices: {
        create: {
          deviceId: devices[1].id,
        },
      },
    },
  });

  console.log("[Seed] Seeded Sample Orders (Including ready-to-return order AF-20261018-001)");
  console.log("[Seed] Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("[Seed] Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
