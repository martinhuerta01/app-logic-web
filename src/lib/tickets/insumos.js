// Qué insumos descuenta un ticket (§7.2 del spec).
//
// Los kits grandes (GPS / cámara / corte) se resuelven contra la tabla
// `recetas` editable desde /dashboard/stock/kits (no hardcodeados).
// Los insumos "sueltos" (sensor, ficha, cable, etc.) sí están hardcodeados
// acá con el código real del catálogo actual — es un mapeo best-effort,
// ajustable el día que Tincho limpie el catálogo (no bloqueante, ver plan).

// Palabras que nunca se descartan aunque las siga un "ok" (el equipo que "reporta ok" igual se instaló).
const SIEMPRE_CUENTAN = new Set(["gps", "dispositivo", "dispo", "camara", "portable", "equipo"]);

// "sin corte corriente", "sin temperatura": lo negado no se instaló, no cuenta.
// "temperatura ok", "puertas ok", "engache ok": en las revisiones es lo que se controló y funciona, no lo que se instaló.
const sinNegados = (texto) =>
  texto
    .replace(/\bsin\s+\w+/g, " ")
    .replace(/\b(\w+)\s+ok\b/g, (m, palabra) => (SIEMPRE_CUENTAN.has(palabra) ? m : " "));

// "antena gps" es la antena, no el equipo: no dispara el kit de instalación de GPS
const sinAntenas = (texto) => texto.replace(/antena\w*\s+(de\s+)?(gps|gprs)/g, " antena ");

export function detectarKits(descripcionOriginalNorm) {
  const descripcionNorm = sinAntenas(sinNegados(descripcionOriginalNorm));
  const kits = [];
  // "Portable" tiene su propio kit (D03+C03+A09+C15+IS18) — excluyente con el
  // kit GPS genérico, no se suman los dos por la misma mención de gps/dispositivo.
  if (/portable/.test(descripcionNorm)) kits.push("PORTABLE_TICKET");
  else if (/\bgps\b/.test(descripcionNorm) || /\bdispositivo\b/.test(descripcionNorm) || /\bdispo\b/.test(descripcionNorm)) kits.push("GPS_TICKET");
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
  if (/\bsim\b/.test(descripcionNorm)) push("A05"); // SIM (una sola, ya no se distingue nueva de usada)
  if (/buzzer|buser|buzer/.test(descripcionNorm)) push("A21");
  if (/soporte/.test(descripcionNorm)) push("IS29"); // solo cuando el ticket lo nombra: no es parte del kit de cámara
  // En un semirremolque (SEMI, o "temperatura ok" en la revisión) el sensor de puerta es el de embutir (A08), no el de cabina (A07)
  const esSemi = /semi/.test(descripcionOriginalNorm) || /t[a-z]*ratura\s+ok/.test(descripcionOriginalNorm);
  if (/puerta/.test(descripcionNorm)) push(esSemi ? "A08" : "A07");
  if (/(cambio|cambie|instalacion)\s+(de\s+)?(la\s+)?bater/.test(descripcionNorm)) push("A03"); // batería de respaldo: solo si se cambió ("sin tensión de batería" no cuenta)
  if (/panico/.test(descripcionNorm)) push("A04");
  if (/temperatura|teperatura|temeperatura/.test(descripcionNorm)) push("A09");
  if (/lectora/.test(descripcionNorm)) push("A15");
  if (/caja esta(n?)ca/.test(descripcionNorm)) push("IS06");
  if (/giroscop/.test(descripcionNorm)) push("A24");
  // "ficha de alimentacion" es del cableado, no la ficha de enganche
  const fichas = descripcionNorm.replace(/ficha\s+de\s+alimentacion/g, " ");
  if (/macho/.test(fichas) && /(ficha|enganche|engache)/.test(fichas)) push("A20");
  if (/hembra/.test(fichas) && /(ficha|enganche|engache)/.test(fichas)) push("A19");
  // "ficha de enganche" sin decir macho ni hembra: se toma la macho, que es la que se lleva en stock
  if (/(ficha|enganche|engache)/.test(fichas) && !/macho|hembra/.test(fichas)) push("A20");

  const cable = descripcionNorm.match(/cable\w*[^\d]{0,20}(\d+)\s*(metros|mts|m)\b/);
  if (cable) push("IS01", parseInt(cable[1], 10));

  return sueltos;
}
