// Extracción de seriales/IMEI (§7.4 del spec). Se guardan como string, sin
// normalizar — vienen en 3 formatos distintos (8/11/15 dígitos).

export function extraerDispositivo(ticket) {
  return (ticket.dispositivo || "").trim() || null;
}

export function extraerDispoEliminado(descripcion) {
  // También se lee "disp eliminado" y "dispo eliminada" (errores de tipeo frecuentes)
  const m = /dispo?\s*eliminad[oa]\s*:\s*(\d+)/i.exec(descripcion || "");
  return m ? m[1] : null;
}

// El modelo real del equipo se identifica por el prefijo del serial, no por
// el texto del ticket — un "cambio" puede retirar un modelo viejo (S15/16)
// distinto del que se instala nuevo (S40). Prefijos confirmados; "86" (Queclink)
// no distingue nuevo/usado/GV58LAU, se asume D05 por defecto.
const PREFIJOS_MODELO = [
  { prefijo: "0104020", codigo: "D03" }, // TRAX S40
  { prefijo: "200", codigo: "D01" },     // TRAX S15/16 ficha negra
  { prefijo: "300", codigo: "D01" },
  { prefijo: "310", codigo: "D01" },
  { prefijo: "410", codigo: "D02" },     // TRAX S15/16 ficha blanca
  { prefijo: "86", codigo: "D05" },      // Queclink
];

export function detectarModeloPorSerial(serial) {
  if (!serial) return null;
  const s = String(serial).trim();
  const match = PREFIJOS_MODELO.find((p) => s.startsWith(p.prefijo));
  return match?.codigo || null;
}
