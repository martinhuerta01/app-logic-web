// Qué hacer con el stock según la descripción del ticket (§7.1 del spec).
// "instal" es substring de "desinstal", así que la desinstalación se chequea
// primero para no confundir una cosa con la otra.

export function detectarAccion(descripcionNorm) {
  const tieneDesinstalacion = /desin?s?tal/.test(descripcionNorm);
  const tieneCambioPosicion = /cambio de posicion/.test(descripcionNorm);
  const tieneCambio = /\bcambio\b/.test(descripcionNorm) && !tieneCambioPosicion;
  const tieneInstalacion = /\b(instal|instalador)/.test(descripcionNorm) && !tieneDesinstalacion;

  // desinstalación sin instalación/cambio en el mismo texto => solo retiro
  if (tieneDesinstalacion && !tieneCambio && !tieneInstalacion) return "RETIRO";
  if (tieneCambio) return "CONSUMO_Y_RETIRO";
  if (tieneInstalacion) return "CONSUMO";
  return "SIN_CONSUMO";
}
