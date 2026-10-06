"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StockNuevoPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/stock-nuevo/dashboard");
  }, [router]);
  return null;
}
