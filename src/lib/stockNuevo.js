// Utilidades compartidas del módulo Stock nuevo.

export const ORDEN_CATEGORIAS = ["Dispositivos", "Cables", "Accesorios", "Insumos"];

export const ordenCategoria = (c) => {
  const i = ORDEN_CATEGORIAS.indexOf(c);
  return i === -1 ? ORDEN_CATEGORIAS.length : i;
};

// La oficina primero, después centros de distribución, camionetas, talleres y el resto
const tipoDe = (u) => {
  if (u.tipo === "oficina") return 0;
  if (u.tipo === "cd") return 1;
  if (/camioneta/i.test(u.nombre)) return 2;
  if (/taller/i.test(u.nombre)) return 3;
  return 4;
};

export const ordenarUbicaciones = (lista) =>
  [...lista].sort((a, b) => tipoDe(a) - tipoDe(b) || a.nombre.trim().localeCompare(b.nombre.trim()));

export const GRUPOS_UBICACION = ["Oficina", "Camionetas", "Centros de distribución", "Talleres", "Otras ubicaciones"];

export const grupoDeUbicacion = (u) => GRUPOS_UBICACION[[0, 2, 1, 3, 4][tipoDe(u)]];

// Series separadas por línea, coma, punto y coma o espacio
export const parseSeries = (texto) => [...new Set((texto || "").split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean))];

export const diasDesde = (iso) => {
  if (!iso) return null;
  const [a, m, d] = iso.split("-").map(Number);
  const hoy = new Date();
  const base = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.max(0, Math.round((base - Date.UTC(a, m - 1, d)) / 86400000));
};

export const fmtFecha = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");

export const hace = (iso) => {
  const n = diasDesde(iso);
  if (n === null) return "";
  if (n === 0) return "hoy";
  return n === 1 ? "hace 1 día" : `hace ${n} días`;
};

export const mensajeDeError = (e) => {
  const texto = String(e?.message || e || "No se pudo completar");
  try {
    const detalle = JSON.parse(texto).detail;
    if (typeof detalle === "string") return detalle;
  } catch { /* no era JSON */ }
  return texto.replace(/^Error:\s*/, "");
};
