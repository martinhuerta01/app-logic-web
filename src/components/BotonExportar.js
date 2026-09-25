"use client";
import { useState } from "react";
import { BtnPrimary } from "@/components/Modal";

// Botón de exportar de cada pantalla: ejecuta la descarga y muestra si falló.
export default function BotonExportar({ onExportar, children = "Exportar a Excel" }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const exportar = async () => {
    setError("");
    setCargando(true);
    try {
      await onExportar();
    } catch (e) {
      setError(String(e?.message || "No se pudo generar el archivo").slice(0, 120));
    } finally {
      setCargando(false);
    }
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <BtnPrimary onClick={exportar} loading={cargando}>{children}</BtnPrimary>
      {error && <span style={{ fontSize: 12, color: "#dc2626" }}>{error}</span>}
    </span>
  );
}
