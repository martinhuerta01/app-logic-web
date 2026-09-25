// Resolución de ubicación para La Serenísima (§6.2 y §6.3 del spec).
import { norm } from "./excel";
import { resolverPorTaller } from "./taller";

export function resolverUbicacionSerenisima(ticket, { ubicaciones, mapeoTalleres }) {
  const distritoNorm = norm(ticket.distrito);

  if (distritoNorm.includes("distribucion")) {
    const baseNorm = norm(ticket.base);
    if (!baseNorm) return { ubicacionId: null, advertencia: "Base vacía: elegí el CD a mano" };
    const match = ubicaciones.find((u) => {
      const un = norm(u.nombre);
      return un === baseNorm || un.includes(baseNorm) || baseNorm.includes(un);
    });
    if (!match) return { ubicacionId: null, advertencia: `No existe la ubicación "${ticket.base}": elegí una a mano` };
    return { ubicacionId: match.id };
  }

  // La Serenísima LD: buscar localidad/taller en Base + descripción
  return resolverPorTaller(ticket, {
    ubicaciones, mapeoTalleres, esSerenisima: true,
    defaultKeyword: "general rodriguez",
    defaultAdvertencia: "No existe la ubicación CD General Rodríguez",
  });
}
