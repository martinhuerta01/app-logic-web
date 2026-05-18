"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import * as XLSX from "xlsx";

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

function minsToHoras(mins) {
  if (mins == null || isNaN(mins) || mins <= 0) return 0;
  return Math.round(mins / 6) / 10;
}

function setColWidths(ws, widths) {
  ws["!cols"] = widths.map(w => ({ wch: w }));
}

// ── Export 1: Horas Trabajadas ──────────────────────────────────────
async function exportarHoras(mes, anio) {
  const data = await api.get("/movimientos-camioneta/");
  const filtered = data.filter(m => {
    const [y, mo] = (m.fecha || "").split("-");
    return parseInt(y) === parseInt(anio) && parseInt(mo) === parseInt(mes);
  });
  if (!filtered.length) throw new Error("Sin datos para el período seleccionado");

  const byEquipo = {};
  for (const mov of filtered) {
    const eq = mov.equipos?.nombre || "Sin equipo";
    if (!byEquipo[eq]) byEquipo[eq] = [];
    byEquipo[eq].push(mov);
  }

  const wb = XLSX.utils.book_new();
  const summaryRows = [["Equipo", "Días trabajados", "Total horas", "Promedio hs/día"]];

  for (const [eq, movs] of Object.entries(byEquipo)) {
    const sorted = [...movs].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const rows = [["Fecha", "Día", "Hora salida", "Hora llegada", "Horas", "Punto inicio", "Punto fin", "Cargado por"]];
    let totalMins = 0;

    for (const m of sorted) {
      const salidaMins = parseMins(m.hora_salida);
      const llegadaMins = parseMins(m.hora_llegada);
      const mins = (salidaMins != null && llegadaMins != null) ? llegadaMins - salidaMins : null;
      const horas = mins != null ? minsToHoras(mins) : "";
      if (mins != null && mins > 0) totalMins += mins;

      const d = new Date(m.fecha + "T12:00:00Z");
      const dias = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
      rows.push([
        fmtFecha(m.fecha),
        dias[d.getUTCDay()],
        m.hora_salida || "",
        m.hora_llegada || "",
        horas,
        m.punto_inicio || "",
        m.punto_fin || "",
        m.cargado_por || "",
      ]);
    }

    const totalHs = minsToHoras(totalMins);
    rows.push(["TOTAL", "", "", "", totalHs, "", "", ""]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    setColWidths(ws, [12, 6, 12, 12, 8, 22, 22, 16]);
    XLSX.utils.book_append_sheet(wb, ws, eq.slice(0, 31));
    summaryRows.push([eq, movs.length, totalHs, movs.length > 0 ? Math.round(totalHs / movs.length * 10) / 10 : 0]);
  }

  const wsSum = XLSX.utils.aoa_to_sheet(summaryRows);
  setColWidths(wsSum, [22, 16, 14, 18]);
  XLSX.utils.book_append_sheet(wb, wsSum, "Resumen");
  wb.SheetNames = ["Resumen", ...wb.SheetNames.filter(s => s !== "Resumen")];

  XLSX.writeFile(wb, `Horas_Trabajadas_${MESES[mes - 1]}_${anio}.xlsx`);
}

// ── Export 2: Productividad ─────────────────────────────────────────
async function exportarProductividad(mes, anio) {
  const data = await api.get("/estadisticas/reporte-cruzado", { mes, anio });
  if (!data.tecnicos?.length) throw new Error("Sin datos para el período seleccionado");

  const wb = XLSX.utils.book_new();
  const rows = [["Técnico", "Equipo", "Días presentes", "Servicios realizados", "Svc/día", "Horas trabajadas", "Balance"]];

  const byEquipo = {};
  for (const t of data.tecnicos) {
    const eq = t.equipo || "Sin equipo";
    if (!byEquipo[eq]) byEquipo[eq] = [];
    byEquipo[eq].push(t);
  }

  for (const [eq, tecnicos] of Object.entries(byEquipo)) {
    let eqSvcs = 0, eqHoras = 0, eqDias = 0;
    for (const t of tecnicos) {
      rows.push([t.nombre, eq, t.dias_presentes, t.servicios_realizados, t.servicios_por_dia, t.horas_trabajadas, t.balance]);
      eqSvcs += t.servicios_realizados || 0;
      eqHoras += t.horas_trabajadas || 0;
      eqDias += t.dias_presentes || 0;
    }
    rows.push([`SUBTOTAL ${eq}`, "", eqDias, eqSvcs, eqDias > 0 ? Math.round(eqSvcs / eqDias * 10) / 10 : 0, Math.round(eqHoras * 10) / 10, ""]);
    rows.push([]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  setColWidths(ws, [24, 18, 16, 20, 10, 18, 12]);
  XLSX.utils.book_append_sheet(wb, ws, "Productividad");

  if (data.dias?.length) {
    const detRows = [["Fecha", "Equipo", "Técnico", "Servicios", "Horas GR/LCH", "Horas total", "% GR/LCH"]];
    for (const d of data.dias) {
      detRows.push([fmtFecha(d.fecha), d.equipo, d.tecnico, d.servicios, d.horas_gr, d.horas_total, d.pct_gr]);
    }
    const wsDet = XLSX.utils.aoa_to_sheet(detRows);
    setColWidths(wsDet, [12, 18, 24, 12, 14, 12, 10]);
    XLSX.utils.book_append_sheet(wb, wsDet, "Detalle días");
  }

  XLSX.writeFile(wb, `Productividad_${MESES[mes - 1]}_${anio}.xlsx`);
}

// ── Export 3: Stock Actual ──────────────────────────────────────────
async function exportarStock() {
  const data = await api.get("/stock/actual/");
  if (!data?.length) throw new Error("No hay datos de stock");

  const byUbic = {};
  for (const item of data) {
    const ub = item.ubicaciones?.nombre || "Sin ubicación";
    if (!byUbic[ub]) byUbic[ub] = [];
    byUbic[ub].push(item);
  }

  const wb = XLSX.utils.book_new();

  const allRows = [["Ubicación", "Código", "Descripción", "Categoría", "Cantidad"]];
  const sortedAll = [...data].sort((a, b) => {
    const ub = (a.ubicaciones?.nombre || "").localeCompare(b.ubicaciones?.nombre || "");
    if (ub !== 0) return ub;
    return (a.productos?.codigo || "").localeCompare(b.productos?.codigo || "");
  });
  for (const item of sortedAll) {
    allRows.push([item.ubicaciones?.nombre || "", item.productos?.codigo || "", item.productos?.descripcion || "", item.productos?.categoria || "", item.cantidad]);
  }
  const wsAll = XLSX.utils.aoa_to_sheet(allRows);
  setColWidths(wsAll, [20, 12, 38, 18, 10]);
  XLSX.utils.book_append_sheet(wb, wsAll, "Todo");

  for (const [ub, items] of Object.entries(byUbic)) {
    const sorted = [...items].sort((a, b) => {
      const cat = (a.productos?.categoria || "").localeCompare(b.productos?.categoria || "");
      return cat !== 0 ? cat : (a.productos?.codigo || "").localeCompare(b.productos?.codigo || "");
    });
    const rows = [["Código", "Descripción", "Categoría", "Cantidad"]];
    for (const item of sorted) {
      rows.push([item.productos?.codigo || "", item.productos?.descripcion || "", item.productos?.categoria || "", item.cantidad]);
    }
    rows.push(["", "", "TOTAL", sorted.reduce((s, i) => s + (i.cantidad || 0), 0)]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    setColWidths(ws, [12, 38, 18, 10]);
    XLSX.utils.book_append_sheet(wb, ws, ub.slice(0, 31));
  }

  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
  XLSX.writeFile(wb, `Stock_Actual_${hoy}.xlsx`);
}

// ── Export 4: Servicios ─────────────────────────────────────────────
async function exportarServicios(mes, anio) {
  const data = await api.get("/servicios/", { mes, anio });
  if (!data?.length) throw new Error("Sin datos para el período seleccionado");

  const sorted = [...data].sort((a, b) => {
    const f = (a.fecha || "").localeCompare(b.fecha || "");
    return f !== 0 ? f : (a.hora_programada || "").localeCompare(b.hora_programada || "");
  });

  const wb = XLSX.utils.book_new();

  const rows = [["Fecha", "Hora", "Responsable", "Cliente", "Tipo", "Dispositivo", "Patente", "Localidad", "Estado", "Observaciones"]];
  for (const s of sorted) {
    rows.push([fmtFecha(s.fecha), s.hora_programada || "", s.responsable || "", s.cliente || "", s.tipo_servicio || "", s.dispositivo || "", s.patente || "", s.localidad || "", s.estado || "", s.observaciones || ""]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  setColWidths(ws, [12, 8, 20, 28, 14, 18, 10, 20, 12, 35]);
  XLSX.utils.book_append_sheet(wb, ws, "Servicios");

  // Summary by responsable
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
  const wsSum = XLSX.utils.aoa_to_sheet(sumRows);
  setColWidths(wsSum, [24, 8, 12, 12, 12]);
  XLSX.utils.book_append_sheet(wb, wsSum, "Por responsable");

  XLSX.writeFile(wb, `Servicios_${MESES[mes - 1]}_${anio}.xlsx`);
}

// ── Export 5: Cliente vs Responsables ──────────────────────────────
async function exportarClienteResponsable(mes, anio) {
  const data = await api.get("/servicios/", { mes, anio });
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

  const wb = XLSX.utils.book_new();

  // Cross table
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

  const ws = XLSX.utils.aoa_to_sheet(rows);
  setColWidths(ws, [28, ...responsables.map(() => 16), 10]);
  XLSX.utils.book_append_sheet(wb, ws, "Tabla cruzada");

  // Detail sheet
  const detRows = [["Cliente", "Responsable", "Servicios"]];
  for (const cli of clientes) {
    for (const resp of responsables) {
      const val = pivot[cli]?.[resp];
      if (val) detRows.push([cli, resp, val]);
    }
  }
  const wsDet = XLSX.utils.aoa_to_sheet(detRows);
  setColWidths(wsDet, [28, 22, 12]);
  XLSX.utils.book_append_sheet(wb, wsDet, "Detalle");

  XLSX.writeFile(wb, `Clientes_vs_Responsables_${MESES[mes - 1]}_${anio}.xlsx`);
}

// ── Página principal ────────────────────────────────────────────────

const EXPORTS = [
  {
    key: "horas",
    icon: "🕐",
    title: "Horas Trabajadas",
    desc: "Detalle diario por equipo + resumen. Una hoja por equipo.",
    needsMes: true,
    fn: (mes, anio) => exportarHoras(mes, anio),
  },
  {
    key: "productividad",
    icon: "📊",
    title: "Productividad",
    desc: "Servicios, horas y balance por técnico y equipo.",
    needsMes: true,
    fn: (mes, anio) => exportarProductividad(mes, anio),
  },
  {
    key: "stock",
    icon: "📦",
    title: "Stock Actual",
    desc: "Stock de todas las ubicaciones. Una hoja por ubicación + hoja resumen.",
    needsMes: false,
    fn: () => exportarStock(),
  },
  {
    key: "servicios",
    icon: "📋",
    title: "Servicios del mes",
    desc: "Todos los servicios ordenados por fecha + resumen por responsable.",
    needsMes: true,
    fn: (mes, anio) => exportarServicios(mes, anio),
  },
  {
    key: "clientes",
    icon: "📌",
    title: "Clientes vs Responsables",
    desc: "Tabla cruzada: cuántos servicios atendió cada responsable por cliente.",
    needsMes: true,
    fn: (mes, anio) => exportarClienteResponsable(mes, anio),
  },
];

export default function ExportarPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(2026);
  const [loading, setLoading] = useState({});
  const [msgs, setMsgs] = useState({});

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

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Exportar</h1>
        <p className="text-sm text-slate-500 mt-1">Descargá reportes en Excel listos para presentar o enviar por mail.</p>
      </div>

      {/* Period selector */}
      <div className="flex items-end gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Mes</label>
          <select value={mes} onChange={e => setMes(+e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[140px]">
            {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Año</label>
          <select value={anio} onChange={e => setAnio(+e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option>2025</option><option>2026</option><option>2027</option>
          </select>
        </div>
        <p className="text-xs text-slate-400 pb-2">Período aplicado a todas las exportaciones mensuales</p>
      </div>

      {/* Export cards */}
      <div className="space-y-3">
        {EXPORTS.map(exp => (
          <div key={exp.key}
            className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-indigo-200 transition">
            <span className="text-2xl shrink-0">{exp.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800">{exp.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{exp.desc}</p>
              {msgs[exp.key] && (
                <p className={`text-xs mt-1.5 font-medium ${msgs[exp.key].ok ? "text-green-600" : "text-red-600"}`}>
                  {msgs[exp.key].ok ? "✓ " : "✕ "}{msgs[exp.key].text}
                </p>
              )}
            </div>
            <button
              onClick={() => run(exp.key, exp.fn)}
              disabled={loading[exp.key]}
              className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap">
              {loading[exp.key] ? "Exportando…" : "⬇ Descargar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
