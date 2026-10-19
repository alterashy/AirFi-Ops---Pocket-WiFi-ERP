"use client";

import { useState } from "react";
import { Booth, Country, SnapPaymentResult } from "@/types/erp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booths: Booth[];
  countries: Country[];
  onBookingSuccess: () => void;
}

export function BookingModal({
  isOpen,
  onClose,
  booths,
  countries,
  onBookingSuccess,
}: BookingModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(
    countries.length > 0 ? countries[0] : null
  );
  const [startDate, setStartDate] = useState("2026-10-18");
  const [endDate, setEndDate] = useState("2026-10-23");
  const [boothId, setBoothId] = useState(booths.length > 0 ? booths[0].id : "");
  const [submitting, setSubmitting] = useState(false);
  const [snapResult, setSnapResult] = useState<SnapPaymentResult | null>(null);

  // Active country fallback
  const activeCountry = selectedCountry || (countries.length > 0 ? countries[0] : null);
  const activeBoothId = boothId || (booths.length > 0 ? booths[0].id : "");

  // Duration & Price calculations
  const startTimestamp = new Date(startDate).getTime();
  const endTimestamp = new Date(endDate).getTime();
  const daysDiff = Math.max(1, Math.ceil((endTimestamp - startTimestamp) / (1000 * 60 * 60 * 24)));
  const currentDailyRate = activeCountry?.dailyRate || 75000;
  const currentRentalSubtotal = daysDiff * currentDailyRate;
  const standardDeposit = 500000;
  const grandTotal = currentRentalSubtotal + standardDeposit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!customerName || !customerEmail || !activeCountry || !activeBoothId) {
      alert("Please fill in all booking fields");
      return;
    }

    if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
      alert("Return date must be strictly after departure date.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create order
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          destinationCountry: activeCountry.name,
          countryCode: activeCountry.code,
          startDate,
          endDate,
          dailyRate: activeCountry.dailyRate,
          pickupBoothId: activeBoothId,
          returnBoothId: activeBoothId,
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || "Failed to create order");
      }

      // 2. Generate Midtrans Snap payment token
      const snapRes = await fetch("/api/payment/snap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.order.orderNumber,
          grossAmount: orderData.order.grandTotal,
          customerName,
          customerEmail,
          customerPhone,
        }),
      });

      const snapData = await snapRes.json();
      const resultObj = {
        token: snapData.token,
        redirectUrl: snapData.redirectUrl,
        isMock: snapData.isMock,
        orderNumber: orderData.order.orderNumber,
      };
      setSnapResult(resultObj);
      onBookingSuccess();
      if (!snapData.isMock && !snapData.token.startsWith("SNAP-SB-")) {
        openSnapPopup(snapData.token, orderData.order.orderNumber, snapData.redirectUrl);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Booking failed";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmPayment = async (orderNum: string) => {
    try {
      const res = await fetch("/api/payment/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderNum, action: "CONFIRM" }),
      });
      if (res.ok) {
        onBookingSuccess();
        return true;
      }
    } catch (err) {
      console.error("Error confirming payment:", err);
    }
    return false;
  };

  const openSnapPopup = (token: string, orderNum?: string, redirectUrl?: string) => {
    if (token.startsWith("SNAP-SB-")) {
      alert("Mock token detected. Please use 'Simulate Payment Success' button below.");
      return;
    }

    const snap = (
      typeof window !== "undefined"
        ? (window as unknown as { snap?: { pay: (t: string, opts: unknown) => void } }).snap
        : null
    );

    if (snap && typeof snap.pay === "function") {
      snap.pay(token, {
        onSuccess: async () => {
          if (orderNum) await confirmPayment(orderNum);
          alert("Payment successful! Booking is now active.");
          handleClose();
        },
        onPending: () => {
          onBookingSuccess();
          alert("Payment is pending. You can complete it anytime.");
        },
        onError: () => {
          alert("Payment failed or cancelled in Midtrans Snap.");
        },
        onClose: () => {
          console.log("Customer closed the Midtrans Snap popup.");
        },
      });
    } else if (redirectUrl) {
      window.open(redirectUrl, "_blank");
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setStartDate("2026-10-18");
    setEndDate("2026-10-23");
    if (countries.length > 0) setSelectedCountry(countries[0]);
    if (booths.length > 0) setBoothId(booths[0].id);
    setSnapResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg rounded-lg p-6 bg-card text-card-foreground border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
            New Rental Booking
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Register overseas traveler and initiate Midtrans payment.
          </DialogDescription>
        </DialogHeader>

        {!snapResult ? (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs pt-1">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Customer Name</label>
              <Input
                type="text"
                required
                disabled={submitting}
                placeholder="Full name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Email</label>
                <Input
                  type="email"
                  required
                  disabled={submitting}
                  placeholder="name@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Phone</label>
                <Input
                  type="text"
                  disabled={submitting}
                  placeholder="08123456789"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Destination
              </label>
              <select
                value={activeCountry?.code || ""}
                disabled={submitting}
                onChange={(e) => {
                  const found = countries.find((c) => c.code === e.target.value);
                  if (found) setSelectedCountry(found);
                }}
                className="w-full text-xs border border-input rounded p-2 bg-background text-foreground outline-none focus:border-ring disabled:opacity-50"
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.region}) - Rp {c.dailyRate.toLocaleString("id-ID")}/day
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Departure</label>
                <Input
                  type="date"
                  disabled={submitting}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Return</label>
                <Input
                  type="date"
                  disabled={submitting}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Pickup Booth</label>
              <select
                value={activeBoothId}
                disabled={submitting}
                onChange={(e) => setBoothId(e.target.value)}
                className="w-full text-xs border border-input rounded p-2 bg-background text-foreground outline-none focus:border-ring disabled:opacity-50"
              >
                {booths.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name} ({b.availableDevices} available)
                  </option>
                ))}
              </select>
            </div>

            {/* Fee Preview */}
            <div className="bg-muted/30 border border-border p-3 rounded text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Rental ({daysDiff} days x Rp {currentDailyRate.toLocaleString("id-ID")}):</span>
                <span>Rp {currentRentalSubtotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Refundable Deposit:</span>
                <span>Rp {standardDeposit.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1">
                <span>Total Payment:</span>
                <span>Rp {grandTotal.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Pay via Midtrans"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3.5 text-xs pt-1">
            <div className="border border-amber-300 bg-amber-500/10 p-4 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Order {snapResult.orderNumber} Created
                </span>
                <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded">
                  UNPAID (PENDING)
                </span>
              </div>

              <p className="text-[11px] text-muted-foreground">
                If you close this dialog before paying, this order remains saved as <strong>Unpaid (Pending)</strong> in the Rental Bookings desk and can be completed anytime.
              </p>

              <div className="bg-background p-2.5 rounded border border-border font-mono text-[11px] break-all">
                <span className="text-muted-foreground block text-[10px]">SNAP TOKEN:</span>
                <span>{snapResult.token}</span>
              </div>

              <div className="pt-1 flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={() => openSnapPopup(snapResult.token, snapResult.orderNumber, snapResult.redirectUrl)}
                  className="w-full text-xs"
                >
                  Open Midtrans Payment Popup
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await confirmPayment(snapResult.orderNumber);
                    alert(`Order ${snapResult.orderNumber} payment confirmed! Order is now ACTIVE.`);
                    handleClose();
                  }}
                  className="w-full text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                >
                  ✓ Simulate Payment Success (Testing/Sandbox)
                </Button>

                {snapResult.redirectUrl && (
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <a
                      href={snapResult.redirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 border border-border bg-background rounded text-[11px] hover:bg-muted/50"
                    >
                      Checkout Page
                    </a>
                    <a
                      href="https://simulator.sandbox.midtrans.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 border border-border bg-background rounded text-[11px] hover:bg-muted/50"
                    >
                      VA Simulator
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-[11px] text-muted-foreground">
                Can be resumed anytime via the Rental Bookings desk.
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleClose}
              >
                Close Dialog
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
