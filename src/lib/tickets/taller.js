// Resolución de ubicación por taller/técnico compartido (Vitaco/Córdoba,
// Taller Bahía Blanca, Taller Río IV, etc.). El mismo taller tiene dos pools
// de stock distintos según el cliente del ticket: uno para La Serenísima
// (va al CD) y otro para el resto de clientes que atiende ese mismo técnico
// (va al taller). Se busca la palabra clave en Base + Descripción — en la
// práctica ambos campos la traen ("vitaco cambio de antena GPS", "bahía
// blanca instalación GPS", Base="Cordoba", etc.).
import { norm } from "./excel";

export function resolverPorTaller(ticket, { ubicaciones, mapeoTalleres, esSerenisima, defaultKeyword, defaultAdvertencia }) {
  const tipoDestino = esSerenisima ? "serenisima" : "otros";
  const texto = norm(`${ticket.base || ""} ${ticket.descripcion || ""}`);

  for (const m of mapeoTalleres || []) {
    if (m.activo === false) continue;
    if ((m.aplica_a || "serenisima") !== tipoDestino) continue;
    if (texto.includes(norm(m.keyword))) {
      return { ubicacionId: m.ubicacion_id };
    }
  }

  const defaultUb = ubicaciones.find((u) => norm(u.nombre).includes(defaultKeyword));
  return defaultUb ? { ubicacionId: defaultUb.id } : { ubicacionId: null, advertencia: defaultAdvertencia };
}
