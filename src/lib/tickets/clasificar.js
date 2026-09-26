import { norm } from "./excel";
import { debeExcluirse } from "./exclusion";
import { detectarAccion } from "./accion";
import { detectarKits, detectarSueltos } from "./insumos";
import { extraerDispositivo, extraerDispoEliminado, detectarModeloPorSerial } from "./serial";
import { resolverUbicacionSerenisima } from "./ubicacionSerenisima";
import { resolverUbicacionOtros } from "./ubicacionOtros";

export const ESTADO_CERRADO = 6;

const LABEL_KIT = {
  GPS_TICKET: { instalado: "Instalación GPS", cambiado: "Cambio GPS", retirado: "Desinstalación GPS" },
  PORTABLE_TICKET: { instalado: "Instalación Portable", cambiado: "Cambio Portable", retirado: "Desinstalación Portable" },
  CAMARA_TICKET: { instalado: "Cámara de retroceso" },
  CORTE_TICKET: { instalado: "Corte" },
};
const KITS_DISPOSITIVO = ["GPS_TICKET", "PORTABLE_TICKET"];

// ctx: { ubicaciones, mapeoTalleres, recetas, productos }
export function clasificarTicket(ticket, ctx) {
  const descripcionNorm = norm(ticket.descripcion);
  const exclusion = debeExcluirse(descripcionNorm);
  if (exclusion.excluir) return { omitir: exclusion.motivo };

  const accion = detectarAccion(descripcionNorm);
  let kits = detectarKits(descripcionNorm);
  const sueltos = detectarSueltos(descripcionNorm);
  const dispositivo = extraerDispositivo(ticket);
  const dispoEliminado = extraerDispoEliminado(ticket.descripcion);

  const advertencias = [];
  if (ticket.estado !== ESTADO_CERRADO) advertencias.push(`Estado ${ticket.estado} (no cerrado)`);

  // El sistema marca "*Dispo eliminado*" automáticamente cada vez que se
  // reemplaza el equipo de verdad. Si el texto dice "cambio" + gps/dispositivo
  // pero NO trae ese marcador, no es el equipo lo que se cambió (antena, SIM,
  // cable) — se saca el kit de dispositivo para no tocar el serial ni el stock del equipo.
  const kitDispositivoDetectado = kits.find((k) => KITS_DISPOSITIVO.includes(k));
  if (accion === "CONSUMO_Y_RETIRO" && kitDispositivoDetectado && !dispoEliminado) {
    kits = kits.filter((k) => k !== kitDispositivoDetectado);
    advertencias.push('Dice "cambio" y menciona el equipo pero no tiene "Dispo eliminado": se asume que no es el equipo (revisá insumos)');
  }

  const consume = accion === "CONSUMO" || accion === "CONSUMO_Y_RETIRO";
  const generaRetiro = accion === "RETIRO" || accion === "CONSUMO_Y_RETIRO";
  const productoPorId = new Map((ctx.productos || []).map((p) => [p.id, p]));
  const productoPorCodigo = new Map((ctx.productos || []).map((p) => [String(p.codigo).trim().toUpperCase(), p]));

  // Expandir kits contra recetas (editable desde /dashboard/stock/kits) —
  // solo cuando el ticket efectivamente consume algo (no en desinstalaciones puras).
  const cantidadPorProducto = new Map();
  const acumular = (productoId, cantidad) => {
    cantidadPorProducto.set(productoId, (cantidadPorProducto.get(productoId) || 0) + cantidad);
  };
  if (consume) {
    for (const kitKey of kits) {
      const filas = (ctx.recetas || []).filter((r) => r.tipo_instalacion === kitKey);
      if (filas.length === 0) {
        advertencias.push(`No hay kit cargado para "${kitKey}" (pantalla Stock → Kits): agregá los insumos a mano`);
        continue;
      }
      for (const r of filas) acumular(r.producto_id, r.cantidad);
    }
    for (const s of sueltos) {
      const prod = productoPorCodigo.get(s.codigo);
      if (!prod) { advertencias.push(`Código ${s.codigo} no existe en Productos`); continue; }
      if (cantidadPorProducto.has(prod.id)) continue; // ya lo trae el kit (por ejemplo la SIM del kit de equipo)
      acumular(prod.id, s.cantidad);
    }
  }

  const items = [...cantidadPorProducto].map(([producto_id, cantidad]) => {
    const prod = productoPorId.get(producto_id);
    // Los materiales de instalación (categoría Insumos: cable, cajas, pasacables) salen de la camioneta
    // del equipo que trabaja en esa base, no del centro de distribución (ver ubicacion_materiales_id).
    return { producto_id, cantidad, codigo: prod?.codigo, descripcion: prod?.descripcion, esMaterial: prod?.categoria === "Insumos" };
  });

  if (!consume && !generaRetiro) {
    return { omitir: "Sin cambios (revisión/reparación, no descuenta stock)" };
  }
  if (consume && items.length === 0) {
    advertencias.push("No se reconoció ningún insumo en la descripción: agregalos a mano");
  }

  // Serial: solo se toca si el ticket habla de un equipo (GPS o Portable). El
  // producto que se instala se identifica dentro de la receta del kit de
  // dispositivo (el ítem de categoría "Dispositivos"), esté o no consumiéndose.
  const tieneGps = !!kitDispositivoDetectado;
  let productoGpsId = null;
  if (tieneGps) {
    const filasGps = (ctx.recetas || []).filter((r) => r.tipo_instalacion === kitDispositivoDetectado);
    const filaGps = filasGps.find((r) => productoPorId.get(r.producto_id)?.categoria === "Dispositivos");
    productoGpsId = filaGps?.producto_id || filasGps[0]?.producto_id || null;
    if (!productoGpsId) advertencias.push(`No hay kit "${kitDispositivoDetectado}" cargado: no se puede vincular el serial a un producto`);
  }

  let serialInstalado = null;
  let serialRetirado = null;
  let productoRetiroId = null;
  if (tieneGps && consume) {
    serialInstalado = dispositivo || null;
    if (!serialInstalado) advertencias.push("No se detectó el serial instalado (columna Dispositivo vacía)");
  }
  if (tieneGps && generaRetiro) {
    serialRetirado = dispoEliminado || (accion === "RETIRO" ? dispositivo : null);
    if (!serialRetirado) advertencias.push('No se detectó el serial retirado ("Dispo eliminado"): completalo a mano');
    // El equipo retirado puede ser un modelo distinto al que se instala nuevo
    // (ej. sale un S15/16 viejo, entra un S40) — se identifica por el prefijo
    // del propio serial, no por el kit del ticket.
    const modeloRetirado = detectarModeloPorSerial(serialRetirado);
    productoRetiroId = (modeloRetirado && productoPorCodigo.get(modeloRetirado)?.id) || productoGpsId;
  }

  // Configuración del equipo: La Serenísima Distribución siempre carga
  // CHASIS; en LD se infiere de los insumos del ticket (temperatura => SEMI,
  // corte => TRACTOR). El resto de clientes no tiene regla automática — se
  // completa a mano en la pantalla de Equipos si hace falta.
  const distritoNorm = norm(ticket.distrito);
  let configuracion = null;
  if (tieneGps && serialInstalado) {
    if (distritoNorm.includes("distribucion")) {
      configuracion = "CHASIS";
    } else if (/\bld\b/.test(distritoNorm)) {
      if (sueltos.some((s) => s.codigo === "A09")) configuracion = "SEMI";
      else if (kits.includes("CORTE_TICKET")) configuracion = "TRACTOR";
    }
  }

  // Ubicación: La Serenísima tiene reglas propias (12 CDs + talleres); el
  // resto de clientes siempre resuelve a Camioneta 1.
  const esSerenisima = /serenisima/.test(norm(ticket.distrito));
  const resUb = esSerenisima
    ? resolverUbicacionSerenisima(ticket, ctx)
    : resolverUbicacionOtros(ticket, ctx);
  if (resUb.advertencia) advertencias.push(resUb.advertencia);

  const servicio = kits
    .map((k) => {
      const l = LABEL_KIT[k];
      if (!l) return k;
      if (KITS_DISPOSITIVO.includes(k)) return accion === "CONSUMO_Y_RETIRO" ? l.cambiado : accion === "RETIRO" ? l.retirado : l.instalado;
      return l.instalado;
    })
    .join(" + ") || (accion === "RETIRO" ? "Desinstalación" : "Servicio sin clasificar");

  return {
    servicio,
    accion,
    ubicacionId: resUb.ubicacionId,
    items,
    productoGpsId,
    productoRetiroId,
    serialInstalado,
    serialRetirado,
    configuracion,
    incluir: !!resUb.ubicacionId && ticket.estado === ESTADO_CERRADO && (items.length > 0 || generaRetiro),
    advertencias,
  };
}
