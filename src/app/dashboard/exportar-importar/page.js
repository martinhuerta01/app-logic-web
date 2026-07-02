"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import XS from "xlsx-js-style";

const TZ = "America/Argentina/Buenos_Aires";
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function fmtFecha(s) {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function parseMins(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minsToHHMM(mins) {
  if (!mins || mins <= 0) return "0:00";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function balanceHHMM(trabajadoMins, esperadoMins) {
  const diff = trabajadoMins - esperadoMins;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = diff >= 0 ? "+" : "-";
  return `${sign}${h}:${String(m).padStart(2, "0")}`;
}

// Convierte horas decimales (ej: 118.88) a HH:MM
function horasDecToHHMM(horas) {
  if (!horas && horas !== 0) return "0:00";
  const neg = horas < 0;
  const totalMins = Math.round(Math.abs(horas) * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${neg ? "-" : ""}${h}:${String(m).padStart(2, "0")}`;
}

function balanceDecToHHMM(horas) {
  const neg = horas < 0;
  const totalMins = Math.round(Math.abs(horas) * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${neg ? "-" : "+"}${h}:${String(m).padStart(2, "0")}`;
}

function diasHabilesEnMes(mes, anio) {
  const dias = new Date(anio, mes, 0).getDate();
  let count = 0;
  for (let d = 1; d <= dias; d++) {
    const dow = new Date(anio, mes - 1, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

// ── Helpers para Informe de Personal ────────────────────────────────
const TIPOS_JUSTIFICADOS_EXP = ["Médica", "Vacaciones", "Personal"];

function calcHorasExp(salida, llegada) {
  const s = parseMins(salida);
  const l = parseMins(llegada);
  if (s == null || l == null) return null;
  const diff = l - s;
  return diff > 0 ? +(diff / 60).toFixed(2) : null;
}

function fmtHHMM(h) {
  if (h === null || h === undefined || isNaN(h)) return "";
  const neg = h < 0;
  const abs = Math.abs(h);
  const hh = Math.floor(abs);
  const mm = Math.round((abs - hh) * 60);
  return `${neg ? "-" : ""}${hh}:${String(mm).padStart(2, "0")}`;
}

function fmtBalanceHHMM(h) {
  const s = fmtHHMM(h);
  return s ? (h >= 0 ? "+" : "") + s : "";
}

function fechaMatchExp(fecha, mes, anio) {
  if (!fecha) return false;
  const [y, mo] = fecha.split("-");
  if (anio && parseInt(y) !== parseInt(anio)) return false;
  if (mes && parseInt(mo) !== parseInt(mes)) return false;
  return true;
}

function diasEnRangoExp(desde, hasta, mes, anio) {
  if (!desde) return 0;
  const d1 = new Date(desde + "T12:00:00Z");
  const d2 = new Date((hasta || desde) + "T12:00:00Z");
  let count = 0;
  for (let d = new Date(d1); d <= d2; d.setUTCDate(d.getUTCDate() + 1)) {
    const f = d.toISOString().slice(0, 10);
    if (fechaMatchExp(f, mes, anio)) count++;
  }
  return count;
}

function setColWidths(ws, widths) {
  ws["!cols"] = widths.map(w => ({ wch: w }));
}

// ── Styling helpers ─────────────────────────────────────────────────
const S_HEADER = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
  fill: { fgColor: { rgb: "4F46E5" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    bottom: { style: "thin", color: { rgb: "818CF8" } },
  },
};

const S_TOTAL = {
  font: { bold: true, color: { rgb: "1E1B4B" }, sz: 11 },
  fill: { fgColor: { rgb: "E0E7FF" } },
  alignment: { horizontal: "center" },
};

const S_SUBTOTAL = {
  font: { bold: true, color: { rgb: "374151" } },
  fill: { fgColor: { rgb: "F1F5F9" } },
};

function applyRowStyle(ws, rowIdx, colCount, style) {
  for (let c = 0; c < colCount; c++) {
    const ref = XS.utils.encode_cell({ r: rowIdx, c });
    if (!ws[ref]) ws[ref] = { v: "", t: "s" };
    ws[ref].s = style;
  }
}

function makeSheet(rows) {
  return XS.utils.aoa_to_sheet(rows);
}

// ── Estilos balance ─────────────────────────────────────────────────
const S_BALANCE_POS = { font: { bold: true, color: { rgb: "166534" }, sz: 11 }, fill: { fgColor: { rgb: "DCFCE7" } }, alignment: { horizontal: "center" } };
const S_BALANCE_NEG = { font: { bold: true, color: { rgb: "991B1B" }, sz: 11 }, fill: { fgColor: { rgb: "FEE2E2" } }, alignment: { horizontal: "center" } };

// ── Export 1: Informe de Personal (Horas + Productividad) ──────────
async function exportarHoras(mes, anio) {
  const svcParams = mes ? { mes, anio } : { anio };
  const [movs, eqs, tecDirectorio, ausencias, svcsEq, svcsInt] = await Promise.all([
    api.get("/movimientos-camioneta/"),
    api.get("/equipos/"),
    api.get("/directorio/tecnicos"),
    api.get("/jornadas/ausencias/"),
    api.get("/servicios/", { ...svcParams, tipo: "equipos" }),
    api.get("/servicios/", { ...svcParams, tipo: "interior" }),
  ]);

  const filtrados = movs.filter(m => fechaMatchExp(m.fecha, mes, anio));
  if (!filtrados.length) throw new Error("Sin datos para el período seleccionado");

  // Técnicos por equipo (para días normales sin jornada cargada)
  const tecsPorEquipo = {};
  for (const tec of tecDirectorio) {
    const eqId = String(tec.equipo_id || tec.equipos?.id || "");
    if (!eqId) continue;
    if (!tecsPorEquipo[eqId]) tecsPorEquipo[eqId] = [];
    tecsPorEquipo[eqId].push(tec.nombre);
  }

  const agrupado = {};
  for (const eq of eqs) agrupado[eq.nombre] = { id: String(eq.id), dias: [] };

  const tecMap = {};
  const DIAS_NOMBRES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

  for (const m of filtrados) {
    const eq = eqs.find(e => String(e.id) === String(m.equipo_id)) || m.equipos;
    const nombre = eq?.nombre || "—";
    if (!agrupado[nombre]) agrupado[nombre] = { id: String(m.equipo_id), dias: [] };

    const h = calcHorasExp(m.hora_salida?.slice(0, 5), m.hora_llegada?.slice(0, 5));
    const tjPresentes = (m.tecnicos_jornada || []).filter(t => t.presente);
    const presentes = tjPresentes.length === 0
      ? (tecsPorEquipo[String(m.equipo_id)] || [])
      : tjPresentes.map(t => t.empleados?.nombre || t.tecnico_id);

    agrupado[nombre].dias.push({ fecha: m.fecha, hora_salida: m.hora_salida?.slice(0,5) || "", hora_llegada: m.hora_llegada?.slice(0,5) || "", horas: h, tecnicos: presentes });

    for (const nombreTec of presentes) {
      if (!tecMap[nombreTec]) tecMap[nombreTec] = { nombre: nombreTec, dias: 0, minutos: 0, ausencias: [] };
      tecMap[nombreTec].dias++;
      if (h !== null) tecMap[nombreTec].minutos += Math.round(h * 60);
    }
  }

  // Ausencias justificadas
  for (const aus of ausencias) {
    if (!TIPOS_JUSTIFICADOS_EXP.includes(aus.tipo_licencia)) continue;
    const nombre = aus.nombre;
    const dias = diasEnRangoExp(aus.fecha_desde, aus.fecha_hasta, mes, anio);
    if (!dias) continue;
    if (!tecMap[nombre]) tecMap[nombre] = { nombre, dias: 0, minutos: 0, ausencias: [] };
    tecMap[nombre].dias += dias;
    tecMap[nombre].minutos += dias * 8 * 60;
    tecMap[nombre].ausencias.push({ tipo: aus.tipo_licencia, dias });
  }

  // Servicios por técnico
  const todosSvcs = [...(svcsEq || []), ...(svcsInt || [])];
  const svcMap = {};
  for (const s of todosSvcs) {
    if (s.estado !== "REALIZADO") continue;
    const resp = s.responsable || eqs.find(e => String(e.id) === String(s.equipo_id))?.nombre || "Sin asignar";
    if (!svcMap[resp]) svcMap[resp] = { total: 0, INSTALACION: 0, REVISION: 0, DESINSTALACION: 0 };
    svcMap[resp].total++;
    if (s.tipo_servicio) svcMap[resp][s.tipo_servicio] = (svcMap[resp][s.tipo_servicio] || 0) + 1;
  }

  const wb = XS.utils.book_new();

  // ── Hoja 1: Resumen técnicos (horas + productividad) ──
  const tecnicos = Object.values(tecMap);
  const COLS_SUM = ["Técnico", "Días efectivos", "Aus. justificadas", "Horas trabajadas", "Horas base (8hs)", "Balance", "Servicios", "Inst.", "Rev.", "Desinst.", "Svc/día"];
  const sumRows = [COLS_SUM];
  let totDias = 0, totMins = 0, totSvcs = 0, totInst = 0, totRev = 0, totDes = 0, totDiasBase = 0;

  for (const t of tecnicos) {
    const horas = t.minutos / 60;
    const diasAus = t.ausencias?.reduce((s, a) => s + a.dias, 0) || 0;
    const diasEf = t.dias - diasAus;
    const base = t.dias * 8;
    const bal = horas - base;
    const sv = svcMap[t.nombre] || { total: 0, INSTALACION: 0, REVISION: 0, DESINSTALACION: 0 };
    sumRows.push([t.nombre, diasEf, diasAus || "", fmtHHMM(horas), fmtHHMM(base), fmtBalanceHHMM(bal), sv.total || "", sv.INSTALACION || "", sv.REVISION || "", sv.DESINSTALACION || "", t.dias > 0 ? +(sv.total / t.dias).toFixed(1) : ""]);
    totDias += diasEf; totMins += t.minutos; totSvcs += sv.total;
    totInst += sv.INSTALACION; totRev += sv.REVISION; totDes += sv.DESINSTALACION;
    totDiasBase += t.dias;
  }

  const totH = totMins / 60;
  const totBase = totDiasBase * 8;
  sumRows.push(["TOTAL", totDias, "", fmtHHMM(totH), fmtHHMM(totBase), fmtBalanceHHMM(totH - totBase), totSvcs, totInst, totRev, totDes, totDiasBase > 0 ? +(totSvcs / totDiasBase).toFixed(1) : ""]);

  const wsSum = makeSheet(sumRows);
  setColWidths(wsSum, [22, 15, 18, 17, 17, 12, 12, 8, 8, 10, 10]);
  applyRowStyle(wsSum, 0, COLS_SUM.length, S_HEADER);
  applyRowStyle(wsSum, sumRows.length - 1, COLS_SUM.length, S_TOTAL);
  for (let r = 1; r < sumRows.length; r++) {
    const bal = sumRows[r][5];
    if (typeof bal === "string" && bal) {
      const ref = XS.utils.encode_cell({ r, c: 5 });
      if (wsSum[ref]) wsSum[ref].s = bal.startsWith("+") ? S_BALANCE_POS : S_BALANCE_NEG;
    }
  }
  XS.utils.book_append_sheet(wb, wsSum, "Resumen técnicos");

  // ── Hojas por equipo ──
  for (const [nombre, { dias }] of Object.entries(agrupado)) {
    if (!dias.length) continue;
    const sorted = [...dias].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const rows = [["Fecha", "Día", "Hora salida", "Hora llegada", "Horas", "Balance", "Técnicos"]];
    let totalMins = 0;

    for (const d of sorted) {
      if (d.horas !== null && d.horas > 0) totalMins += Math.round(d.horas * 60);
      const dow = new Date(d.fecha + "T12:00:00Z").getUTCDay();
      rows.push([fmtFecha(d.fecha), DIAS_NOMBRES[dow], d.hora_salida, d.hora_llegada, d.horas !== null ? fmtHHMM(d.horas) : "", d.horas !== null ? fmtBalanceHHMM(d.horas - 8) : "", d.tecnicos.join(", ")]);
    }

    const totH2 = totalMins / 60;
    const espH = dias.length * 8;
    rows.push(["Horas trabajadas", "", "", "", fmtHHMM(totH2), "", ""]);
    rows.push([`Horas esperadas (8hs × ${dias.length} días)`, "", "", "", fmtHHMM(espH), "", ""]);
    rows.push(["BALANCE", "", "", "", "", fmtBalanceHHMM(totH2 - espH), ""]);

    const ws = makeSheet(rows);
    setColWidths(ws, [14, 6, 13, 13, 10, 10, 25]);
    applyRowStyle(ws, 0, 7, S_HEADER);
    applyRowStyle(ws, rows.length - 3, 7, S_SUBTOTAL);
    applyRowStyle(ws, rows.length - 2, 7, S_SUBTOTAL);
    applyRowStyle(ws, rows.length - 1, 7, (totH2 - espH) >= 0 ? S_BALANCE_POS : S_BALANCE_NEG);
    for (let r = 1; r < rows.length - 3; r++) {
      const bal = rows[r][5];
      if (typeof bal === "string" && bal) {
        const ref = XS.utils.encode_cell({ r, c: 5 });
        if (ws[ref]) ws[ref].s = bal.startsWith("+") ? S_BALANCE_POS : S_BALANCE_NEG;
      }
    }
    XS.utils.book_append_sheet(wb, ws, nombre.slice(0, 31));
  }

  wb.SheetNames = ["Resumen técnicos", ...wb.SheetNames.filter(s => s !== "Resumen técnicos")];
  const label = mes ? `${MESES[mes - 1]}_${anio}` : String(anio);
  XS.writeFile(wb, `Informe_Personal_${label}.xlsx`);
}

// ── Export 3: Stock Actual (solo Oficina) ───────────────────────────
async function exportarStock() {
  const data = await api.get("/stock/actual/");
  if (!data?.length) throw new Error("No hay datos de stock");

  // Solo la ubicación de tipo "oficina"
  const oficina = data.filter(item => item.ubicaciones?.tipo === "oficina");
  if (!oficina.length) throw new Error("No hay datos de stock para la oficina");

  const sorted = [...oficina].sort((a, b) => {
    const cat = (a.productos?.categoria || "").localeCompare(b.productos?.categoria || "");
    return cat !== 0 ? cat : (a.productos?.codigo || "").localeCompare(b.productos?.codigo || "");
  });

  const wb = XS.utils.book_new();
  const rows = [["Código", "Descripción", "Categoría", "Cantidad"]];
  for (const item of sorted) {
    rows.push([item.productos?.codigo || "", item.productos?.descripcion || "", item.productos?.categoria || "", item.cantidad]);
  }
  rows.push(["", "", "TOTAL", sorted.reduce((s, i) => s + (i.cantidad || 0), 0)]);

  const ws = makeSheet(rows);
  setColWidths(ws, [12, 38, 20, 10]);
  applyRowStyle(ws, 0, 4, S_HEADER);
  applyRowStyle(ws, rows.length - 1, 4, S_TOTAL);
  XS.utils.book_append_sheet(wb, ws, "Stock Oficina");

  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
  XS.writeFile(wb, `Stock_Oficina_${hoy}.xlsx`);
}

// ── Export 4: Servicios ─────────────────────────────────────────────
async function exportarServicios(mes, anio) {
  const params = mes ? { mes, anio } : { anio };
  const data = await api.get("/servicios/", params);
  if (!data?.length) throw new Error("Sin datos para el período seleccionado");

  const sorted = [...data].sort((a, b) => {
    const f = (a.fecha || "").localeCompare(b.fecha || "");
    return f !== 0 ? f : (a.hora_programada || "").localeCompare(b.hora_programada || "");
  });

  const wb = XS.utils.book_new();
  const cols = ["Fecha", "Hora", "Responsable", "Cliente", "Tipo", "Dispositivo", "Patente", "Localidad", "Estado", "Observaciones"];
  const rows = [cols];
  for (const s of sorted) {
    rows.push([fmtFecha(s.fecha), s.hora_programada || "", s.responsable || "", s.cliente || "", s.tipo_servicio || "", s.dispositivo || "", s.patente || "", s.localidad || "", s.estado || "", s.observaciones || ""]);
  }
  const ws = makeSheet(rows);
  setColWidths(ws, [12, 8, 20, 28, 14, 18, 10, 20, 12, 35]);
  applyRowStyle(ws, 0, cols.length, S_HEADER);
  XS.utils.book_append_sheet(wb, ws, "Servicios");

  const byResp = {};
  for (const s of sorted) {
    const r = s.responsable || "Sin responsable";
    if (!byResp[r]) byResp[r] = { total: 0, realizados: 0, cancelados: 0 };
    byResp[r].total++;
    if (s.estado === "REALIZADO") byResp[r].realizados++;
    if (s.estado === "CANCELADO") byResp[r].cancelados++;
  }
  const sumRows = [["Responsable", "Total", "Realizados", "Cancelados", "Pendientes"]];
  for (const [resp, st] of Object.entries(byResp)) {
    sumRows.push([resp, st.total, st.realizados, st.cancelados, st.total - st.realizados - st.cancelados]);
  }
  const totalReal = sorted.filter(s => s.estado === "REALIZADO").length;
  const totalCanc = sorted.filter(s => s.estado === "CANCELADO").length;
  sumRows.push(["TOTAL", sorted.length, totalReal, totalCanc, sorted.length - totalReal - totalCanc]);
  const wsSum = makeSheet(sumRows);
  setColWidths(wsSum, [24, 8, 12, 12, 12]);
  applyRowStyle(wsSum, 0, 5, S_HEADER);
  applyRowStyle(wsSum, sumRows.length - 1, 5, S_TOTAL);
  XS.utils.book_append_sheet(wb, wsSum, "Por responsable");

  const labelServicios = mes ? `${MESES[mes - 1]}_${anio}` : String(anio);
  XS.writeFile(wb, `Servicios_${labelServicios}.xlsx`);
}

// ── Export 5: Clientes vs Responsables ─────────────────────────────
async function exportarClienteResponsable(mes, anio) {
  const params = mes ? { mes, anio } : { anio };
  const data = await api.get("/servicios/", params);
  if (!data?.length) throw new Error("Sin datos para el período seleccionado");

  const responsables = [...new Set(data.map(s => s.responsable || "Sin responsable"))].sort();
  const clientes = [...new Set(data.map(s => s.cliente || "Sin cliente"))].sort();

  const pivot = {};
  for (const s of data) {
    const cli = s.cliente || "Sin cliente";
    const resp = s.responsable || "Sin responsable";
    if (!pivot[cli]) pivot[cli] = {};
    pivot[cli][resp] = (pivot[cli][resp] || 0) + 1;
  }

  const wb = XS.utils.book_new();
  const colTotals = {};
  for (const resp of responsables) colTotals[resp] = 0;

  const rows = [["Cliente", ...responsables, "TOTAL"]];
  for (const cli of clientes) {
    const row = [cli];
    let rowTotal = 0;
    for (const resp of responsables) {
      const val = pivot[cli]?.[resp] || 0;
      row.push(val || "");
      colTotals[resp] += val;
      rowTotal += val;
    }
    row.push(rowTotal);
    rows.push(row);
  }
  rows.push(["TOTAL", ...responsables.map(r => colTotals[r] || ""), data.length]);

  const ncols = responsables.length + 2;
  const ws = makeSheet(rows);
  setColWidths(ws, [28, ...responsables.map(() => 16), 10]);
  applyRowStyle(ws, 0, ncols, S_HEADER);
  applyRowStyle(ws, rows.length - 1, ncols, S_TOTAL);
  XS.utils.book_append_sheet(wb, ws, "Tabla cruzada");

  const detRows = [["Cliente", "Responsable", "Servicios"]];
  for (const cli of clientes) {
    for (const resp of responsables) {
      const val = pivot[cli]?.[resp];
      if (val) detRows.push([cli, resp, val]);
    }
  }
  const wsDet = makeSheet(detRows);
  setColWidths(wsDet, [28, 22, 12]);
  applyRowStyle(wsDet, 0, 3, S_HEADER);
  XS.utils.book_append_sheet(wb, wsDet, "Detalle");

  const labelCliResp = mes ? `${MESES[mes - 1]}_${anio}` : String(anio);
  XS.writeFile(wb, `Clientes_vs_Responsables_${labelCliResp}.xlsx`);
}

// ── Export 6: Servicios por Cliente ────────────────────────────────
async function exportarPorCliente(clienteNombre, anio, mes) {
  if (!clienteNombre?.trim()) throw new Error("Ingresá el nombre del cliente");

  const params = { anio };
  if (mes && mes !== "0") params.mes = mes;

  const [eq, int] = await Promise.all([
    api.get("/servicios/", { ...params, tipo: "equipos" }),
    api.get("/servicios/", { ...params, tipo: "interior" }),
  ]);

  const todos = [...(eq || []), ...(int || [])];
  const q = clienteNombre.trim().toLowerCase();
  const filtrados = todos
    .filter(s => (s.cliente || "").toLowerCase().includes(q))
    .sort((a, b) => {
      const f = (a.fecha || "").localeCompare(b.fecha || "");
      return f !== 0 ? f : (a.hora_programada || "").localeCompare(b.hora_programada || "");
    });

  if (!filtrados.length) throw new Error(`Sin servicios para "${clienteNombre}"`);

  const wb = XS.utils.book_new();

  // ── Hoja principal: listado completo ──
  const cols = ["Fecha", "Hora", "Cliente", "Responsable", "Tipo", "Dispositivo", "Patente", "Localidad", "Estado", "Observaciones"];
  const rows = [cols];
  for (const s of filtrados) {
    rows.push([
      fmtFecha(s.fecha),
      s.hora_programada || "",
      s.cliente || "",
      s.responsable || "",
      s.tipo_servicio || "",
      s.dispositivo || "",
      s.patente || "",
      s.localidad || "",
      s.estado || "",
      s.observaciones || "",
    ]);
  }
  const ws = makeSheet(rows);
  setColWidths(ws, [12, 8, 28, 20, 14, 18, 10, 20, 12, 35]);
  applyRowStyle(ws, 0, cols.length, S_HEADER);
  XS.utils.book_append_sheet(wb, ws, "Servicios");

  // ── Hoja resumen ──
  const byTipo   = {};
  const byEstado = {};
  const byMes    = {};
  for (const s of filtrados) {
    const tipo   = s.tipo_servicio || "Sin tipo";
    const estado = s.estado || "Sin estado";
    const mesNum = s.fecha ? parseInt(s.fecha.split("-")[1]) : 0;
    const mesNom = mesNum ? MESES[mesNum - 1] : "Sin fecha";
    byTipo[tipo]     = (byTipo[tipo] || 0) + 1;
    byEstado[estado] = (byEstado[estado] || 0) + 1;
    byMes[mesNom]    = (byMes[mesNom] || 0) + 1;
  }

  const sumRows = [["Concepto", "Cantidad"]];
  sumRows.push(["Total servicios", filtrados.length]);
  sumRows.push(["", ""]);
  sumRows.push(["— Por tipo de servicio —", ""]);
  for (const [tipo, count] of Object.entries(byTipo)) sumRows.push([tipo, count]);
  sumRows.push(["", ""]);
  sumRows.push(["— Por estado —", ""]);
  for (const [estado, count] of Object.entries(byEstado)) sumRows.push([estado, count]);
  if (mes === "0") {
    sumRows.push(["", ""]);
    sumRows.push(["— Por mes —", ""]);
    for (const [m, count] of Object.entries(byMes)) sumRows.push([m, count]);
  }

  const wsSum = makeSheet(sumRows);
  setColWidths(wsSum, [28, 12]);
  applyRowStyle(wsSum, 0, 2, S_HEADER);
  // Negrita en filas de sección
  for (let r = 1; r < sumRows.length; r++) {
    if (String(sumRows[r][0]).startsWith("—")) {
      applyRowStyle(wsSum, r, 2, S_SUBTOTAL);
    }
  }
  XS.utils.book_append_sheet(wb, wsSum, "Resumen");

  const label     = mes && mes !== "0" ? `${MESES[mes - 1]}_${anio}` : String(anio);
  const safeName  = clienteNombre.trim().replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/g, "").trim().replace(/\s+/g, "_");
  XS.writeFile(wb, `Servicios_${safeName}_${label}.xlsx`);
}

// ── Export 7: Informe de Tickets (Word .docx) ──────────────────────
async function exportarTickets(tickets) {
  if (!tickets.length) throw new Error("Seleccioná al menos un ticket");

  const {
    Document, Packer, Paragraph, Table, TableRow, TableCell,
    TextRun, AlignmentType, WidthType, BorderStyle,
  } = await import("docx");

  const notasArr = await Promise.all(
    tickets.map(t => api.get(`/tareas/${t.id}/notas/`).catch(() => []))
  );

  const TIPO_LABEL  = { tarea: "Tarea", investigacion: "Investigación", bug: "Bug", mejora: "Mejora" };
  const ESTADO_LABEL = { pendiente: "Pendiente", en_progreso: "En Progreso", completada: "Completada" };
  const PRIO_LABEL  = { alta: "Alta", media: "Media", baja: "Baja" };

  const hoy = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

  const BRAND = "2563EB";
  const DARK  = "0F172A";
  const GRAY  = "64748B";
  const LGRAY = "94A3B8";
  const HDRBG = "1E293B";
  const TEXT  = "334155";

  function numStr(n) { return n != null ? `#${String(n).padStart(3, "0")}` : "#---"; }

  function secHeading(num, text) {
    return new Paragraph({
      children: [new TextRun({ text: `${num}. ${text}`, bold: true, size: 26, color: DARK })],
      spacing: { before: 400, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BRAND, space: 6 } },
    });
  }

  function hdrCell(text) {
    return new TableCell({
      shading: { fill: HDRBG, color: "auto" },
      margins: { top: 70, bottom: 70, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: "FFFFFF" })] })],
    });
  }

  function dataCell(text) {
    return new TableCell({
      shading: { fill: "F8FAFC", color: "auto" },
      margins: { top: 70, bottom: 70, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: text || "—", size: 18, color: TEXT })] })],
    });
  }

  function metaTable(t) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
        insideH: { style: BorderStyle.NONE },
        insideV: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
      },
      rows: [
        new TableRow({ children: ["Estado","Tipo","Prioridad","Asignado a","Categoría"].map(hdrCell) }),
        new TableRow({ children: [
          ESTADO_LABEL[t.estado] || t.estado,
          TIPO_LABEL[t.tipo] || t.tipo,
          PRIO_LABEL[t.prioridad] || t.prioridad,
          t.asignado_a, t.categoria,
        ].map(dataCell) }),
      ],
    });
  }

  const ch = [];

  // ── Portada ──
  ch.push(
    new Paragraph({ children: [new TextRun({ text: "App Logic", bold: true, size: 32, color: BRAND })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: "INFORME DE TICKETS", bold: true, size: 52, color: DARK })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: `${tickets.length} ticket${tickets.length !== 1 ? "s" : ""} seleccionado${tickets.length !== 1 ? "s" : ""}`, italics: true, size: 22, color: GRAY })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: `Fecha: ${hoy}`, size: 22, color: GRAY })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
    new Paragraph({ children: [new TextRun({ text: " " })], border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BRAND, space: 4 } }, spacing: { after: 200 } }),
  );

  // ── Sección 1: Resumen ──
  ch.push(secHeading("1", "RESUMEN"));

  const porTipo = {};
  for (const t of tickets) porTipo[t.tipo] = (porTipo[t.tipo] || 0) + 1;

  ch.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Total de tickets: ", bold: true, size: 24, color: DARK }),
        new TextRun({ text: String(tickets.length), bold: true, size: 24, color: BRAND }),
      ],
      spacing: { before: 120, after: 100 },
    }),
    new Table({
      width: { size: 50, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [hdrCell("Tipo"), hdrCell("Cantidad")] }),
        ...Object.entries(porTipo).map(([tipo, count]) =>
          new TableRow({ children: [dataCell(TIPO_LABEL[tipo] || tipo), dataCell(String(count))] })
        ),
      ],
    }),
  );

  // ── Sección 2: Detalle ──
  ch.push(secHeading("2", "DETALLE DE TICKETS"));

  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    const notas = notasArr[i] || [];

    ch.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${numStr(t.numero)}  `, bold: true, size: 28, color: BRAND }),
          new TextRun({ text: t.titulo, bold: true, size: 28, color: DARK }),
        ],
        spacing: { before: 300, after: 120 },
      }),
      metaTable(t),
      new Paragraph({
        children: [
          new TextRun({ text: "Creado: ", bold: true, size: 18, color: GRAY }),
          new TextRun({ text: fmtFecha(t.created_at?.slice(0, 10)) || "—", size: 18, color: TEXT }),
          new TextRun({ text: "     Vencimiento: ", bold: true, size: 18, color: GRAY }),
          new TextRun({ text: fmtFecha(t.fecha_vencimiento) || "Sin fecha", size: 18, color: TEXT }),
        ],
        spacing: { before: 80, after: 80 },
      }),
    );

    if (t.descripcion?.trim()) {
      ch.push(
        new Paragraph({ children: [new TextRun({ text: "Descripción", bold: true, size: 20, color: GRAY })], spacing: { before: 100, after: 40 } }),
        new Paragraph({ children: [new TextRun({ text: t.descripcion, size: 20, color: TEXT })], indent: { left: 200 }, spacing: { after: 100 } }),
      );
    }

    if (notas.length > 0) {
      ch.push(
        new Paragraph({ children: [new TextRun({ text: `Notas  (${notas.length})`, bold: true, size: 20, color: GRAY })], spacing: { before: 140, after: 60 } }),
      );
      for (const nota of notas) {
        const fn = nota.created_at
          ? new Date(nota.created_at).toLocaleString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" })
          : "—";
        ch.push(
          new Paragraph({
            children: [
              new TextRun({ text: nota.cargado_por || "Usuario", bold: true, size: 18, color: BRAND }),
              new TextRun({ text: `  ·  ${fn}`, size: 18, color: LGRAY, italics: true }),
            ],
            indent: { left: 200 },
            spacing: { before: 80, after: 20 },
          }),
          new Paragraph({
            children: [new TextRun({ text: nota.texto, size: 20, color: TEXT })],
            indent: { left: 380 },
            spacing: { after: 100 },
          }),
        );
      }
    } else {
      ch.push(
        new Paragraph({ children: [new TextRun({ text: "Sin notas registradas", size: 18, color: LGRAY, italics: true })], indent: { left: 200 }, spacing: { before: 60, after: 60 } }),
      );
    }

    if (i < tickets.length - 1) {
      ch.push(
        new Paragraph({ children: [new TextRun({ text: " " })], border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0", space: 4 } }, spacing: { before: 200, after: 200 } }),
      );
    }
  }

  // ── Footer ──
  ch.push(
    new Paragraph({ children: [new TextRun({ text: " " })], border: { top: { style: BorderStyle.SINGLE, size: 6, color: BRAND, space: 6 } }, spacing: { before: 400, after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: "Buenos Aires, Argentina", size: 18, color: GRAY })], alignment: AlignmentType.RIGHT, spacing: { after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: hoy, size: 18, color: GRAY })], alignment: AlignmentType.RIGHT }),
  );

  const doc = new Document({
    creator: "App Logic",
    title: "Informe de Tickets",
    sections: [{
      properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } },
      children: ch,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Informe_Tickets_${new Date().toLocaleDateString("sv-SE")}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Página principal ────────────────────────────────────────────────

const EXPORTS = [
  {
    key: "horas",
    icon: "🕐",
    title: "Informe de Personal",
    desc: "Horas trabajadas por equipo + resumen por técnico con ausencias, balance y productividad (servicios/día).",
    fn: (mes, anio) => exportarHoras(mes, anio),
  },
  {
    key: "stock",
    icon: "📦",
    title: "Stock Oficina",
    desc: "Stock actual de la oficina ordenado por categoría.",
    fn: () => exportarStock(),
  },
  {
    key: "servicios",
    icon: "📋",
    title: "Servicios del período",
    desc: "Todos los servicios ordenados por fecha + resumen por responsable.",
    fn: (mes, anio) => exportarServicios(mes, anio),
  },
  {
    key: "clientes",
    icon: "📌",
    title: "Clientes vs Responsables",
    desc: "Tabla cruzada: cuántos servicios atendió cada responsable por cliente.",
    fn: (mes, anio) => exportarClienteResponsable(mes, anio),
  },
];

export default function ExportarPage() {
  const now = new Date();
  const [mes,  setMes]  = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [loading, setLoading] = useState({});
  const [msgs,    setMsgs]    = useState({});

  // — Filtros del export por cliente —
  const [clienteExport,    setClienteExport]    = useState("");
  const [mesExportCliente, setMesExportCliente] = useState("0");
  const [anioExportCliente, setAnioExportCliente] = useState(2026);

  // — Export de tickets (.docx) —
  const [tkEstados,     setTkEstados]     = useState(["completada", "en_progreso"]);
  const [tkDisponibles, setTkDisponibles] = useState(null);   // null = sin cargar
  const [tkSelIds,      setTkSelIds]      = useState(new Set());
  const [tkCargando,    setTkCargando]    = useState(false);
  const [tkBusqueda,    setTkBusqueda]    = useState("");

  const TIPO_LABEL_UI   = { tarea:"Tarea", investigacion:"Investigación", bug:"Bug", mejora:"Mejora" };
  const ESTADO_LABEL_UI = { pendiente:"Pendiente", en_progreso:"En progreso", completada:"Completada" };

  const toggleTkEstado = (e) => {
    setTkEstados(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
    setTkDisponibles(null);
  };

  const cargarTickets = async () => {
    if (!tkEstados.length) return;
    setTkCargando(true);
    setMsgs(m => ({ ...m, tickets: null }));
    try {
      const results = await Promise.all(tkEstados.map(e => api.get(`/tareas/?estado=${e}`)));
      const lista = results.flat().sort((a, b) => (a.numero || 0) - (b.numero || 0));
      setTkDisponibles(lista);
      setTkSelIds(new Set(lista.map(t => t.id)));
    } catch {
      setMsgs(m => ({ ...m, tickets: { ok: false, text: "Error al cargar tickets" } }));
    }
    setTkCargando(false);
  };

  const tkFiltrados = (tkDisponibles || []).filter(t => {
    if (!tkBusqueda.trim()) return true;
    const q = tkBusqueda.toLowerCase();
    return t.titulo?.toLowerCase().includes(q) || String(t.numero).includes(q);
  });

  const toggleTk = (id) => setTkSelIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const todosSeleccionados = tkFiltrados.length > 0 && tkFiltrados.every(t => tkSelIds.has(t.id));
  const toggleTodos = () => {
    if (todosSeleccionados) {
      setTkSelIds(prev => { const n = new Set(prev); tkFiltrados.forEach(t => n.delete(t.id)); return n; });
    } else {
      setTkSelIds(prev => { const n = new Set(prev); tkFiltrados.forEach(t => n.add(t.id)); return n; });
    }
  };

  const runTickets = async () => {
    const seleccionados = (tkDisponibles || []).filter(t => tkSelIds.has(t.id));
    setLoading(l => ({ ...l, tickets: true }));
    setMsgs(m => ({ ...m, tickets: null }));
    try {
      await exportarTickets(seleccionados);
      setMsgs(m => ({ ...m, tickets: { ok: true, text: "Archivo descargado" } }));
    } catch (e) {
      setMsgs(m => ({ ...m, tickets: { ok: false, text: e.message || "Error al exportar" } }));
    }
    setLoading(l => ({ ...l, tickets: false }));
  };

  const run = async (key, fn) => {
    setLoading(l => ({ ...l, [key]: true }));
    setMsgs(m => ({ ...m, [key]: null }));
    try {
      await fn(mes, anio);
      setMsgs(m => ({ ...m, [key]: { ok: true, text: "Archivo descargado" } }));
    } catch (e) {
      setMsgs(m => ({ ...m, [key]: { ok: false, text: e.message || "Error al exportar" } }));
    }
    setLoading(l => ({ ...l, [key]: false }));
  };

  const runCliente = async () => {
    setLoading(l => ({ ...l, cliente: true }));
    setMsgs(m => ({ ...m, cliente: null }));
    try {
      await exportarPorCliente(clienteExport, anioExportCliente, mesExportCliente);
      setMsgs(m => ({ ...m, cliente: { ok: true, text: "Archivo descargado" } }));
    } catch (e) {
      setMsgs(m => ({ ...m, cliente: { ok: false, text: e.message || "Error al exportar" } }));
    }
    setLoading(l => ({ ...l, cliente: false }));
  };

  const fieldStyle = { border:"1.5px solid #e2e8f0", borderRadius:8, padding:"7px 11px", fontSize:13, background:"#f8fafc", color:"#1e293b", outline:"none", fontFamily:"inherit" };
  const labelStyle = { display:"block", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", marginBottom:5 };

  return (
    <div style={{ maxWidth:720, display:"flex", flexDirection:"column", gap:20 }}>
      {/* Header */}
      <div>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#0f172a" }}>Exportar</h1>
        <p style={{ margin:"4px 0 0", fontSize:13, color:"#64748b" }}>Descargá reportes en Excel listos para presentar o enviar por mail.</p>
      </div>

      {/* Selector de período */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"16px 20px", display:"flex", alignItems:"flex-end", gap:16, flexWrap:"wrap" }}>
        <div>
          <label style={labelStyle}>Mes</label>
          <select value={mes} onChange={e => setMes(e.target.value === "" ? "" : +e.target.value)} style={{ ...fieldStyle, minWidth:140 }}>
            <option value="">Todos los meses</option>
            {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Año</label>
          <select value={anio} onChange={e => setAnio(+e.target.value)} style={fieldStyle}>
            <option>2025</option><option>2026</option><option>2027</option>
          </select>
        </div>
        <p style={{ fontSize:11.5, color:"#94a3b8", paddingBottom:2 }}>Período aplicado a todas las exportaciones mensuales</p>
      </div>

      {/* Export cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {EXPORTS.map(exp => (
          <div key={exp.key} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"14px 20px", display:"flex", alignItems:"center", gap:14 }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#bfdbfe"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="#e2e8f0"}
          >
            <span style={{ fontSize:22, flexShrink:0 }}>{exp.icon}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ margin:0, fontSize:14, fontWeight:600, color:"#1e293b" }}>{exp.title}</p>
              <p style={{ margin:"3px 0 0", fontSize:11.5, color:"#64748b" }}>{exp.desc}</p>
              {msgs[exp.key] && (
                <p style={{ margin:"6px 0 0", fontSize:11.5, fontWeight:600, color: msgs[exp.key].ok ? "#16a34a" : "#dc2626" }}>
                  {msgs[exp.key].ok ? "✓ " : "✕ "}{msgs[exp.key].text}
                </p>
              )}
            </div>
            <button onClick={() => run(exp.key, exp.fn)} disabled={loading[exp.key]} style={{
              flexShrink:0, background: loading[exp.key] ? "#93c5fd" : "#2563eb", color:"#fff",
              border:"none", borderRadius:8, padding:"8px 16px", fontSize:12.5, fontWeight:600,
              cursor: loading[exp.key] ? "not-allowed" : "pointer", whiteSpace:"nowrap",
            }}
              onMouseEnter={e=>{ if (!loading[exp.key]) e.currentTarget.style.background="#1d4ed8"; }}
              onMouseLeave={e=>{ if (!loading[exp.key]) e.currentTarget.style.background="#2563eb"; }}
            >
              {loading[exp.key] ? "Exportando…" : "↓ Descargar"}
            </button>
          </div>
        ))}
      </div>

      {/* Export por cliente */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"14px 20px", display:"flex", flexDirection:"column", gap:14 }}
        onMouseEnter={e=>e.currentTarget.style.borderColor="#bfdbfe"}
        onMouseLeave={e=>e.currentTarget.style.borderColor="#e2e8f0"}
      >
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:22 }}>🏢</span>
          <div>
            <p style={{ margin:0, fontSize:14, fontWeight:600, color:"#1e293b" }}>Servicios por Cliente</p>
            <p style={{ margin:"3px 0 0", fontSize:11.5, color:"#64748b" }}>Todos los servicios de un cliente específico. Podés filtrar por año completo o solo un mes.</p>
          </div>
        </div>

        <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
          <div style={{ flex:1, minWidth:200 }}>
            <label style={labelStyle}>Cliente</label>
            <input type="text" placeholder="Ej: La Serenísima, Enel..." value={clienteExport}
              onChange={e => setClienteExport(e.target.value)} onKeyDown={e => e.key === "Enter" && runCliente()}
              style={{ ...fieldStyle, width:"100%", boxSizing:"border-box" }} />
          </div>
          <div>
            <label style={labelStyle}>Mes</label>
            <select value={mesExportCliente} onChange={e => setMesExportCliente(e.target.value)} style={fieldStyle}>
              <option value="0">Todos los meses</option>
              {MESES.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Año</label>
            <select value={anioExportCliente} onChange={e => setAnioExportCliente(+e.target.value)} style={fieldStyle}>
              <option>2025</option><option>2026</option><option>2027</option>
            </select>
          </div>
          <button onClick={runCliente} disabled={loading["cliente"]} style={{
            background: loading["cliente"] ? "#93c5fd" : "#2563eb", color:"#fff",
            border:"none", borderRadius:8, padding:"8px 16px", fontSize:12.5, fontWeight:600,
            cursor: loading["cliente"] ? "not-allowed" : "pointer", whiteSpace:"nowrap", flexShrink:0,
          }}
            onMouseEnter={e=>{ if (!loading["cliente"]) e.currentTarget.style.background="#1d4ed8"; }}
            onMouseLeave={e=>{ if (!loading["cliente"]) e.currentTarget.style.background="#2563eb"; }}
          >
            {loading["cliente"] ? "Exportando…" : "↓ Descargar"}
          </button>
        </div>

        {msgs["cliente"] && (
          <p style={{ margin:0, fontSize:11.5, fontWeight:600, color: msgs["cliente"].ok ? "#16a34a" : "#dc2626" }}>
            {msgs["cliente"].ok ? "✓ " : "✕ "}{msgs["cliente"].text}
          </p>
        )}
      </div>

      {/* Export tickets Word */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"14px 20px", display:"flex", flexDirection:"column", gap:14 }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
          <span style={{ fontSize:22, marginTop:2 }}>📄</span>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontSize:14, fontWeight:600, color:"#1e293b" }}>Informe de Tickets (.docx)</p>
            <p style={{ margin:"3px 0 0", fontSize:11.5, color:"#64748b" }}>Exporta tickets con todas sus notas en formato Word, listo para presentar o enviar.</p>
          </div>
        </div>

        {/* Fila: estados + botón buscar */}
        <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8" }}>Estado</span>
          {[
            { key:"completada",  label:"Completados" },
            { key:"en_progreso", label:"En progreso" },
            { key:"pendiente",   label:"Pendientes"  },
          ].map(opt => (
            <label key={opt.key} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#475569", cursor:"pointer", userSelect:"none" }}>
              <input type="checkbox" checked={tkEstados.includes(opt.key)} onChange={() => toggleTkEstado(opt.key)}
                style={{ width:14, height:14, accentColor:"#2563eb", cursor:"pointer" }} />
              {opt.label}
            </label>
          ))}
          <button onClick={cargarTickets} disabled={tkCargando || !tkEstados.length} style={{
            marginLeft:"auto", background: (!tkEstados.length || tkCargando) ? "#f1f5f9" : "#f0f7ff",
            color: (!tkEstados.length || tkCargando) ? "#94a3b8" : "#2563eb",
            border:"1.5px solid", borderColor: (!tkEstados.length || tkCargando) ? "#e2e8f0" : "#bfdbfe",
            borderRadius:8, padding:"6px 14px", fontSize:12.5, fontWeight:600,
            cursor: (!tkEstados.length || tkCargando) ? "not-allowed" : "pointer", whiteSpace:"nowrap",
          }}>
            {tkCargando ? "Cargando…" : tkDisponibles ? "↺ Recargar" : "Buscar tickets"}
          </button>
        </div>

        {/* Lista de tickets */}
        {tkDisponibles !== null && (
          <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
            {/* Toolbar de la lista */}
            <div style={{ background:"#f8fafc", borderBottom:"1px solid #e2e8f0", padding:"8px 14px", display:"flex", alignItems:"center", gap:10 }}>
              <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", userSelect:"none" }}>
                <input type="checkbox" checked={todosSeleccionados} onChange={toggleTodos}
                  style={{ width:14, height:14, accentColor:"#2563eb", cursor:"pointer" }} />
                <span style={{ fontSize:12, fontWeight:600, color:"#475569" }}>
                  {tkSelIds.size} de {tkDisponibles.length} seleccionados
                </span>
              </label>
              <input value={tkBusqueda} onChange={e => setTkBusqueda(e.target.value)} placeholder="Filtrar…"
                style={{ marginLeft:"auto", border:"1.5px solid #e2e8f0", borderRadius:6, padding:"4px 10px", fontSize:12, outline:"none", background:"#fff", color:"#1e293b", width:160 }} />
            </div>

            {/* Filas de tickets */}
            <div style={{ maxHeight:260, overflowY:"auto" }}>
              {tkFiltrados.length === 0 ? (
                <div style={{ padding:"20px 14px", fontSize:12, color:"#94a3b8", textAlign:"center" }}>
                  {tkDisponibles.length === 0 ? "No hay tickets para los estados seleccionados" : "Sin resultados"}
                </div>
              ) : tkFiltrados.map(t => {
                const sel = tkSelIds.has(t.id);
                const TBADGE = { tarea:{bg:"#f1f5f9",c:"#475569"}, investigacion:{bg:"#eff6ff",c:"#2563eb"}, bug:{bg:"#fef2f2",c:"#dc2626"}, mejora:{bg:"#f5f3ff",c:"#7c3aed"} };
                const bd = TBADGE[t.tipo] || TBADGE.tarea;
                return (
                  <label key={t.id} style={{
                    display:"flex", alignItems:"center", gap:10, padding:"9px 14px",
                    borderBottom:"1px solid #f8fafc", cursor:"pointer",
                    background: sel ? "#fafbff" : "#fff",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = sel ? "#f0f7ff" : "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = sel ? "#fafbff" : "#fff"}
                  >
                    <input type="checkbox" checked={sel} onChange={() => toggleTk(t.id)}
                      style={{ width:14, height:14, accentColor:"#2563eb", cursor:"pointer", flexShrink:0 }} />
                    <span style={{ fontSize:11, fontWeight:700, color:"#94a3b8", fontFamily:"DM Mono, monospace", minWidth:36 }}>
                      {t.numero ? `#${String(t.numero).padStart(3,"0")}` : "#---"}
                    </span>
                    <span style={{ fontSize:13, color:"#1e293b", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {t.titulo}
                    </span>
                    <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:999, background:bd.bg, color:bd.c, flexShrink:0 }}>
                      {TIPO_LABEL_UI[t.tipo] || t.tipo}
                    </span>
                    <span style={{ fontSize:10, color:"#94a3b8", flexShrink:0 }}>
                      {ESTADO_LABEL_UI[t.estado] || t.estado}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Botón descargar */}
        {tkDisponibles !== null && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:12 }}>
            {msgs["tickets"] && (
              <p style={{ margin:0, fontSize:11.5, fontWeight:600, color: msgs["tickets"].ok ? "#16a34a" : "#dc2626" }}>
                {msgs["tickets"].ok ? "✓ " : "✕ "}{msgs["tickets"].text}
              </p>
            )}
            <button onClick={runTickets} disabled={loading["tickets"] || tkSelIds.size === 0} style={{
              background: (loading["tickets"] || tkSelIds.size === 0) ? "#93c5fd" : "#2563eb",
              color:"#fff", border:"none", borderRadius:8, padding:"8px 18px",
              fontSize:12.5, fontWeight:600,
              cursor: (loading["tickets"] || tkSelIds.size === 0) ? "not-allowed" : "pointer",
              whiteSpace:"nowrap",
            }}
              onMouseEnter={e=>{ if (!loading["tickets"] && tkSelIds.size) e.currentTarget.style.background="#1d4ed8"; }}
              onMouseLeave={e=>{ if (!loading["tickets"] && tkSelIds.size) e.currentTarget.style.background="#2563eb"; }}
            >
              {loading["tickets"] ? "Generando…" : `↓ Descargar ${tkSelIds.size} ticket${tkSelIds.size !== 1 ? "s" : ""}`}
            </button>
          </div>
        )}

        {!tkDisponibles && msgs["tickets"] && (
          <p style={{ margin:0, fontSize:11.5, fontWeight:600, color:"#dc2626" }}>✕ {msgs["tickets"].text}</p>
        )}
      </div>
    </div>
  );
}
