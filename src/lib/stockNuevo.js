// Utilidades compartidas del módulo Stock nuevo.

export const ORDEN_CATEGORIAS = ["Dispositivos", "Cables", "Accesorios", "Insumos"];

export const ordenCategoria = (c) => {
  const i = ORDEN_CATEGORIAS.indexOf(c);
  return i === -1 ? ORDEN_CATEGORIAS.length : i;
};

// Segmentos en los que se agrupan las ubicaciones. Se editan en Stock → Catálogos → Ubicaciones.
export const SEGMENTOS = [
  { clave: "oficina", nombre: "Oficina" },
  { clave: "cd", nombre: "Centros de distribución" },
  { clave: "taller", nombre: "Talleres" },
  { clave: "tecnico", nombre: "Técnicos" },
  { clave: "equipo", nombre: "Equipos" },
  { clave: "otras", nombre: "Otras ubicaciones" },
];

// Localidad a mostrar junto al nombre, salvo que el nombre ya la diga (por ejemplo "CD Mendoza")
export const localidadAMostrar = (u) => {
  const loc = (u.localidad || "").trim();
  if (!loc) return "";
  const sinTilde = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return sinTilde(u.nombre).includes(sinTilde(loc)) ? "" : loc;
};

// Si la ubicación todavía no tiene segmento cargado, se propone uno según su tipo y su nombre
export const segmentoDe = (u) => {
  if (u.segmento) return u.segmento;
  if (u.tipo === "oficina") return "oficina";
  if (/^camioneta/i.test(u.nombre.trim())) return "equipo";
  if (/^(taller|vitaco)/i.test(u.nombre.trim())) return "taller";
  if (u.tipo === "cd") return "cd";
  return "otras";
};

const ordenSegmento = (u) => SEGMENTOS.findIndex((s) => s.clave === segmentoDe(u));

export const ordenarUbicaciones = (lista) =>
  [...lista].sort((a, b) => ordenSegmento(a) - ordenSegmento(b) || a.nombre.trim().localeCompare(b.nombre.trim()));

// Ubicaciones agrupadas por segmento, en orden y sin los segmentos vacíos: [[{clave, nombre}, [ubicaciones]], ...]
export const agruparPorSegmento = (lista) =>
  SEGMENTOS
    .map((s) => [s, ordenarUbicaciones(lista).filter((u) => segmentoDe(u) === s.clave)])
    .filter(([, l]) => l.length > 0);

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

// Valor de un código de La Serenísima a partir de las cantidades de sus productos.
// modo "suma": suma de los productos. modo "pares": conjunto completo, vale el mínimo (5 machos y 5 hembras = 5 fichas).
// "sobrantes" son las unidades que quedan solas en el modo pares (por ejemplo, 2 hembras sin su macho).
export const valorDeCodigo = (entrada, cantidadDe) => {
  const ids = entrada.producto_ids || [];
  const cantidades = ids.map((id) => cantidadDe(id));
  if (entrada.modo === "pares" && ids.length > 0) {
    const minimo = Math.min(...cantidades);
    const sobrantes = ids.map((id, i) => ({ id, cantidad: cantidades[i] - minimo })).filter((s) => s.cantidad > 0);
    return { valor: minimo, sobrantes };
  }
  return { valor: cantidades.reduce((a, c) => a + c, 0), sobrantes: [] };
};
