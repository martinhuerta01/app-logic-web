"use client";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";

const PING_INTERVAL = 12 * 60 * 1000; // 12 minutos

function useKeepAlive() {
  useEffect(() => {
    // Cualquier request despierta el servidor; /health es ideal si existe
    const ping = () => api.get("/health").catch(() => {});
    ping(); // ping inmediato al montar
    const id = setInterval(ping, PING_INTERVAL);
    return () => clearInterval(id);
  }, []);
}

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  useKeepAlive();

  if (loading) return null;
  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/";
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto" style={{ background: "var(--color-surface-page, #f0f2f5)" }}>
        {children}
      </main>
    </div>
  );
}
