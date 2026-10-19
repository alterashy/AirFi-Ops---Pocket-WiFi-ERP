"use client";

import { useState } from "react";
import { Booth, Device } from "@/types/erp";
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


interface ModuleFleetTrackingProps {
  devices: Device[];
  booths: Booth[];
  onDeviceUpdate: () => void;
}

export function ModuleFleetTracking({
  devices,
  booths,
  onDeviceUpdate,
}: ModuleFleetTrackingProps) {
  const [selectedBoothFilter, setSelectedBoothFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredDevices = devices.filter((d) => {
    if (selectedBoothFilter !== "ALL" && d.boothId !== selectedBoothFilter) return false;
    if (selectedStatusFilter !== "ALL" && d.status !== selectedStatusFilter) return false;
    return true;
  });

  const handleToggleMaintenance = async (device: Device) => {
    if (updatingId) return;
    setUpdatingId(device.id);
    const nextStatus = device.status === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE";
    try {
      await fetch("/api/devices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: device.id, status: nextStatus }),
      });
      onDeviceUpdate();
    } catch {
      alert("Failed to update device status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Card className="rounded-b-lg rounded-t-none border-t-0 p-6 space-y-5 bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Fleet Inventory
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hardware serials, booth locations, and status.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={selectedBoothFilter}
            onChange={(e) => setSelectedBoothFilter(e.target.value)}
            className="text-xs border border-input rounded p-1.5 bg-background text-foreground outline-none focus:border-ring"
          >
            <option value="ALL">All Booths</option>
            {booths.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} ({b.name})
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="text-xs border border-input rounded p-1.5 bg-background text-foreground outline-none focus:border-ring"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="IN_USE">In Use</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-background">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-32 text-xs font-medium text-muted-foreground">Serial</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">IMEI</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Model</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Booth</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDevices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-8 text-center text-muted-foreground text-xs">
                  No devices match the selected filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredDevices.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-mono font-medium text-foreground text-xs">
                    {d.serialNumber}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs">{d.imei}</TableCell>
                  <TableCell className="text-foreground text-xs">{d.model}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-foreground">
                      {d.booth?.code || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        d.status === "AVAILABLE"
                          ? "default"
                          : d.status === "IN_USE"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-[10px] font-medium"
                    >
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleToggleMaintenance(d)}
                      disabled={d.status === "IN_USE" || updatingId !== null}
                    >
                      {updatingId === d.id
                        ? "Saving..."
                        : d.status === "MAINTENANCE"
                        ? "Set Available"
                        : "Maintenance"}
                    </Button>
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
