const TIPOS = {
  ENTRADA:       { label: "Entrada",       bg: "#f0fdf4", color: "#16a34a" },
  COMPRA:        { label: "Compra",        bg: "#f0fdf4", color: "#16a34a" },
  TRANSFERENCIA: { label: "Transferencia", bg: "#eff6ff", color: "#2563eb" },
  SALIDA:        { label: "Salida",        bg: "#fef2f2", color: "#dc2626" },
  INSTALACION:   { label: "Consumo",       bg: "#fff7ed", color: "#ea580c" },
  RETIRO:        { label: "Retiro",        bg: "#fef2f2", color: "#dc2626" },
  RESULTADO_CONTROL: { label: "Control",    bg: "#ecfeff", color: "#0e7490" },
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

// Configuración con la que trabaja un equipo instalado
export const CONFIGURACIONES = ["CHASIS", "SEMI", "TRACTOR", "RFID", "BASICO"];

// Estados de un equipo identificado por número de serie
export const ESTADOS_EQUIPO = {
  EN_STOCK:           { label: "En stock",                             bg: "#eff6ff", color: "#2563eb" },
  INSTALADO:          { label: "Instalado",                            bg: "#f0fdf4", color: "#16a34a" },
  RETIRADO_PENDIENTE: { label: "Retirado sin controlar",               bg: "#fff7ed", color: "#ea580c" },
  USADO_OK_CAMPO:     { label: "Reutilizable (controlado en campo)",   bg: "#ecfeff", color: "#0e7490" },
  USADO_OK_OFICINA:   { label: "Reutilizable (controlado en oficina)", bg: "#ecfeff", color: "#0e7490" },
  FALLA_RMA:          { label: "Con falla (garantía)",                 bg: "#fef2f2", color: "#dc2626" },
  BAJA:               { label: "Dado de baja",                         bg: "#f1f5f9", color: "#64748b" },
};

// Vistas del Dashboard de Stock. La clave también identifica el ámbito de cada stock mínimo.
export const VISTAS_STOCK = [
  { key: "oficina",    label: "Oficina" },
  { key: "serenisima", label: "La Serenísima" },
  { key: "camioneta1", label: "Camioneta 1" },
  { key: "camioneta2", label: "Camioneta 2" },
];

