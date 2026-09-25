const TIPOS = {
  ENTRADA:       { label: "Entrada",       bg: "#f0fdf4", color: "#16a34a" },
  COMPRA:        { label: "Compra",        bg: "#f0fdf4", color: "#16a34a" },
  TRANSFERENCIA: { label: "Transferencia", bg: "#eff6ff", color: "#2563eb" },
  SALIDA:        { label: "Salida",        bg: "#fef2f2", color: "#dc2626" },
  INSTALACION:   { label: "Consumo",       bg: "#fff7ed", color: "#ea580c" },
  RETIRO:        { label: "Retiro",        bg: "#fef2f2", color: "#dc2626" },
  AJUSTE:        { label: "Ajuste",        bg: "#f5f3ff", color: "#7c3aed" },
};

export const tipoInfo = (t) =>
  TIPOS[String(t || "").toUpperCase()] || { label: t || "—", bg: "#f1f5f9", color: "#64748b" };

// +1 suma, -1 resta, 0 solo se mueve entre ubicaciones
export function signoMov(m) {
  const t = String(m.tipo || "").toUpperCase();
  if (t === "ENTRADA" || t === "COMPRA") return 1;
  if (t === "SALIDA" || t === "INSTALACION") return -1;
  if (t === "RETIRO") return 0; // no toca stock_actual, actualiza equipos_estado
  if (t === "AJUSTE") return m.destino_id ? 1 : -1;
  return 0;
}

export const fmtFecha = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
