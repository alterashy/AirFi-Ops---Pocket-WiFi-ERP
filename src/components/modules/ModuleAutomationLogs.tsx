"use client";

import { Inspection } from "@/types/erp";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


interface ModuleAutomationLogsProps {
  inspections: Inspection[];
}

export function ModuleAutomationLogs({ inspections }: ModuleAutomationLogsProps) {
  return (
    <Card className="rounded-b-lg rounded-t-none border-t-0 p-6 space-y-5 bg-card">
      <div className="border-b border-border pb-4">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Audit & Settlement Logs
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          History of hardware inspections, deductions, and deposit refunds.
        </p>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-background">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs font-medium text-muted-foreground">Date</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Order ID</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Inspector</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Condition</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Deduction</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Refund</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Execution ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inspections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-8 text-center text-muted-foreground text-xs">
                  No inspection logs recorded.
                </TableCell>
              </TableRow>
            ) : (
              inspections.map((i) => (
                <TableRow key={i.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(i.inspectedAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono font-medium text-foreground text-xs">
                    {i.order?.orderNumber || "ORD-N/A"}
                  </TableCell>
                  <TableCell className="text-foreground text-xs">{i.inspectedBy}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium ${
                        i.unitCondition === "GOOD"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : i.unitCondition === "SCRATCHED"
                          ? "text-amber-800 dark:text-amber-300"
                          : "text-destructive dark:text-red-400"
                      }`}
                    >
                      {i.unitCondition}
                    </span>
                  </TableCell>
                  <TableCell className="text-destructive dark:text-red-400 text-xs">
                    {i.deductionFee ? `Rp ${i.deductionFee.toLocaleString("id-ID")}` : "-"}
                  </TableCell>
                  <TableCell className="text-emerald-700 dark:text-emerald-400 font-medium text-xs">
                    Rp {i.refundAmount?.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        i.depositRefundStatus === "RELEASED"
                          ? "default"
                          : i.depositRefundStatus === "HELD"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-[10px] font-medium"
                    >
                      {i.depositRefundStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {i.n8nExecutionId || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
