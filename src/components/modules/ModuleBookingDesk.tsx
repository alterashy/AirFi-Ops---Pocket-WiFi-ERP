"use client";

import { useState } from "react";
import { Order } from "@/types/erp";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ModuleBookingDeskProps {
  orders: Order[];
  onOpenBookingModal: () => void;
  onOrderUpdate?: () => void;
}

export function ModuleBookingDesk({
  orders,
  onOpenBookingModal,
  onOrderUpdate,
}: ModuleBookingDeskProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleConfirmPayment = async (orderNumber: string) => {
    if (processingId) return;
    setProcessingId(orderNumber);
    try {
      const res = await fetch("/api/payment/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, action: "CONFIRM" }),
      });
      if (!res.ok) throw new Error("Failed to confirm payment");
      alert(`Payment for ${orderNumber} confirmed! Order is now ACTIVE.`);
      onOrderUpdate?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to confirm payment";
      alert(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelOrder = async (orderNumber: string) => {
    if (processingId) return;
    if (!confirm(`Cancel booking ${orderNumber}? Device will be returned to AVAILABLE status.`)) {
      return;
    }
    setProcessingId(orderNumber);
    try {
      const res = await fetch("/api/payment/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, action: "CANCEL" }),
      });
      if (!res.ok) throw new Error("Failed to cancel order");
      alert(`Booking ${orderNumber} successfully cancelled.`);
      onOrderUpdate?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel order";
      alert(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handlePayNow = async (order: Order) => {
    if (processingId) return;
    setProcessingId(order.orderNumber);

    try {
      let snapToken = order.midtransSnapToken;

      // If no token was saved, generate one now
      if (!snapToken) {
        const snapRes = await fetch("/api/payment/snap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.orderNumber,
            grossAmount: order.grandTotal,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
          }),
        });
        const snapData = await snapRes.json();
        snapToken = snapData.token;
      }

      if (!snapToken) {
        throw new Error("Failed to retrieve Midtrans Snap Token");
      }

      if (snapToken.startsWith("SNAP-SB-")) {
        await handleConfirmPayment(order.orderNumber);
        return;
      }

      const snap = (
        typeof window !== "undefined"
          ? (window as unknown as { snap?: { pay: (t: string, opts: unknown) => void } }).snap
          : null
      );

      if (snap && typeof snap.pay === "function") {
        snap.pay(snapToken, {
          onSuccess: async () => {
            await handleConfirmPayment(order.orderNumber);
          },
          onPending: () => {
            alert("Payment status is pending.");
            onOrderUpdate?.();
          },
          onError: () => {
            alert("Payment failed or denied in Midtrans.");
          },
          onClose: () => {
            console.log("Snap popup closed without payment");
          },
        });
      } else {
        // Fallback simulate direct confirmation
        await handleConfirmPayment(order.orderNumber);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate Midtrans payment";
      alert(msg);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card className="rounded-b-lg rounded-t-none border-t-0 p-6 space-y-5 bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Rental Bookings
            </h2>
            {orders.some((o) => o.paymentStatus === "PENDING") && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-300/40 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Live Midtrans Syncing
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active reservations, payment states, destination rates, and assigned hardware.
          </p>
        </div>
        <Button
          onClick={onOpenBookingModal}
          size="sm"
        >
          New Booking
        </Button>
      </div>

      {/* Orders Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-background">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-28 text-xs font-medium text-muted-foreground">Order ID</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Customer</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Destination</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Dates</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Pickup Booth</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Total</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Payment Status</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Order Status</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Modem IMEI</TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="p-8 text-center text-muted-foreground text-xs">
                  No rental bookings recorded.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => {
                const isPending = o.paymentStatus === "PENDING";
                const isPaid = o.paymentStatus === "PAID";
                const isCancelled = o.paymentStatus === "CANCELLED" || o.orderStatus === "CANCELLED";

                return (
                  <TableRow key={o.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono font-medium text-foreground text-xs">
                      {o.orderNumber}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground text-xs">{o.customerName}</div>
                      <div className="text-muted-foreground text-[11px] font-mono">{o.customerEmail}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-foreground">{o.destinationCountry}</span>
                      <span className="text-[11px] text-muted-foreground block">
                        Rp {o.dailyRate?.toLocaleString("id-ID")}/day ({o.rentalDays}d)
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(o.startDate).toLocaleDateString()} - {new Date(o.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-foreground">
                        {o.pickupBooth?.code || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground text-xs">
                        Rp {o.grandTotal.toLocaleString("id-ID")}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Deposit: Rp {o.depositAmount.toLocaleString("id-ID")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isPaid ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 font-medium"
                        >
                          PAID
                        </Badge>
                      ) : isCancelled ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-destructive/10 text-destructive border-destructive/20 font-medium"
                        >
                          CANCELLED
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 font-medium"
                        >
                          UNPAID
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={o.orderStatus === "ACTIVE" ? "default" : "secondary"}
                        className="text-[10px] font-medium"
                      >
                        {o.orderStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {o.orderDevices?.[0]?.device?.imei || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <Button
                            size="xs"
                            variant="default"
                            disabled={processingId === o.orderNumber}
                            onClick={() => handlePayNow(o)}
                            className="text-[11px]"
                          >
                            Pay Now
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={processingId === o.orderNumber}
                            onClick={() => handleConfirmPayment(o.orderNumber)}
                            className="text-[10px] border-emerald-400 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            title="Simulate instant payment for testing"
                          >
                            Simulate
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={processingId === o.orderNumber}
                            onClick={() => handleCancelOrder(o.orderNumber)}
                            className="text-[10px] text-muted-foreground hover:text-destructive"
                            title="Cancel booking and free device"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
