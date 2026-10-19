"use client";

import { ActiveTabType } from "@/types/erp";
import { cn } from "@/lib/utils";

interface NavTabsProps {
  activeTab: ActiveTabType;
  onTabChange: (tab: ActiveTabType) => void;
}

export function NavTabs({ activeTab, onTabChange }: NavTabsProps) {
  const tabs: { id: ActiveTabType; label: string }[] = [
    { id: "return", label: "Fast Return" },
    { id: "booking", label: "Bookings" },
    { id: "fleet", label: "Fleet Inventory" },
    { id: "logs", label: "Audit Logs" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 w-full border border-b border-border bg-card rounded-t-lg text-xs overflow-hidden">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "w-full py-3 px-4 border-b-2 font-medium transition-colors text-center outline-none whitespace-nowrap",
              isActive
                ? "border-primary text-foreground font-semibold bg-muted/30"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/15"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
