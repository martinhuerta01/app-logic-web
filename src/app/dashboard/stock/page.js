"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StockPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/stock/overview");
  }, [router]);
  return null;
}
