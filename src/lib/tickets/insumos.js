// Qué insumos descuenta un ticket (§7.2 del spec).
//
// Los kits grandes (GPS / cámara / corte) se resuelven contra la tabla
// `recetas` editable desde /dashboard/stock/kits (no hardcodeados).
// Los insumos "sueltos" (sensor, ficha, cable, etc.) sí están hardcodeados
// acá con el código real del catálogo actual — es un mapeo best-effort,
// ajustable el día que Tincho limpie el catálogo (no bloqueante, ver plan).

// "sin corte corriente", "sin temperatura": lo negado no se instaló, no cuenta.
const sinNegados = (texto) => texto.replace(/\bsin\s+\w+/g, " ");

export function detectarKits(descripcionOriginalNorm) {
  const descripcionNorm = sinNegados(descripcionOriginalNorm);
  const kits = [];
  // "Portable" tiene su propio kit (D03+C03+A09+C15+IS18) — excluyente con el
  // kit GPS genérico, no se suman los dos por la misma mención de gps/dispositivo.
  if (/portable/.test(descripcionNorm)) kits.push("PORTABLE_TICKET");
  else if (/\bgps\b/.test(descripcionNorm) || /\bdispositivo\b/.test(descripcionNorm)) kits.push("GPS_TICKET");
  if (/camara|retroceso/.test(descripcionNorm)) kits.push("CAMARA_TICKET");
  if (/\bcorte\b/.test(descripcionNorm)) kits.push("CORTE_TICKET");
  return kits;
}

export function detectarSueltos(descripcionOriginalNorm) {
  const descripcionNorm = sinNegados(descripcionOriginalNorm);
  const sueltos = [];
  const push = (codigo, cantidad = 1) => {
    const existente = sueltos.find((s) => s.codigo === codigo);
    if (existente) existente.cantidad += cantidad;
    else sueltos.push({ codigo, cantidad });
  };

  if (/antena/.test(descripcionNorm)) push("A02"); // ANTENA GPS (USADOS) — ajustar código si corresponde nueva
  if (/puerta/.test(descripcionNorm)) push("A07");
  if (/panico/.test(descripcionNorm)) push("A04");
  if (/temperatura|teperatura|temeperatura/.test(descripcionNorm)) push("A09");
  if (/lectora/.test(descripcionNorm)) push("A15");
  if (/caja esta(n?)ca/.test(descripcionNorm)) push("IS06");
  if (/giroscop/.test(descripcionNorm)) push("A24");
  if (/macho/.test(descripcionNorm) && /(ficha|enganche|engache)/.test(descripcionNorm)) push("A20");
  if (/hembra/.test(descripcionNorm) && /(ficha|enganche|engache)/.test(descripcionNorm)) push("A19");

  const cable = descripcionNorm.match(/cable\w*[^\d]{0,20}(\d+)\s*(metros|mts|m)\b/);
  if (cable) push("IS01", parseInt(cable[1], 10));

  return sueltos;
}
