"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { StatsBar } from "@/components/StatsBar";
import { NavTabs } from "@/components/NavTabs";
import { BookingModal } from "@/components/modals/BookingModal";
import { ModuleReturnDesk } from "@/components/modules/ModuleReturnDesk";
import { ModuleBookingDesk } from "@/components/modules/ModuleBookingDesk";
import { ModuleFleetTracking } from "@/components/modules/ModuleFleetTracking";
import { ModuleAutomationLogs } from "@/components/modules/ModuleAutomationLogs";
import {
  ActiveTabType,
  Booth,
  Country,
  Device,
  Inspection,
  Order,
  Stats,
} from "@/types/erp";

export default function AirFiDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTabType>("return");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<Stats | null>(null);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);

  const [showBookingModal, setShowBookingModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, boothsRes, countriesRes, devicesRes, ordersRes, inspectRes] =
        await Promise.all([
          fetch("/api/stats").then((r) => r.json()),
          fetch("/api/booths").then((r) => r.json()),
          fetch("/api/countries").then((r) => r.json()),
          fetch("/api/devices").then((r) => r.json()),
          fetch("/api/orders").then((r) => r.json()),
          fetch("/api/inspection").then((r) => r.json()),
        ]);

      setStats(statsRes);
      setBooths(boothsRes.booths || []);
      setCountries(countriesRes.countries || []);
      setDevices(devicesRes.devices || []);
      setOrders(ordersRes.orders || []);
      setInspections(inspectRes.inspections || []);
    } catch (err: unknown) {
      console.error("Error loading AirFi Ops dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initialFetch() {
      try {
        const [statsRes, boothsRes, countriesRes, devicesRes, ordersRes, inspectRes] =
          await Promise.all([
            fetch("/api/stats").then((r) => r.json()),
            fetch("/api/booths").then((r) => r.json()),
            fetch("/api/countries").then((r) => r.json()),
            fetch("/api/devices").then((r) => r.json()),
            fetch("/api/orders").then((r) => r.json()),
            fetch("/api/inspection").then((r) => r.json()),
          ]);

        if (active) {
          setStats(statsRes);
          setBooths(boothsRes.booths || []);
          setCountries(countriesRes.countries || []);
          setDevices(devicesRes.devices || []);
          setOrders(ordersRes.orders || []);
          setInspections(inspectRes.inspections || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        console.error("Error in initial dashboard load:", err);
        if (active) setLoading(false);
      }
    }

    initialFetch();
    return () => {
      active = false;
    };
  }, []);

  // Real-time background sync for pending Midtrans payments
  useEffect(() => {
    const hasPending = orders.some((o) => o.paymentStatus === "PENDING");
    if (!hasPending) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch("/api/payment/sync");
        if (res.ok) {
          const data = await res.json();
          if (data.updated > 0) {
            loadData();
          }
        }
      } catch {
        // Silent fail
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [orders, loadData]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <Header
        loading={loading}
        onRefresh={loadData}
        onOpenBookingModal={() => setShowBookingModal(true)}
      />

      <StatsBar stats={stats} />

      <NavTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "return" && (
        <ModuleReturnDesk
          orders={orders}
          booths={booths}
          onInspectionSuccess={loadData}
        />
      )}

      {activeTab === "booking" && (
        <ModuleBookingDesk
          orders={orders}
          onOpenBookingModal={() => setShowBookingModal(true)}
          onOrderUpdate={loadData}
        />
      )}

      {activeTab === "fleet" && (
        <ModuleFleetTracking
          devices={devices}
          booths={booths}
          onDeviceUpdate={loadData}
        />
      )}

      {activeTab === "logs" && (
        <ModuleAutomationLogs inspections={inspections} />
      )}

      <BookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        booths={booths}
        countries={countries}
        onBookingSuccess={loadData}
      />
    </div>
  );
}
