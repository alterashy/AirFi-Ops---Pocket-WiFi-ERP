"use client";

import { Button } from "@/components/ui/button";

interface HeaderProps {
  loading: boolean;
  onRefresh: () => void;
  onOpenBookingModal: () => void;
}

export function Header({ loading, onRefresh, onOpenBookingModal }: HeaderProps) {
  return (
    <header className="bg-card text-card-foreground border border-border px-6 py-5 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          AirFi Operations Desk
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Airport pocket Wi-Fi dispatch and deposit refund settlement.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Syncing..." : "Refresh"}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onOpenBookingModal}
        >
          New Booking
        </Button>
      </div>
    </header>
  );
}
