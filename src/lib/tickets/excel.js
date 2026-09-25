// Lectura del Excel "Ticket de Soporte": header en la fila donde aparece la
// celda "Ticket" (las primeras filas son título/vacías), formato validado
// contra el archivo real de agosto.

export const norm = (s) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function parseFecha(v) {
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const m = String(v ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return "";
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

export function parsearFilas(rows) {
  const h = rows.findIndex((r) => r.some((c) => norm(c) === "ticket"));
  if (h < 0) return [];
  const head = rows[h].map(norm);
  const col = (n) => head.indexOf(n);
  const c = {
    ticket: col("ticket"), fecha: col("fecha"), inc: col("incidencia"),
    desc: col("descripcion"), estado: col("estado"), distrito: col("distrito"),
    base: col("base"), veh: col("vehiculo"), disp: col("dispositivo"),
  };
  return rows
    .slice(h + 1)
    .filter((r) => /^\d+$/.test(String(r[c.ticket] ?? "").trim()))
    .map((r) => ({
      ticket: String(r[c.ticket]).trim(),
      fecha: parseFecha(r[c.fecha]),
      incidencia: String(r[c.inc] ?? ""),
      descripcion: String(r[c.desc] ?? ""),
      estado: Number(r[c.estado]),
      distrito: String(r[c.distrito] ?? ""),
      base: String(r[c.base] ?? ""),
      patente: String(r[c.veh] ?? "").split("-").pop().trim(),
      dispositivo: String(r[c.disp] ?? "").trim(),
    }));
}
