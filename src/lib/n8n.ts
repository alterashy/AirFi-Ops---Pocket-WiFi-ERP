
export interface RefundWebhookPayload {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  depositAmount: number;
  deductionFee?: number;
  refundAmount?: number;
  status?: "RELEASED" | "HELD" | "PARTIAL" | string;
  condition: "PASSED" | "DAMAGED" | "INCOMPLETE";
  inspectionDetails: {
    unitCondition: string;
    cableReturned: boolean;
    pouchReturned: boolean;
    chargerReturned: boolean;
    inspectedBy: string;
    notes?: string;
  };
}

export interface RefundWebhookResponse {
  success: boolean;
  orderId: string;
  status: "RELEASED" | "HELD" | "PARTIAL";
  refundAmount: number;
  deductionFee: number;
  executionId: string;
  isMock: boolean;
  message: string;
  processedAt: string;
}

export async function triggerN8nRefundWebhook(
  payload: RefundWebhookPayload
): Promise<RefundWebhookResponse> {
  const webhookUrl =
    process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook/airfi-refund";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        orderId: data.orderId || payload.orderId,
        status: data.status || "RELEASED",
        refundAmount: data.refundAmount ?? payload.depositAmount,
        deductionFee: data.deductionFee ?? 0,
        executionId: data.executionId || `n8n-exec-${Date.now()}`,
        isMock: false,
        message: data.message || "n8n workflow executed successfully.",
        processedAt: data.processedAt || new Date().toISOString(),
      };
    }
  } catch (error) {
    console.warn("n8n webhook connection failed or timed out. Falling back to local automation logic:", error);
  }

  const deductionFee = payload.deductionFee !== undefined
    ? payload.deductionFee
    : payload.condition === "PASSED"
    ? 0
    : payload.condition === "INCOMPLETE"
    ? Math.min(payload.depositAmount, 150000)
    : payload.depositAmount;

  const refundAmount = payload.refundAmount !== undefined
    ? payload.refundAmount
    : Math.max(0, payload.depositAmount - deductionFee);

  const status = (payload.status as "RELEASED" | "HELD" | "PARTIAL") ||
    (deductionFee === 0 ? "RELEASED" : refundAmount > 0 ? "PARTIAL" : "HELD");

  return {
    success: true,
    orderId: payload.orderId,
    status,
    refundAmount,
    deductionFee,
    executionId: `n8n-sim-${Math.random().toString(36).substring(2, 9)}`,
    isMock: true,
    message: status === "RELEASED"
      ? `Security deposit refund of Rp ${refundAmount.toLocaleString("id-ID")} processed automatically to customer account.`
      : status === "PARTIAL"
      ? `Inspection completed with deductions of Rp ${deductionFee.toLocaleString("id-ID")}. Partial refund of Rp ${refundAmount.toLocaleString("id-ID")} released.`
      : `Unit damaged or incomplete. Full deposit held pending physical repair review.`,
    processedAt: new Date().toISOString(),
  };
}
