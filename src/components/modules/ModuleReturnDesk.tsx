"use client";

import { useState } from "react";
import { Booth, InspectionSuccessResult, Order } from "@/types/erp";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface ModuleReturnDeskProps {
  orders: Order[];
  booths: Booth[];
  onInspectionSuccess: () => void;
}

export function ModuleReturnDesk({
  orders,
  booths,
  onInspectionSuccess,
}: ModuleReturnDeskProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [returnBoothId, setReturnBoothId] = useState<string>(booths[0]?.id || "");
  const [unitCondition, setUnitCondition] = useState<"GOOD" | "SCRATCHED" | "DAMAGED">("GOOD");
  const [cableReturned, setCableReturned] = useState(true);
  const [pouchReturned, setPouchReturned] = useState(true);
  const [chargerReturned, setChargerReturned] = useState(true);
  const [staffName, setStaffName] = useState("Staff CGK-T3 (Budi S.)");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<InspectionSuccessResult | null>(null);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const activeDeposit = selectedOrder?.depositAmount || 500000;

  // Real-time calculation preview
  let returnDeduction = 0;
  if (!cableReturned) returnDeduction += 50000;
  if (!pouchReturned) returnDeduction += 50000;
  if (!chargerReturned) returnDeduction += 50000;
  if (unitCondition === "DAMAGED") returnDeduction += 350000;
  const previewRefundAmount = Math.max(0, activeDeposit - returnDeduction);

  const resetForm = () => {
    setSelectedOrderId("");
    setUnitCondition("GOOD");
    setCableReturned(true);
    setPouchReturned(true);
    setChargerReturned(true);
    setInspectionNotes("");
  };

  const handleProcessReturn = async () => {
    if (!selectedOrder || inspecting) {
      if (!selectedOrder) alert("Please select an active order to return");
      return;
    }

    const device = selectedOrder.orderDevices?.[0]?.device;
    if (!device) {
      alert("No device associated with this order");
      return;
    }

    setInspecting(true);
    setInspectionResult(null);

    try {
      const res = await fetch("/api/inspection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          deviceId: device.id,
          returnBoothId: returnBoothId || selectedOrder.returnBoothId,
          inspectedBy: staffName,
          unitCondition,
          cableReturned,
          pouchReturned,
          chargerReturned,
          notes: inspectionNotes,
        }),
      });

      const data: InspectionSuccessResult = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error?: string }).error || "Inspection failed");

      setInspectionResult(data);
      resetForm();
      onInspectionSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process return";
      alert(msg);
    } finally {
      setInspecting(false);
    }
  };

  return (
    <Card className="rounded-b-lg rounded-t-none border-t-0 p-6 space-y-5 bg-card">
      <div className="border-b border-border pb-4">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Fast Return & Deposit Settlement
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Inspect device condition and release customer security deposit.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Step 1: Select Active Order */}
        <div className="p-4 space-y-3.5 bg-muted/20 border border-border rounded-lg">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
            1. Select Active Order
          </h3>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Active Rental
            </label>
            <select
              value={selectedOrderId}
              disabled={inspecting}
              onChange={(e) => {
                setSelectedOrderId(e.target.value);
                setInspectionResult(null);
              }}
              className="w-full text-xs border border-input rounded-md p-2 bg-background text-foreground outline-none focus:border-ring disabled:opacity-50"
            >
              <option value="">Select order...</option>
              {orders
                .filter((o) => o.orderStatus === "ACTIVE" && o.paymentStatus === "PAID")
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} - {o.customerName} ({o.destinationCountry}) - IMEI:{" "}
                    {o.orderDevices?.[0]?.device?.imei || "Assigned"}
                  </option>
                ))}
            </select>
          </div>

          {selectedOrder ? (
            <div className="bg-background p-3 rounded-md border border-border text-xs space-y-1.5 text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium">{selectedOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-mono text-[11px]">{selectedOrder.customerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destination:</span>
                <span>{selectedOrder.destinationCountry} ({selectedOrder.rentalDays}d)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modem IMEI:</span>
                <span className="font-mono text-[11px]">
                  {selectedOrder.orderDevices?.[0]?.device?.imei || "-"}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 font-medium">
                <span className="text-muted-foreground">Held Deposit:</span>
                <span className="font-semibold text-foreground">
                  Rp {selectedOrder.depositAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground p-3 text-center border border-dashed border-border rounded-md bg-background">
              Select an active order above to begin inspection.
            </div>
          )}

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Return Booth
            </label>
            <select
              value={returnBoothId}
              disabled={inspecting}
              onChange={(e) => setReturnBoothId(e.target.value)}
              className="w-full text-xs border border-input rounded-md p-2 bg-background text-foreground outline-none focus:border-ring disabled:opacity-50"
            >
              {booths.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name} ({b.terminal})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Inspector Staff
            </label>
            <Input
              type="text"
              disabled={inspecting}
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
            />
          </div>
        </div>

        {/* Step 2: Digital Inspection Checklist */}
        <div className="p-4 space-y-3.5 bg-muted/20 border border-border rounded-lg">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
            2. Inspection Checklist
          </h3>

          {/* Physical Condition */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Unit Condition
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["GOOD", "SCRATCHED", "DAMAGED"] as const).map((cond) => {
                const isSelected = unitCondition === cond;
                return (
                  <Button
                    key={cond}
                    type="button"
                    disabled={inspecting}
                    variant={isSelected ? (cond === "DAMAGED" ? "destructive" : "default") : "outline"}
                    size="sm"
                    onClick={() => setUnitCondition(cond)}
                    className="w-full text-xs"
                  >
                    {cond === "GOOD" ? "Good" : cond === "SCRATCHED" ? "Scratched" : "Damaged"}
                  </Button>
                );
              })}
            </div>
            {unitCondition === "DAMAGED" && (
              <p className="text-[11px] text-destructive mt-1">
                Damage penalty: Rp 350.000 deduction.
              </p>
            )}
          </div>

          {/* Accessories verification */}
          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground">
              Accessories
            </label>
            
            <label className="flex items-center justify-between text-xs bg-background p-2 rounded-md border border-border cursor-pointer">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={cableReturned}
                  disabled={inspecting}
                  onCheckedChange={(checked) => setCableReturned(Boolean(checked))}
                />
                <span>USB-C Cable</span>
              </div>
              {!cableReturned && (
                <span className="text-destructive font-medium text-[11px]">-Rp 50.000</span>
              )}
            </label>

            <label className="flex items-center justify-between text-xs bg-background p-2 rounded-md border border-border cursor-pointer">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={pouchReturned}
                  disabled={inspecting}
                  onCheckedChange={(checked) => setPouchReturned(Boolean(checked))}
                />
                <span>Travel Pouch</span>
              </div>
              {!pouchReturned && (
                <span className="text-destructive font-medium text-[11px]">-Rp 50.000</span>
              )}
            </label>

            <label className="flex items-center justify-between text-xs bg-background p-2 rounded-md border border-border cursor-pointer">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={chargerReturned}
                  disabled={inspecting}
                  onCheckedChange={(checked) => setChargerReturned(Boolean(checked))}
                />
                <span>Wall Adapter</span>
              </div>
              {!chargerReturned && (
                <span className="text-destructive font-medium text-[11px]">-Rp 50.000</span>
              )}
            </label>
          </div>

          {/* Inspection Notes */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Notes
            </label>
            <Input
              type="text"
              disabled={inspecting}
              placeholder="Optional notes"
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
            />
          </div>

          {/* Settlement Preview */}
          <div className="bg-background p-3 rounded-md border border-border text-xs space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Deposit:</span>
              <span>Rp {activeDeposit.toLocaleString("id-ID")}</span>
            </div>
            {returnDeduction > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Deductions:</span>
                <span>-Rp {returnDeduction.toLocaleString("id-ID")}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1">
              <span>Net Refund:</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                Rp {previewRefundAmount.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Submit Return */}
          <Button
            type="button"
            onClick={handleProcessReturn}
            disabled={!selectedOrder || inspecting}
            className="w-full text-xs"
          >
            {inspecting ? "Processing Refund..." : "Process Return"}
          </Button>
        </div>
      </div>

      {/* Live Inspection Result Receipt */}
      {inspectionResult && (
        <div
          className={`border p-4 rounded-lg space-y-2 text-xs ${
            inspectionResult.inspection?.depositRefundStatus === "RELEASED"
              ? "border-emerald-300 dark:border-emerald-800 bg-emerald-500/10 dark:bg-emerald-950/20"
              : inspectionResult.inspection?.depositRefundStatus === "PARTIAL"
              ? "border-amber-300 dark:border-amber-800 bg-amber-500/10 dark:bg-amber-950/20"
              : "border-destructive/30 bg-destructive/10"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`font-semibold ${
                inspectionResult.inspection?.depositRefundStatus === "RELEASED"
                  ? "text-emerald-800 dark:text-emerald-300"
                  : inspectionResult.inspection?.depositRefundStatus === "PARTIAL"
                  ? "text-amber-800 dark:text-amber-300"
                  : "text-destructive"
              }`}
            >
              Return Completed &bull; Deposit {inspectionResult.inspection?.depositRefundStatus}
            </span>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] font-medium ${
                  inspectionResult.inspection?.depositRefundStatus === "RELEASED"
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                    : inspectionResult.inspection?.depositRefundStatus === "PARTIAL"
                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                    : "bg-destructive/15 text-destructive border-destructive/30"
                }`}
              >
                Refund: Rp {(inspectionResult.inspection?.refundAmount || 0).toLocaleString("id-ID")}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setInspectionResult(null)}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Done
              </Button>
            </div>
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
            <span>
              Deduction:{" "}
              <strong className="text-foreground">
                Rp {(inspectionResult.inspection?.deductionFee || 0).toLocaleString("id-ID")}
              </strong>
            </span>
            <span>
              Device:{" "}
              <strong className="text-foreground">
                {inspectionResult.inspection?.unitCondition === "DAMAGED"
                  ? "Sent to Maintenance"
                  : "Restocked (Available)"}
              </strong>
            </span>
            <span>
              Execution ID:{" "}
              <strong className="font-mono text-foreground">
                {inspectionResult.n8n?.executionId}
              </strong>
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
