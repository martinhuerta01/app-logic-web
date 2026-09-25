"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Exportar dejó de ser un módulo: cada pantalla tiene su botón que descarga lo que se está viendo
// (Historial, Estadísticas, Stock Oficina y Tickets). Los informes viven en src/lib/exportaciones.js.
export default function ExportarRedirige() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard"); }, [router]);
  return null;
}
