"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Configuración dejó de ser un módulo: sus secciones se repartieron entre Personal, Stock y Servicios.
export default function ConfiguracionRedirige() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/stock-nuevo/catalogos"); }, [router]);
  return null;
}
