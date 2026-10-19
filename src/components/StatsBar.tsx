"use client";

import { Stats } from "@/types/erp";
import { Card, CardContent } from "@/components/ui/card";

interface StatsBarProps {
  stats: Stats | null;
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="text-xs text-muted-foreground font-medium">Total Fleet</div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {stats?.fleet.total ?? "-"}{" "}
            <span className="text-xs font-normal text-muted-foreground">units</span>
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            {stats?.fleet.available ?? "-"} available
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="text-xs text-muted-foreground font-medium">Active Rentals</div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {stats?.orders.active ?? "-"}{" "}
            <span className="text-xs font-normal text-muted-foreground">orders</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {stats?.fleet.inUse ?? "-"} units in use
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="text-xs text-muted-foreground font-medium">Maintenance</div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {stats?.fleet.maintenance ?? "-"}{" "}
            <span className="text-xs font-normal text-muted-foreground">units</span>
          </div>
          <div className="text-xs text-muted-foreground">Needs repair or inspection</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="text-xs text-muted-foreground font-medium">Refunds Settled</div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            Rp {(stats?.refunds.totalDispatched || 0).toLocaleString("id-ID")}
          </div>
          <div className="text-xs text-muted-foreground">
            {stats?.refunds.totalInspected ?? 0} deposits processed
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
