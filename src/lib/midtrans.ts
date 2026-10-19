// Midtrans Snap Payment Gateway Integration Helper
import crypto from "crypto";

export interface CreateSnapTransactionParams {
  orderId: string;
  grossAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  itemDetails?: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}

export interface SnapTransactionResult {
  token: string;
  redirectUrl: string;
  isMock: boolean;
}

export async function createSnapTransaction(
  params: CreateSnapTransactionParams
): Promise<SnapTransactionResult> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-demo-key";
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

  const endpoint = isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const payload = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: Math.round(params.grossAmount),
    },
    customer_details: {
      first_name: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone || "081234567890",
    },
    item_details: params.itemDetails || [
      {
        id: params.orderId,
        price: Math.round(params.grossAmount),
        quantity: 1,
        name: `AirFi Rental & Deposit: ${params.orderId}`,
      },
    ],
    expiry: {
      duration: 20,
      unit: "minutes",
    },
    credit_card: {
      secure: true,
    },
  };

  try {
    if (serverKey && !serverKey.includes("demo-key")) {
      const authHeader = Buffer.from(`${serverKey}:`).toString("base64");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          token: data.token,
          redirectUrl: data.redirect_url,
          isMock: false,
        };
      } else {
        const errText = await response.text();
        console.error(`Midtrans Snap API rejected transaction (${response.status}):`, errText);
      }
    }
  } catch (err) {
    console.warn("Midtrans API call failed or timed out, using sandbox simulation fallback:", err);
  }

  const simulatedToken = `SNAP-SB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  return {
    token: simulatedToken,
    redirectUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${simulatedToken}`,
    isMock: true,
  };
}

export interface MidtransStatusResult {
  statusCode: string;
  transactionStatus: string;
  fraudStatus?: string;
  paymentType?: string;
  grossAmount?: string;
}

export async function checkMidtransStatus(
  orderId: string
): Promise<MidtransStatusResult | null> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-demo-key";
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

  if (!serverKey || serverKey.includes("demo-key")) {
    return null;
  }

  const endpoint = isProduction
    ? `https://api.midtrans.com/v2/${orderId}/status`
    : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

  try {
    const authHeader = Buffer.from(`${serverKey}:`).toString("base64");
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return {
        statusCode: data.status_code,
        transactionStatus: data.transaction_status,
        fraudStatus: data.fraud_status,
        paymentType: data.payment_type,
        grossAmount: data.gross_amount,
      };
    }
  } catch (err) {
    console.warn(`Failed to check Midtrans status for order ${orderId}:`, err);
  }

  return null;
}

export interface VerifySignatureParams {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}

export function verifyMidtransSignature({
  orderId,
  statusCode,
  grossAmount,
  signatureKey,
}: VerifySignatureParams): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-demo-key";

  // Allow simulated/mock webhook callbacks in development when using demo key
  if ((!serverKey || serverKey.includes("demo-key")) && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!orderId || !statusCode || !grossAmount || !signatureKey) {
    return false;
  }

  // Midtrans formula: SHA512(order_id + status_code + gross_amount + ServerKey)
  const expectedInput = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const expectedSignature = crypto
    .createHash("sha512")
    .update(expectedInput)
    .digest("hex");

  try {
    const keyBuf = Buffer.from(signatureKey, "utf-8");
    const expBuf = Buffer.from(expectedSignature, "utf-8");
    if (keyBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, expBuf);
  } catch {
    return signatureKey.toLowerCase() === expectedSignature.toLowerCase();
  }
}

