import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerN8nRefundWebhook } from "@/lib/n8n";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      deviceId,
      returnBoothId,
      inspectedBy = "Booth Staff CGK-T3",
      unitCondition = "GOOD", // GOOD, SCRATCHED, DAMAGED
      cableReturned = true,
      pouchReturned = true,
      chargerReturned = true,
      notes = "",
    } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    // 1. Fetch order and device details
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { orderNumber: orderId },
        ],
      },
      include: {
        orderDevices: {
          include: { device: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Idempotency guard: prevent duplicate return inspections or duplicate refunds
    if (order.orderStatus === "COMPLETED") {
      return NextResponse.json(
        { error: `Order ${order.orderNumber} has already been returned and settled.` },
        { status: 400 }
      );
    }

    const existingInspection = await prisma.inspection.findFirst({
      where: { orderId: order.id },
    });

    if (existingInspection) {
      return NextResponse.json(
        { error: `Inspection and deposit refund already completed for order ${order.orderNumber}.` },
        { status: 400 }
      );
    }

    // Auto-resolve deviceId from order assignment if omitted
    const targetDeviceId = deviceId || order.orderDevices[0]?.deviceId;
    if (!targetDeviceId) {
      return NextResponse.json(
        { error: "No assigned pocket Wi-Fi device found for this order" },
        { status: 400 }
      );
    }

    // 2. Evaluate Inspection & Deductions
    let deductionFee = 0;
    if (!cableReturned) deductionFee += 50000;
    if (!pouchReturned) deductionFee += 50000;
    if (!chargerReturned) deductionFee += 50000;
    if (unitCondition === "DAMAGED") deductionFee += 350000;

    const allPassed =
      (unitCondition === "GOOD" || unitCondition === "SCRATCHED") &&
      cableReturned &&
      pouchReturned &&
      chargerReturned;

    const depositAmount = order.depositAmount || 500000;
    const refundAmount = Math.max(0, depositAmount - deductionFee);
    const depositRefundStatus = allPassed
      ? "RELEASED"
      : refundAmount > 0
      ? "PARTIAL"
      : "HELD";

    // 3. Trigger n8n Automation Webhook
    const n8nPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      depositAmount,
      deductionFee,
      refundAmount,
      status: depositRefundStatus,
      condition: (allPassed
        ? "PASSED"
        : unitCondition === "DAMAGED"
        ? "DAMAGED"
        : "INCOMPLETE") as "PASSED" | "DAMAGED" | "INCOMPLETE",
      inspectionDetails: {
        unitCondition,
        cableReturned,
        pouchReturned,
        chargerReturned,
        inspectedBy,
        notes,
      },
    };

    const n8nResult = await triggerN8nRefundWebhook(n8nPayload);

    // 4. Update Database in a transaction
    const finalResult = await prisma.$transaction(async (tx) => {
      // Create Inspection record
      const inspection = await tx.inspection.create({
        data: {
          orderId: order.id,
          deviceId: targetDeviceId,
          inspectedBy,
          unitCondition,
          cableReturned,
          pouchReturned,
          chargerReturned,
          allPassed,
          depositRefundStatus,
          refundAmount,
          deductionFee,
          n8nExecutionId: n8nResult.executionId,
          n8nResponseStatus: n8nResult.status,
          notes: notes || n8nResult.message,
        },
      });

      // Update Order status
      await tx.order.update({
        where: { id: order.id },
        data: {
          orderStatus: "COMPLETED",
          ...(returnBoothId ? { returnBoothId } : {}),
        },
      });

      // Update Device status & booth location
      const nextDeviceStatus = unitCondition === "DAMAGED" ? "MAINTENANCE" : "AVAILABLE";
      await tx.device.update({
        where: { id: targetDeviceId },
        data: {
          status: nextDeviceStatus,
          ...(returnBoothId ? { boothId: returnBoothId } : {}),
        },
      });

      return inspection;
    });

    return NextResponse.json({
      success: true,
      inspection: finalResult,
      n8n: n8nResult,
      refundSummary: {
        depositAmount,
        deductionFee,
        refundAmount,
        status: depositRefundStatus,
      },
    });
  } catch (error) {
    console.error("Failed to process return inspection:", error);
    return NextResponse.json(
      { error: "Failed to process return inspection" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const inspections = await prisma.inspection.findMany({
      include: {
        order: true,
        device: true,
      },
      orderBy: { inspectedAt: "desc" },
      take: 25,
    });

    return NextResponse.json({ inspections });
  } catch (error) {
    console.error("Failed to fetch inspection logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspection logs" },
      { status: 500 }
    );
  }
}
