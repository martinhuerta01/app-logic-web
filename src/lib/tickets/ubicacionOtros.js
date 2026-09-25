// Resolución de ubicación para cualquier cliente que no sea La Serenísima
// (Enel, Mantelectric, CCU, Femsa, Ledesma, Lesko, etc.).
// Los talleres que además de La Serenísima atienden otros clientes en la
// misma zona (Vitaco, Taller Bahía Blanca, Taller Río IV, etc.) tienen su
// propio pool de stock — se detectan con la misma tabla mapeo_talleres,
// filtrada a aplica_a = "otros". Si no matchea ningún taller, cae a
// Camioneta 1 (el técnico móvil sin taller fijo asignado).
import { resolverPorTaller } from "./taller";

export function resolverUbicacionOtros(ticket, { ubicaciones, mapeoTalleres }) {
  return resolverPorTaller(ticket, {
    ubicaciones, mapeoTalleres, esSerenisima: false,
    defaultKeyword: "camioneta 1",
    defaultAdvertencia: "No existe la ubicación Camioneta 1",
  });
}
