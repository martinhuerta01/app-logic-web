"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line } from "recharts";

const ESTADO_COLOR = {
  REALIZADO:  { bg: "bg-green-100  text-green-700",  dot: "bg-green-500"  },
  CONFIRMADO: { bg: "bg-blue-100   text-blue-700",   dot: "bg-blue-500"   },
  PENDIENTE:  { bg: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  SUSPENDIDO: { bg: "bg-red-100    text-red-700",    dot: "bg-red-500"    },
};

const PIE_COLORS = {
  REALIZADO:  "#22c55e",
  CONFIRMADO: "#3b82f6",
  PENDIENTE:  "#eab308",
  SUSPENDIDO: "#ef4444",
};

// ── Helpers de fecha (T12:00:00Z evita edge-cases de timezone) ──────
const toUTC   = (s) => new Date(s + "T12:00:00Z");
const toStr   = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = toUTC(s); d.setUTCDate(d.getUTCDate() + n); return toStr(d); };
const addMonths = (s, n) => { const d = toUTC(s); d.setUTCMonth(d.getUTCMonth() + n); return toStr(d); };
const addYears  = (s, n) => { const d = toUTC(s); d.setUTCFullYear(d.getUTCFullYear() + n); return toStr(d); };

function getMondayOfWeek(s) {
  const d = toUTC(s);
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return toStr(d);
}

const MESES_CORTOS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MESES_LARGOS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function calcPeriodoInfo(periodo, refDate) {
  const d   = toUTC(refDate);
  const anio = d.getUTCFullYear();
  const mes  = d.getUTCMonth() + 1;

  if (periodo === "dia") {
    const label = new Date(refDate + "T12:00:00Z").toLocaleDateString("es-AR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    return { label, fechas: [refDate] };
  }
  if (periodo === "semana") {
    const lunes   = getMondayOfWeek(refDate);
    const viernes = addDays(lunes, 4);
    const lD = toUTC(lunes), vD = toUTC(viernes);
    const lM = lD.getUTCMonth(), vM = vD.getUTCMonth();
    const label = lM === vM
      ? `${lD.getUTCDate()} - ${vD.getUTCDate()} de ${MESES_LARGOS[lM]} ${lD.getUTCFullYear()}`
      : `${lD.getUTCDate()} ${MESES_CORTOS[lM]} - ${vD.getUTCDate()} ${MESES_CORTOS[vM]} ${vD.getUTCFullYear()}`;
    const fechas = [lunes, addDays(lunes,1), addDays(lunes,2), addDays(lunes,3), viernes];
    return { label, lunes, viernes, fechas };
  }
  if (periodo === "mes") {
    return { label: `${MESES_LARGOS[mes - 1]} ${anio}`, mes, anio };
  }
  return { label: String(anio), anio };
}

function navRefDate(periodo, refDate, dir) {
  if (periodo === "dia")    return addDays(refDate, dir);
  if (periodo === "semana") return addDays(getMondayOfWeek(refDate), dir * 7);
  if (periodo === "mes")    return addMonths(refDate, dir);
  return addYears(refDate, dir);
}

function isNextFuture(periodo, refDate, hoy) {
  const next = navRefDate(periodo, refDate, +1);
  if (periodo === "dia")    return next > hoy;
  if (periodo === "semana") return getMondayOfWeek(next) > getMondayOfWeek(hoy);
  if (periodo === "mes") {
    const n = toUTC(next);
    const h = toUTC(hoy);
    return n.getUTCFullYear() > h.getUTCFullYear() ||
      (n.getUTCFullYear() === h.getUTCFullYear() && n.getUTCMonth() > h.getUTCMonth());
  }
  return toUTC(next).getUTCFullYear() > toUTC(hoy).getUTCFullYear();
}

// ── DASHBOARD DE ESTADÍSTICAS ─────────────────────────────────────
function DashboardEstadisticas() {
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });

  const [periodo,  setPeriodo]  = useState("mes");
  const [refDate,  setRefDate]  = useState(hoy);
  const [servicios, setServicios] = useState([]);
  const [cargando,  setCargando]  = useState(true);

  useEffect(() => {
    const info = calcPeriodoInfo(periodo, refDate);
    const cargar = async () => {
      setCargando(true);
      try {
        let svcs = [];
        if (periodo === "dia") {
          const [eq, int] = await Promise.all([
            api.get("/servicios/", { fecha: info.fechas[0], tipo: "equipos"  }),
            api.get("/servicios/", { fecha: info.fechas[0], tipo: "interior" }),
          ]);
          svcs = [...(eq||[]), ...(int||[])];

        } else if (periodo === "semana") {
          // Puede abarcar dos meses — deduplico por id
          const meses = new Set();
          [info.lunes, info.viernes].forEach(f => {
            const dd = toUTC(f);
            meses.add(`${dd.getUTCFullYear()}-${dd.getUTCMonth()+1}`);
          });
          const fetches = [];
          for (const key of meses) {
            const [y, m] = key.split("-");
            fetches.push(api.get("/servicios/", { mes: m, anio: y, tipo: "equipos"  }));
            fetches.push(api.get("/servicios/", { mes: m, anio: y, tipo: "interior" }));
          }
          const results = await Promise.all(fetches);
          const all  = results.flat().filter(Boolean);
          const seen = new Set();
          svcs = all
            .filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; })
            .filter(s => info.fechas.includes(s.fecha));

        } else if (periodo === "mes") {
          const [eq, int] = await Promise.all([
            api.get("/servicios/", { mes: info.mes, anio: info.anio, tipo: "equipos"  }),
            api.get("/servicios/", { mes: info.mes, anio: info.anio, tipo: "interior" }),
          ]);
          svcs = [...(eq||[]), ...(int||[])];

        } else {
          const [eq, int] = await Promise.all([
            api.get("/servicios/", { anio: info.anio, tipo: "equipos"  }),
            api.get("/servicios/", { anio: info.anio, tipo: "interior" }),
          ]);
          svcs = [...(eq||[]), ...(int||[])];
        }
        setServicios(svcs);
      } catch { setServicios([]); }
      finally { setCargando(false); }
    };
    cargar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, refDate]);

  const info       = calcPeriodoInfo(periodo, refDate);
  const total      = servicios.length;
  const realizados = servicios.filter(s => s.estado === "REALIZADO").length;
  const sinCerrar  = servicios.filter(s => s.estado === "PENDIENTE" || s.estado === "CONFIRMADO").length;
  const pct        = total > 0 ? Math.round(realizados / total * 100) : 0;
  const instalaciones = servicios.filter(s => s.tipo_servicio === "INSTALACION").length;
  const revisiones    = servicios.filter(s => s.tipo_servicio === "REVISION").length;

  // ── Datos del gráfico de barras ─────────────────────────────────
  let barData = [];
  let barTitle = "";

  if (periodo === "dia") {
    const tipos = {};
    servicios.forEach(s => { const t = s.tipo_servicio || "Otro"; tipos[t] = (tipos[t]||0)+1; });
    barData  = Object.entries(tipos).map(([label, servicios]) => ({ label, servicios }));
    barTitle = "Servicios por tipo";
  } else if (periodo === "semana") {
    const DIAS = ["Lun","Mar","Mié","Jue","Vie"];
    barData  = info.fechas.map((f, i) => ({ label: DIAS[i], servicios: servicios.filter(s => s.fecha === f).length }));
    barTitle = `Semana ${info.label}`;
  } else if (periodo === "mes") {
    const diasEnMes = new Date(info.anio, info.mes, 0).getDate();
    const hoyDia    = periodo === "mes" && info.anio === parseInt(hoy.split("-")[0]) && info.mes === parseInt(hoy.split("-")[1])
      ? parseInt(hoy.split("-")[2])
      : diasEnMes;
    barData = Array.from({ length: hoyDia }, (_, i) => {
      const dia = i + 1;
      const f   = `${info.anio}-${String(info.mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
      return { label: String(dia), servicios: servicios.filter(s => s.fecha === f).length };
    });
    barTitle = `Servicios por día — ${info.label}`;
  } else {
    const hoyAnio = parseInt(hoy.split("-")[0]);
    const hoyMes  = parseInt(hoy.split("-")[1]);
    const limite  = info.anio === hoyAnio ? hoyMes : 12;
    barData  = MESES_CORTOS.slice(0, limite).map((label, i) => ({
      label,
      servicios: servicios.filter(s => {
        if (!s.fecha) return false;
        const [y, m] = s.fecha.split("-");
        return parseInt(y) === info.anio && parseInt(m) === i + 1;
      }).length,
    }));
    barTitle = `Servicios por mes — ${info.anio}`;
  }

  // ── Donut ───────────────────────────────────────────────────────
  const estadoCount = {};
  servicios.forEach(s => { estadoCount[s.estado] = (estadoCount[s.estado]||0)+1; });
  const donutData = Object.entries(estadoCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ── Tabla de servicios ──────────────────────────────────────────
  const tablaServicios = periodo === "dia"
    ? [...servicios].sort((a, b) => (b.id||0) - (a.id||0))
    : [...servicios]
        .sort((a, b) => (b.fecha||"").localeCompare(a.fecha||"") || (b.id||0) - (a.id||0))
        .slice(0, 8);

  const PERIODOS = [
    { key: "dia",    label: "Día"    },
    { key: "semana", label: "Semana" },
    { key: "mes",    label: "Mes"    },
    { key: "anio",   label: "Año"    },
  ];

  return (
    <div className="space-y-6">

      {/* Selector de período + navegación */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {PERIODOS.map(p => (
            <button key={p.key}
              onClick={() => { setPeriodo(p.key); setRefDate(hoy); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                periodo === p.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setRefDate(navRefDate(periodo, refDate, -1))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm transition">
            ←
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-52 text-center capitalize">
            {info.label}
          </span>
          <button onClick={() => setRefDate(navRefDate(periodo, refDate, +1))}
            disabled={isNextFuture(periodo, refDate, hoy)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm transition disabled:opacity-30 disabled:cursor-not-allowed">
            →
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="text-slate-400 text-sm">Cargando datos…</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total servicios",
                value: total,
                gradient: "bg-gradient-to-br from-indigo-500 to-violet-600",
                sub: info.label,
              },
              {
                label: "Realizados",
                value: realizados,
                gradient: "bg-gradient-to-br from-emerald-400 to-teal-600",
                sub: total > 0 ? `${pct}% del período` : "—",
              },
              {
                label: "Sin cerrar",
                value: sinCerrar,
                gradient: sinCerrar > 0
                  ? "bg-gradient-to-br from-amber-400 to-orange-500"
                  : "bg-gradient-to-br from-slate-400 to-slate-600",
                sub: "Pendientes + Confirmados",
              },
              {
                label: "Instalaciones",
                value: instalaciones,
                gradient: "bg-gradient-to-br from-sky-400 to-indigo-500",
                sub: `${revisiones} revisiones`,
              },
            ].map(k => (
              <div key={k.label}
                className={`${k.gradient} rounded-xl shadow-md p-5 text-white`}>
                <p className="text-xs opacity-80 leading-tight">{k.label}</p>
                <p className="text-3xl font-bold leading-tight mt-0.5">{k.value}</p>
                <p className="text-xs opacity-70 mt-0.5 truncate">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">{barTitle}</h2>
              {barData.length === 0 || barData.every(d => d.servicios === 0) ? (
                <p className="text-slate-400 text-sm">Sin servicios en el período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip formatter={(v) => [`${v} servicio${v !== 1 ? "s" : ""}`, ""]} />
                    <Bar dataKey="servicios" fill="#6366f1" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Distribución de estados</h2>
              {donutData.length === 0 ? (
                <p className="text-slate-400 text-sm">Sin datos.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%"
                        innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                        {donutData.map((d, i) => (
                          <Cell key={i} fill={PIE_COLORS[d.name] || "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} servicios`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {donutData.map(d => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: PIE_COLORS[d.name] || "#94a3b8" }} />
                          <span className="text-slate-600">{d.name}</span>
                        </div>
                        <span className="font-semibold text-slate-700">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tabla de servicios */}
          {servicios.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">
                  {periodo === "dia" ? "Todos los servicios del día" : "Últimos servicios del período"}
                </h2>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                    <th className="text-left px-5 py-2.5">Fecha</th>
                    <th className="text-left px-5 py-2.5">Responsable</th>
                    <th className="text-left px-5 py-2.5">Cliente</th>
                    <th className="text-left px-5 py-2.5">Tipo</th>
                    <th className="text-left px-5 py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {tablaServicios.map((s, i) => {
                    const ec = ESTADO_COLOR[s.estado] || { bg: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
                    return (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-5 py-2.5 font-mono">{s.fecha?.split("-").reverse().join("/")}</td>
                        <td className="px-5 py-2.5 font-medium">{s.responsable || "—"}</td>
                        <td className="px-5 py-2.5 text-slate-600 max-w-[140px] truncate">{s.cliente || "—"}</td>
                        <td className="px-5 py-2.5 text-slate-600">
                          {s.tipo_servicio === "-" ? "FERIADO" : (s.tipo_servicio || "—")}
                        </td>
                        <td className="px-5 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ec.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${ec.dot}`} />
                            {s.estado || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {servicios.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-10 text-center text-slate-400 text-sm">
              Sin servicios registrados en este período.
            </div>
          )}
        </>
      )}
    </div>
  );
}

const COLORES = ["#1e3a8a", "#0f766e", "#b45309", "#7c3aed", "#dc2626", "#059669", "#d97706", "#4f46e5"];

function calcHoras(inicio, fin) {
  if (!inicio || !fin) return null;
  const parse = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const diff = parse(fin) - parse(inicio);
  return diff > 0 ? +(diff / 60).toFixed(2) : null;
}

function fmtHM(h, signed = false) {
  if (h === null || h === undefined || isNaN(h)) return "—";
  const neg = h < 0;
  const abs = Math.abs(h);
  const hh = Math.floor(abs);
  const mm = Math.round((abs - hh) * 60);
  const str = `${hh}:${String(mm).padStart(2, "0")}`;
  if (signed) return (neg ? "-" : "+") + str;
  return str;
}

function fechaMatch(fecha, mes, anio) {
  if (!fecha) return false;
  const [y, m] = fecha.split("-");
  if (anio && y !== String(anio)) return false;
  if (mes && m !== String(mes).padStart(2, "0")) return false;
  return true;
}

// Normaliza para agrupar: case-insensitive, sin acentos, sin separador " / ", sin espacios extra
const normKey = s => (s || "Sin cliente")
  .trim()
  .toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/\s*\/\s*/g, " ")
  .replace(/\s+/g, " ")
  .trim();
// Muestra la primera letra de cada palabra en mayúscula
const titleCase = s => s.replace(/\b\w/g, c => c.toUpperCase());

const MESES_NOMBRES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const FiltrosMesAnio = ({ mes, setMes, anio, setAnio, onCalcular, label = "Calcular" }) => (
  <div className="flex items-end gap-3">
    <div>
      <label className="block text-xs text-slate-500 mb-1">Mes</label>
      <select value={mes} onChange={e => setMes(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
        <option value="">Todos</option>
        {MESES_NOMBRES.map((nombre, i) => <option key={i+1} value={i+1}>{nombre}</option>)}
      </select>
    </div>
    <div>
      <label className="block text-xs text-slate-500 mb-1">Año</label>
      <select value={anio} onChange={e => setAnio(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
        <option>2025</option><option>2026</option><option>2027</option>
      </select>
    </div>
    <button onClick={onCalcular} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
      {label}
    </button>
  </div>
);

// ─── HORAS TRABAJADAS ─────────────────────────────────────────────

function TablaEquipoHoras({ nombre, filas }) {
  const totalHoras = +filas.reduce((a, f) => a + (f.horas ?? 0), 0).toFixed(1);
  const totalBase = filas.length * 8;
  const totalBalance = +(totalHoras - totalBase).toFixed(1);
  const conTecnicos = filas.some(f => f.tecnicos?.length > 0);

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">{nombre}</h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
              <th className="text-left px-4 py-3">Día</th>
              <th className="text-left px-4 py-3">Hora salida</th>
              <th className="text-left px-4 py-3">Hora llegada</th>
              <th className="text-left px-4 py-3">Horas trabajadas</th>
              <th className="text-left px-4 py-3">Horas base (8h)</th>
              <th className="text-left px-4 py-3">Balance</th>
              {conTecnicos && <th className="text-left px-4 py-3">Técnicos</th>}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr><td colSpan={conTecnicos ? 7 : 6} className="px-4 py-4 text-slate-400 text-xs">Sin movimientos registrados</td></tr>
            ) : (
              <>
                {filas.map((f, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-xs font-medium">{f.dia}</td>
                    <td className="px-4 py-2.5 text-xs">{f.hora_salida || "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{f.hora_llegada || "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{fmtHM(f.horas)}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">8:00</td>
                    <td className="px-4 py-2.5 text-xs">
                      {f.balance !== null
                        ? <span className={`font-semibold ${f.balance >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtHM(f.balance, true)}</span>
                        : "—"}
                    </td>
                    {conTecnicos && (
                      <td className="px-4 py-2.5">
                        {f.tecnicos?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {f.tecnicos.map((n, j) => (
                              <span key={j} className={`text-xs px-2 py-0.5 rounded-full ${f.esDiaNormal ? "bg-slate-100 text-slate-500" : "bg-indigo-50 text-indigo-700 font-medium"}`}>{n}</span>
                            ))}
                          </div>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                    )}
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-xs">
                  <td className="px-4 py-3 text-slate-700">TOTAL ({filas.length} días)</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-blue-700">{fmtHM(totalHoras)}</td>
                  <td className="px-4 py-3 text-slate-500">8:00 × {filas.length}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${totalBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fmtHM(totalBalance, true)}
                    </span>
                  </td>
                  {conTecnicos && <td className="px-4 py-3"></td>}
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TIPOS_JUSTIFICADOS = ["Médica", "Vacaciones", "Personal"];

function diasEnRango(desde, hasta, mes, anio) {
  const d1 = new Date(desde + "T12:00:00Z");
  const d2 = new Date(hasta + "T12:00:00Z");
  let count = 0;
  for (let d = new Date(d1); d <= d2; d.setUTCDate(d.getUTCDate() + 1)) {
    const f = d.toISOString().slice(0, 10);
    if (fechaMatch(f, mes, anio)) count++;
  }
  return count;
}

function HorasTrabajadas() {
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("2026");
  const [porEquipo, setPorEquipo] = useState({});
  const [porTecnico, setPorTecnico] = useState({});
  const [error, setError] = useState("");

  const calcular = async () => {
    setError("");
    try {
      const [movs, eqs, tecDirectorio, ausencias] = await Promise.all([
        api.get("/movimientos-camioneta/"),
        api.get("/equipos/"),
        api.get("/directorio/tecnicos"),
        api.get("/jornadas/ausencias/"),
      ]);
      const filtrados = movs.filter(m => fechaMatch(m.fecha, mes, anio));
      const agrupado = {};
      for (const eq of eqs) agrupado[eq.nombre] = [];

      // Mapa equipo_id → nombres de técnicos por defecto
      const tecsPorEquipo = {};
      for (const tec of tecDirectorio) {
        const eqId = String(tec.equipo_id || tec.equipos?.id || "");
        if (!eqId) continue;
        if (!tecsPorEquipo[eqId]) tecsPorEquipo[eqId] = [];
        tecsPorEquipo[eqId].push(tec.nombre);
      }

      const tecMap = {};

      for (const m of filtrados) {
        const eq = eqs.find(e => String(e.id) === String(m.equipo_id)) || m.equipos;
        const nombre = eq?.nombre || "—";
        if (!agrupado[nombre]) agrupado[nombre] = [];
        const h = calcHoras(m.hora_salida?.slice(0, 5), m.hora_llegada?.slice(0, 5));

        const tjPresentes = (m.tecnicos_jornada || []).filter(t => t.presente);
        const esDiaNormal = tjPresentes.length === 0;

        const presentes = esDiaNormal
          ? (tecsPorEquipo[String(m.equipo_id)] || [])
          : tjPresentes.map(t => t.empleados?.nombre || t.tecnico_id);

        agrupado[nombre].push({
          fecha: m.fecha,
          dia: m.fecha,
          hora_salida: m.hora_salida?.slice(0, 5) || null,
          hora_llegada: m.hora_llegada?.slice(0, 5) || null,
          horas: h !== null ? +h.toFixed(1) : null,
          balance: h !== null ? +(h - 8).toFixed(1) : null,
          tecnicos: presentes,
          esDiaNormal,
        });

        for (const nombreTec of presentes) {
          if (!tecMap[nombreTec]) tecMap[nombreTec] = { nombre: nombreTec, dias: 0, minutos: 0, ausencias: [] };
          tecMap[nombreTec].dias++;
          if (h !== null) tecMap[nombreTec].minutos += Math.round(h * 60);
        }
      }

      // Acreditar ausencias justificadas
      for (const aus of ausencias) {
        if (!TIPOS_JUSTIFICADOS.includes(aus.tipo_licencia)) continue;
        const nombre = aus.nombre;
        const dias = diasEnRango(aus.fecha_desde, aus.fecha_hasta, mes, anio);
        if (!dias) continue;
        if (!tecMap[nombre]) tecMap[nombre] = { nombre, dias: 0, minutos: 0, ausencias: [] };
        tecMap[nombre].dias += dias;
        tecMap[nombre].minutos += dias * 8 * 60;
        tecMap[nombre].ausencias.push({ tipo: aus.tipo_licencia, dias, desde: aus.fecha_desde, hasta: aus.fecha_hasta });
      }

      for (const nombre of Object.keys(agrupado)) {
        agrupado[nombre].sort((a, b) => a.fecha.localeCompare(b.fecha));
      }
      setPorEquipo(agrupado);
      setPorTecnico(tecMap);
    } catch { setError("Error al calcular horas. Verificá la conexión con el servidor."); }
  };

  const equipos = Object.keys(porEquipo);
  const tecnicos = Object.values(porTecnico);

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
      <FiltrosMesAnio mes={mes} setMes={setMes} anio={anio} setAnio={setAnio} onCalcular={calcular} />
      {equipos.length === 0
        ? <p className="text-slate-400 text-sm">Sin datos — cargá movimientos en Personal &gt; Horario Técnico</p>
        : equipos.map(nombre => (
            <TablaEquipoHoras key={nombre} nombre={nombre} filas={porEquipo[nombre]} />
          ))
      }
      {tecnicos.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Resumen por técnico</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
                  <th className="text-left px-4 py-3">Técnico</th>
                  <th className="text-left px-4 py-3">Días efectivos</th>
                  <th className="text-left px-4 py-3">Aus. justificadas</th>
                  <th className="text-left px-4 py-3">Horas trabajadas</th>
                  <th className="text-left px-4 py-3">Horas base (8h)</th>
                  <th className="text-left px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody>
                {tecnicos.map((t, i) => {
                  const horas = +(t.minutos / 60).toFixed(1);
                  const base = t.dias * 8;
                  const balance = +(horas - base).toFixed(1);
                  const diasAus = t.ausencias?.reduce((s, a) => s + a.dias, 0) || 0;
                  return (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{t.nombre}</td>
                      <td className="px-4 py-3 text-slate-600">{t.dias - diasAus}</td>
                      <td className="px-4 py-3">
                        {diasAus > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {t.ausencias.map((a, j) => (
                              <span key={j} className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                                {a.tipo} · {a.dias}d
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-blue-700">{fmtHM(horas)}</td>
                      <td className="px-4 py-3 text-slate-400">8:00 × {t.dias}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {fmtHM(balance, true)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SERVICIOS POR RESPONSABLE ────────────────────────────────────

function ServiciosResponsable() {
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("2026");
  const [responsables, setResponsables] = useState([]);
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [equipos, setEquipos] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => { api.get("/equipos/").then(setEquipos).catch(() => setError("No se pudieron cargar los equipos.")); }, []);

  const buscar = async () => {
    setError("");
    const params = {};
    if (mes) params.mes = mes;
    if (anio) params.anio = anio;
    try {
      const [eq, int] = await Promise.all([
        api.get("/servicios/", { ...params, tipo: "equipos" }),
        api.get("/servicios/", { ...params, tipo: "interior" }),
      ]);
      const todos = [...(eq || []), ...(int || [])];
      const mapa = {};
      for (const s of todos) {
        const resp = s.responsable || equipos.find(e => e.id === s.equipo_id)?.nombre || "Sin asignar";
        if (!mapa[resp]) mapa[resp] = { responsable: resp, total: 0, realizados: 0, instalaciones: 0, revisiones: 0, desinstalaciones: 0 };
        mapa[resp].total++;
        if (s.estado === "REALIZADO") {
          mapa[resp].realizados++;
          if (s.tipo_servicio === "INSTALACION") mapa[resp].instalaciones++;
          else if (s.tipo_servicio === "REVISION") mapa[resp].revisiones++;
          else if (s.tipo_servicio === "DESINSTALACION") mapa[resp].desinstalaciones++;
        }
      }
      setResponsables(Object.values(mapa).sort((a, b) => b.total - a.total));
      setTotalGeneral(todos.length);
    } catch { setError("Error al buscar servicios. Verificá la conexión con el servidor."); }
  };

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
      <FiltrosMesAnio mes={mes} setMes={setMes} anio={anio} setAnio={setAnio} onCalcular={buscar} label="Buscar" />
      {totalGeneral > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 inline-block">
          <span className="text-xs text-slate-500">Total servicios: </span>
          <span className="text-xl font-bold text-blue-700">{totalGeneral}</span>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
              <th className="text-left px-4 py-3">Responsable</th>
              <th className="text-left px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Total Realizados</th>
              <th className="text-left px-4 py-3">Diferencia</th>
              <th className="text-left px-4 py-3">Instalaciones</th>
              <th className="text-left px-4 py-3">Revisiones</th>
              <th className="text-left px-4 py-3">Desinstalaciones</th>
            </tr>
          </thead>
          <tbody>
            {responsables.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-4 text-slate-400 text-xs">Sin datos</td></tr>
            ) : (
              <>
                {responsables.map((r, i) => {
                  const diferencia = r.total - r.realizados;
                  return (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{r.responsable}</td>
                      <td className="px-4 py-3 font-bold text-blue-700">{r.total}</td>
                      <td className="px-4 py-3 font-semibold text-green-700">{r.realizados}</td>
                      <td className="px-4 py-3 font-semibold">
                        <span className={diferencia === 0 ? "text-slate-400" : "text-orange-600"}>
                          {diferencia}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-teal-700">{r.instalaciones}</td>
                      <td className="px-4 py-3 text-amber-700">{r.revisiones}</td>
                      <td className="px-4 py-3 text-violet-700">{r.desinstalaciones}</td>
                    </tr>
                  );
                })}
                {/* Fila TOTAL */}
                {(() => {
                  const totTotal      = responsables.reduce((s, r) => s + r.total, 0);
                  const totRealizados = responsables.reduce((s, r) => s + r.realizados, 0);
                  const totDif        = totTotal - totRealizados;
                  const totInst       = responsables.reduce((s, r) => s + r.instalaciones, 0);
                  const totRev        = responsables.reduce((s, r) => s + r.revisiones, 0);
                  const totDesinst    = responsables.reduce((s, r) => s + r.desinstalaciones, 0);
                  return (
                    <tr className="border-t-2 border-slate-300 bg-slate-50 text-xs font-semibold">
                      <td className="px-4 py-3 text-slate-700 uppercase tracking-wide">TOTAL</td>
                      <td className="px-4 py-3 text-blue-700 text-sm">{totTotal}</td>
                      <td className="px-4 py-3 text-green-700 text-sm">{totRealizados}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={totDif === 0 ? "text-slate-400" : "text-orange-600"}>{totDif}</span>
                      </td>
                      <td className="px-4 py-3 text-teal-700">{totInst}</td>
                      <td className="px-4 py-3 text-amber-700">{totRev}</td>
                      <td className="px-4 py-3 text-violet-700">{totDesinst}</td>
                    </tr>
                  );
                })()}
              </>
            )}
          </tbody>
        </table>
      </div>
      {responsables.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Servicios por Responsable</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={responsables}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="responsable" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="instalaciones" name="Instalaciones" fill="#0f766e" />
              <Bar dataKey="revisiones" name="Revisiones" fill="#b45309" />
              <Bar dataKey="desinstalaciones" name="Desinstalaciones" fill="#7c3aed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── SERVICIOS POR CLIENTE ────────────────────────────────────────

function ServiciosCliente() {
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("2026");
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [resumen, setResumen] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [error, setError] = useState("");

  const buscar = async () => {
    setError("");
    const params = {};
    if (mes) params.mes = mes;
    if (anio) params.anio = anio;
    try {
      const [eq, int] = await Promise.all([
        api.get("/servicios/", { ...params, tipo: "equipos" }),
        api.get("/servicios/", { ...params, tipo: "interior" }),
      ]);
      const todos = [...(eq || []), ...(int || [])];
      const filtrados = clienteFiltro
        ? todos.filter(s => s.cliente?.toLowerCase().includes(clienteFiltro.toLowerCase()))
        : todos;

      // Agrupar case-insensitive
      const mapa = {};
      const display = {};
      for (const s of filtrados) {
        const key = normKey(s.cliente);
        if (!display[key]) display[key] = titleCase((s.cliente || "Sin cliente").trim());
        if (!mapa[key]) mapa[key] = { total: 0, instalaciones: 0, revisiones: 0, desinstalaciones: 0 };
        mapa[key].total++;
        if (s.tipo_servicio === "INSTALACION") mapa[key].instalaciones++;
        else if (s.tipo_servicio === "REVISION") mapa[key].revisiones++;
        else if (s.tipo_servicio === "DESINSTALACION") mapa[key].desinstalaciones++;
      }
      const lista = Object.entries(mapa)
        .map(([key, v]) => ({ cliente: display[key], ...v }))
        .sort((a, b) => b.total - a.total);
      setClientes(lista);
      setResumen({
        total: filtrados.length,
        instalaciones: filtrados.filter(s => s.tipo_servicio === "INSTALACION").length,
        revisiones: filtrados.filter(s => s.tipo_servicio === "REVISION").length,
        desinstalaciones: filtrados.filter(s => s.tipo_servicio === "DESINSTALACION").length,
      });
    } catch { setError("Error al buscar servicios. Verificá la conexión con el servidor."); }
  };

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Cliente (buscar)</label>
          <input type="text" value={clienteFiltro} onChange={e => setClienteFiltro(e.target.value)}
            placeholder="Ej: Serenisima"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-48" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Mes</label>
          <select value={mes} onChange={e => setMes(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos</option>
            {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Año</label>
          <select value={anio} onChange={e => setAnio(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option>2025</option><option>2026</option><option>2027</option>
          </select>
        </div>
        <button onClick={buscar} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
          Buscar
        </button>
      </div>

      {resumen && (
        <div className="flex gap-4 flex-wrap">
          {[
            { label: "Total", value: resumen.total, color: "text-blue-700" },
            { label: "Instalaciones", value: resumen.instalaciones, color: "text-teal-700" },
            { label: "Revisiones", value: resumen.revisiones, color: "text-amber-700" },
            { label: "Desinstalaciones", value: resumen.desinstalaciones, color: "text-violet-700" },
          ].map(card => (
            <div key={card.label} className="bg-white border border-slate-200 rounded-xl px-5 py-4 text-center min-w-24">
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Instalaciones</th>
              <th className="text-left px-4 py-3">Revisiones</th>
              <th className="text-left px-4 py-3">Desinstalaciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-4 text-slate-400 text-xs">Sin datos</td></tr>
            ) : clientes.map((c, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-4 py-3 font-medium">{c.cliente}</td>
                <td className="px-4 py-3 font-bold text-blue-700">{c.total}</td>
                <td className="px-4 py-3 text-teal-700">{c.instalaciones}</td>
                <td className="px-4 py-3 text-amber-700">{c.revisiones}</td>
                <td className="px-4 py-3 text-violet-700">{c.desinstalaciones}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {clientes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-600 mb-3">Servicios por Cliente</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clientes.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="cliente" type="category" width={140} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="total" name="Total" fill="#1e3a8a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-600 mb-3">Distribución por tipo</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Instalaciones", value: resumen?.instalaciones || 0 },
                    { name: "Revisiones", value: resumen?.revisiones || 0 },
                    { name: "Desinstalaciones", value: resumen?.desinstalaciones || 0 },
                  ].filter(d => d.value > 0)}
                  cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                >
                  {[0, 1, 2].map(i => <Cell key={i} fill={["#0f766e", "#b45309", "#7c3aed"][i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── REPORTE CRUZADO ──────────────────────────────────────────────

function CruceGrupo({ resp, lista, totalGrupo, instGrupo, revGrupo, desGrupo }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <button type="button" onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-800">{resp}</span>
          <span className="text-xs text-slate-400">{lista.length} cliente{lista.length !== 1 ? "s" : ""}</span>
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">{totalGrupo} total</span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700">{instGrupo} inst.</span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">{revGrupo} rev.</span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700">{desGrupo} des.</span>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {abierto && (
        <div className="border-t border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                <th className="text-left px-5 py-2.5">Cliente</th>
                <th className="text-left px-5 py-2.5">Total</th>
                <th className="text-left px-5 py-2.5">Instalaciones</th>
                <th className="text-left px-5 py-2.5">Revisiones</th>
                <th className="text-left px-5 py-2.5">Desinstalaciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.sort((a, b) => b.total - a.total).map((c, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-medium">{c.cliente}</td>
                  <td className="px-5 py-2.5 font-bold text-blue-700">{c.total}</td>
                  <td className="px-5 py-2.5 text-teal-700">{c.INSTALACION || 0}</td>
                  <td className="px-5 py-2.5 text-amber-700">{c.REVISION || 0}</td>
                  <td className="px-5 py-2.5 text-violet-700">{c.DESINSTALACION || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReporteCruzado() {
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("2026");
  const [subTab, setSubTab] = useState("productividad");
  const [tecnicos, setTecnicos] = useState([]);
  const [cruces, setCruces] = useState([]);
  const [horasGR, setHorasGR] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => { api.get("/equipos/").then(setEquipos).catch(() => setError("No se pudieron cargar los equipos.")); }, []);

  const calcular = async () => {
    setError("");
    const params = {};
    if (mes) params.mes = mes;
    if (anio) params.anio = anio;
    try {
      if (subTab === "productividad") {
        const prevMesNum = mes ? (parseInt(mes) === 1 ? 12 : parseInt(mes) - 1) : null;
        const prevAnioStr = mes && parseInt(mes) === 1 ? String(parseInt(anio) - 1) : anio;
        const prevParams = prevMesNum ? { mes: String(prevMesNum), anio: prevAnioStr } : null;

        const fetches = [
          api.get("/movimientos-camioneta/"),
          api.get("/equipos/"),
          api.get("/servicios/", { ...params, tipo: "equipos" }),
          api.get("/servicios/", { ...params, tipo: "interior" }),
          ...(prevParams ? [
            api.get("/servicios/", { ...prevParams, tipo: "equipos" }),
            api.get("/servicios/", { ...prevParams, tipo: "interior" }),
          ] : []),
        ];
        const [movs, eqs, svcsEq, svcsInt, prevEq, prevInt] = await Promise.all(fetches);
        const filtMovs = movs.filter(m => fechaMatch(m.fecha, mes, anio));
        const todosSvcs = [...(svcsEq || []), ...(svcsInt || [])];
        const prevSvcs = prevParams ? [...(prevEq || []), ...(prevInt || [])] : [];

        const horasPorEq = {};
        for (const m of filtMovs) {
          const eq = eqs.find(e => String(e.id) === String(m.equipo_id)) || m.equipos;
          const nombre = eq?.nombre || "—";
          if (!horasPorEq[nombre]) horasPorEq[nombre] = { dias: 0, horas: 0 };
          horasPorEq[nombre].dias++;
          const h = calcHoras(m.hora_salida?.slice(0, 5), m.hora_llegada?.slice(0, 5));
          if (h) horasPorEq[nombre].horas += h;
        }

        const svcPorResp = {};
        const tiposPorResp = {};
        for (const s of todosSvcs) {
          if (s.estado !== "REALIZADO") continue;
          const resp = s.responsable || eqs.find(e => e.id === s.equipo_id)?.nombre || "Sin asignar";
          svcPorResp[resp] = (svcPorResp[resp] || 0) + 1;
          if (!tiposPorResp[resp]) tiposPorResp[resp] = { INSTALACION: 0, REVISION: 0, DESINSTALACION: 0 };
          if (s.tipo_servicio) tiposPorResp[resp][s.tipo_servicio] = (tiposPorResp[resp][s.tipo_servicio] || 0) + 1;
        }

        const prevSvcPorResp = {};
        for (const s of prevSvcs) {
          if (s.estado !== "REALIZADO") continue;
          const resp = s.responsable || eqs.find(e => e.id === s.equipo_id)?.nombre || "Sin asignar";
          prevSvcPorResp[resp] = (prevSvcPorResp[resp] || 0) + 1;
        }

        const lista = Object.keys(horasPorEq).map(nombre => {
          const h = horasPorEq[nombre];
          const svcs = svcPorResp[nombre] || 0;
          const svcsAnt = prevSvcPorResp[nombre] ?? null;
          const vsPct = svcsAnt !== null && svcsAnt > 0 ? +((svcs - svcsAnt) / svcsAnt * 100).toFixed(0) : null;
          const tipos = tiposPorResp[nombre] || { INSTALACION: 0, REVISION: 0, DESINSTALACION: 0 };
          return {
            nombre,
            dias_presentes: h.dias,
            horas_trabajadas: +h.horas.toFixed(2),
            horas_base: h.dias * 8,
            balance: +(h.horas - h.dias * 8).toFixed(2),
            servicios_realizados: svcs,
            servicios_por_dia: h.dias > 0 ? +(svcs / h.dias).toFixed(1) : 0,
            svcs_por_hora: h.horas > 0 ? +(svcs / h.horas).toFixed(2) : 0,
            horas_por_dia: h.dias > 0 ? +(h.horas / h.dias).toFixed(2) : 0,
            svcs_anterior: svcsAnt,
            vs_anterior_pct: vsPct,
            instalaciones: tipos.INSTALACION,
            revisiones: tipos.REVISION,
            desinstalaciones: tipos.DESINSTALACION,
          };
        });
        setTecnicos(lista);

      } else if (subTab === "cliente-responsable") {
        const [eq, int] = await Promise.all([
          api.get("/servicios/", { ...params, tipo: "equipos" }),
          api.get("/servicios/", { ...params, tipo: "interior" }),
        ]);
        const todos = [...(eq || []), ...(int || [])];
        const mapa = {};
        const displayCl = {};
        for (const s of todos) {
          const resp = s.responsable || equipos.find(e => e.id === s.equipo_id)?.nombre || "Sin asignar";
          const clKey = normKey(s.cliente);
          if (!displayCl[clKey]) displayCl[clKey] = titleCase((s.cliente || "Sin cliente").trim());
          const key = `${clKey}|${resp}`;
          if (!mapa[key]) mapa[key] = { clienteKey: clKey, responsable: resp, total: 0, INSTALACION: 0, REVISION: 0, DESINSTALACION: 0 };
          mapa[key].total++;
          if (s.tipo_servicio) mapa[key][s.tipo_servicio] = (mapa[key][s.tipo_servicio] || 0) + 1;
        }
        setCruces(Object.values(mapa)
          .map(c => ({ ...c, cliente: displayCl[c.clienteKey] }))
          .sort((a, b) => b.total - a.total));

      } else if (subTab === "horas-gr") {
        const eqs = await api.get("/equipos/");
        const eq2 = eqs.find(e => e.nombre === "Equipo 2");
        if (!eq2) { setHorasGR([]); return; }
        const movs = await api.get("/movimientos-camioneta/", { equipo_id: eq2.id });
        const filtrados = movs.filter(m => fechaMatch(m.fecha, mes, anio));
        const filas = filtrados.map(m => ({
          fecha: m.fecha,
          horas_trabajadas: calcHoras(m.hora_salida?.slice(0, 5), m.hora_llegada?.slice(0, 5)),
          horas_gr: calcHoras(m.llegada_gr_lch?.slice(0, 5), m.salida_gr_lch?.slice(0, 5)),
        })).filter(f => f.horas_trabajadas !== null);
        setHorasGR(filas);
      }
    } catch { setError("Error al calcular el reporte. Verificá la conexión con el servidor."); }
  };

  const totalHT = horasGR.reduce((a, f) => a + (f.horas_trabajadas || 0), 0);
  const totalGR = horasGR.reduce((a, f) => a + (f.horas_gr || 0), 0);

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
      <div className="flex gap-2 mb-2 flex-wrap">
        {[
          { key: "productividad", label: "Productividad" },
          { key: "cliente-responsable", label: "Cliente vs Responsable" },
          { key: "horas-gr", label: "Equipo 2 vs Horas GR/LCH" },
        ].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              subTab === t.key ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <FiltrosMesAnio mes={mes} setMes={setMes} anio={anio} setAnio={setAnio} onCalcular={calcular} />

      {/* Productividad */}
      {subTab === "productividad" && (
        <>
          {tecnicos.length === 0 ? (
            <p className="text-slate-400 text-sm">Sin datos. Seleccioná un período y hacé clic en Calcular.</p>
          ) : (() => {
            const MESES_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
            const prevMesNum  = mes ? (parseInt(mes) === 1 ? 12 : parseInt(mes) - 1) : null;
            const prevLabel   = prevMesNum ? MESES_SHORT[prevMesNum - 1] : "mes ant.";
            const maxSvc      = Math.max(...tecnicos.map(t => t.svcs_por_hora), 0.01);
            const avgSvcXHora = tecnicos.reduce((s, t) => s + t.svcs_por_hora, 0) / tecnicos.length;

            const totDias    = tecnicos.reduce((s, t) => s + t.dias_presentes, 0);
            const totSvcs    = tecnicos.reduce((s, t) => s + t.servicios_realizados, 0);
            const totHoras   = tecnicos.reduce((s, t) => s + t.horas_trabajadas, 0);
            const totBalance = tecnicos.reduce((s, t) => s + t.balance, 0);
            const totSvcsAnt = tecnicos.every(t => t.svcs_anterior !== null)
              ? tecnicos.reduce((s, t) => s + (t.svcs_anterior || 0), 0) : null;
            const totVsPct   = totSvcsAnt !== null && totSvcsAnt > 0
              ? +((totSvcs - totSvcsAnt) / totSvcsAnt * 100).toFixed(0) : null;

            return (
              <div className="space-y-4">
                {/* Cards por equipo */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {tecnicos.map((t, i) => {
                    const aboveAvg    = t.svcs_por_hora >= avgSvcXHora;
                    const barPct      = Math.min((t.svcs_por_hora / maxSvc) * 100, 100);
                    const hsDiaColor  = t.horas_por_dia < 7
                      ? "text-orange-500" : t.horas_por_dia >= 8 ? "text-green-600" : "text-slate-600";

                    return (
                      <div key={i} className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden border-l-4 ${aboveAvg ? "border-l-green-500" : "border-l-red-400"}`}>

                        {/* Cabecera */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                          <div>
                            <h3 className="text-base font-bold text-slate-800">{t.nombre}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">{t.dias_presentes} días presentes</p>
                          </div>
                          {t.vs_anterior_pct !== null && (
                            <div className={`text-right px-3 py-1.5 rounded-lg ${t.vs_anterior_pct >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                              <p className={`text-sm font-bold ${t.vs_anterior_pct >= 0 ? "text-green-700" : "text-red-600"}`}>
                                {t.vs_anterior_pct >= 0 ? "↑" : "↓"} {t.vs_anterior_pct >= 0 ? "+" : ""}{t.vs_anterior_pct}%
                              </p>
                              <p className="text-[10px] text-slate-400">{t.svcs_anterior} svcs en {prevLabel}</p>
                            </div>
                          )}
                        </div>

                        {/* Métricas principales */}
                        <div className="grid grid-cols-3 divide-x divide-slate-100">
                          <div className="px-5 py-4">
                            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">Servicios</p>
                            <p className="text-3xl font-bold text-indigo-600">{t.servicios_realizados}</p>
                            <p className="text-xs text-slate-400 mt-1">{t.servicios_por_dia} por día</p>
                          </div>
                          <div className="px-5 py-4">
                            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">Horas</p>
                            <p className="text-3xl font-bold text-slate-700">{fmtHM(t.horas_trabajadas)}</p>
                            <p className={`text-xs mt-1 font-medium ${hsDiaColor}`}>{fmtHM(t.horas_por_dia)} / día</p>
                          </div>
                          <div className="px-5 py-4">
                            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">Balance</p>
                            <p className={`text-3xl font-bold ${t.balance >= 0 ? "text-green-600" : "text-red-500"}`}>
                              {fmtHM(t.balance, true)}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{t.dias_presentes} × 8h base</p>
                          </div>
                        </div>

                        {/* Desglose por tipo de servicio */}
                        <div className="px-5 py-2.5 border-t border-slate-100 flex items-center gap-4">
                          <span className="text-[11px] text-slate-400 uppercase tracking-wide font-medium mr-1">Tipos:</span>
                          <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">Inst. {t.instalaciones}</span>
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Rev. {t.revisiones}</span>
                          <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">Desinst. {t.desinstalaciones}</span>
                        </div>

                        {/* Barra de eficiencia */}
                        <div className="px-5 pb-4 pt-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-slate-500">
                              Eficiencia: <span className={`font-semibold ${aboveAvg ? "text-green-600" : "text-red-500"}`}>{t.svcs_por_hora} svc/hora</span>
                            </span>
                            <span className="text-[11px] text-slate-400">promedio {avgSvcXHora.toFixed(2)}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${aboveAvg ? "bg-green-400" : "bg-red-400"}`}
                              style={{ width: `${barPct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totales */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-3">Total del período</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    {[
                      { label: "Días totales",   value: totDias,              color: "text-slate-700" },
                      { label: "Servicios",       value: totSvcs,              color: "text-indigo-600" },
                      { label: "Horas trabajadas",value: fmtHM(totHoras),      color: "text-slate-700" },
                      {
                        label: "Balance total",
                        value: fmtHM(totBalance, true),
                        color: totBalance >= 0 ? "text-green-600" : "text-red-500",
                        sub: totVsPct !== null
                          ? <span className={`text-xs font-semibold ${totVsPct >= 0 ? "text-green-600" : "text-red-500"}`}>
                              {totVsPct >= 0 ? "↑" : "↓"} {totVsPct >= 0 ? "+" : ""}{totVsPct}% vs {prevLabel}
                            </span>
                          : null,
                      },
                    ].map(card => (
                      <div key={card.label}>
                        <p className="text-xs text-slate-500 mb-1">{card.label}</p>
                        <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                        {card.sub && <div className="mt-1">{card.sub}</div>}
                      </div>
                    ))}
                  </div>
                  {/* Desglose de tipos total */}
                  <div className="flex items-center justify-center gap-5 mt-4 pt-4 border-t border-slate-200">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Tipos:</span>
                    <span className="text-sm font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
                      Instalaciones {tecnicos.reduce((s, t) => s + t.instalaciones, 0)}
                    </span>
                    <span className="text-sm font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                      Revisiones {tecnicos.reduce((s, t) => s + t.revisiones, 0)}
                    </span>
                    <span className="text-sm font-bold text-violet-700 bg-violet-50 px-3 py-1 rounded-full">
                      Desinstalaciones {tecnicos.reduce((s, t) => s + t.desinstalaciones, 0)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
          {tecnicos.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-600 mb-3">Servicios vs Horas por Equipo</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tecnicos}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="servicios_realizados" name="Servicios" fill="#1e3a8a" />
                  <Bar yAxisId="right" dataKey="horas_trabajadas" name="Horas" fill="#059669" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* Cliente vs Responsable — agrupado por Responsable */}
      {subTab === "cliente-responsable" && (() => {
        const grupos = {};
        cruces.forEach(c => {
          if (!grupos[c.responsable]) grupos[c.responsable] = [];
          grupos[c.responsable].push(c);
        });
        const gruposOrdenados = Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b, "es"));

        return (
          <div className="space-y-2">
            {cruces.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-8 text-center text-slate-400 text-sm">Sin datos</div>
            ) : gruposOrdenados.map(([resp, lista]) => {
              const totalGrupo = lista.reduce((s, c) => s + c.total, 0);
              const instGrupo = lista.reduce((s, c) => s + (c.INSTALACION || 0), 0);
              const revGrupo = lista.reduce((s, c) => s + (c.REVISION || 0), 0);
              const desGrupo = lista.reduce((s, c) => s + (c.DESINSTALACION || 0), 0);

              return (
                <CruceGrupo key={resp} resp={resp} lista={lista}
                  totalGrupo={totalGrupo} instGrupo={instGrupo} revGrupo={revGrupo} desGrupo={desGrupo} />
              );
            })}
          </div>
        );
      })()}

      {/* Horas GR/LCH */}
      {subTab === "horas-gr" && (() => {
        if (horasGR.length === 0) return (
          <p className="text-slate-400 text-sm">Sin datos — cargá movimientos de Equipo 2 con Llegada/Salida GR/LCH</p>
        );

        const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
        const fmtDia = (s) => {
          const d = new Date(s + "T12:00:00Z");
          return `${DIAS[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}`;
        };
        const pctColor = (p) =>
          p === null ? "text-slate-400"
          : p > 70   ? "text-green-600 font-semibold"
          : p > 55   ? "text-amber-600 font-semibold"
          : "text-red-600 font-semibold";

        const datos = horasGR.map(f => ({
          ...f,
          label: fmtDia(f.fecha),
          pct: f.horas_trabajadas && f.horas_gr
            ? Math.round((f.horas_gr / f.horas_trabajadas) * 100) : null,
        }));

        const pctPromedio = datos.filter(d => d.pct !== null).reduce((s, d) => s + d.pct, 0)
          / (datos.filter(d => d.pct !== null).length || 1);

        return (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Días con registro",      value: horasGR.length,                                               color: "from-indigo-500 to-violet-600" },
                { label: "Horas trabajadas total", value: fmtHM(totalHT),                                               color: "from-sky-400 to-indigo-500"    },
                { label: "Horas en GR/LCH total",  value: fmtHM(totalGR),                                               color: "from-amber-400 to-orange-500"  },
                { label: "% promedio en GR/LCH",   value: totalHT > 0 ? `${Math.round((totalGR/totalHT)*100)}%` : "—", color: "from-violet-500 to-purple-700" },
              ].map(card => (
                <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-xl shadow-md p-5 text-white`}>
                  <p className="text-xs opacity-80">{card.label}</p>
                  <p className="text-3xl font-bold mt-0.5">{card.value}</p>
                </div>
              ))}
            </div>

            {/* Gráfico combo: barras de horas + línea de % */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700">Horas trabajadas vs % tiempo en GR/LCH</h3>
                <span className="text-xs text-slate-400">Línea morada = % en GR/LCH (eje derecho)</span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={datos} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={-35} textAnchor="end" height={50} />
                  <YAxis yAxisId="left"  tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                  <Tooltip
                    formatter={(v, name) =>
                      name === "% GR/LCH" ? [`${v}%`, name] : [fmtHM(v), name]
                    }
                    labelFormatter={(l) => l}
                  />
                  <Legend />
                  <Bar    yAxisId="left"  dataKey="horas_trabajadas" name="Hs trabajadas" fill="#1e3a8a" radius={[3,3,0,0]} />
                  <Bar    yAxisId="left"  dataKey="horas_gr"         name="Hs GR/LCH"    fill="#f59e0b" radius={[3,3,0,0]} />
                  <Line   yAxisId="right" dataKey="pct"              name="% GR/LCH"     stroke="#7c3aed" strokeWidth={2} dot={{ r: 3, fill: "#7c3aed" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Tabla mejorada */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Detalle por día</h3>
                <span className="text-xs text-slate-400">Promedio: <span className={pctColor(Math.round(pctPromedio))}>{Math.round(pctPromedio)}%</span></span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs">
                    <th className="text-left px-5 py-2.5">Día</th>
                    <th className="text-left px-5 py-2.5">Hs trabajadas</th>
                    <th className="text-left px-5 py-2.5">Hs en GR/LCH</th>
                    <th className="text-left px-5 py-2.5 min-w-[180px]">% en GR/LCH</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.map((f, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-2.5 text-xs font-medium text-slate-700">{f.label}</td>
                      <td className="px-5 py-2.5 text-xs text-slate-600">{fmtHM(f.horas_trabajadas)}</td>
                      <td className="px-5 py-2.5 text-xs font-medium text-amber-600">{fmtHM(f.horas_gr) !== "—" ? fmtHM(f.horas_gr) : "—"}</td>
                      <td className="px-5 py-2.5">
                        {f.pct !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                              <div className={`h-full rounded-full ${f.pct > 70 ? "bg-green-400" : f.pct > 55 ? "bg-amber-400" : "bg-red-400"}`}
                                style={{ width: `${f.pct}%` }} />
                            </div>
                            <span className={`text-xs min-w-[32px] ${pctColor(f.pct)}`}>{f.pct}%</span>
                          </div>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}
    </div>
  );
}

// ─── STOCK KPI ────────────────────────────────────────────────────

const LS_KEY = "stock_kpi_watched_v1";
const HOY = toStr(new Date());

function diffDays(a, b) {
  return Math.round((toUTC(b) - toUTC(a)) / 86400000);
}

function calcStockStats(movimientos, stockActual) {
  const entradas = movimientos
    .filter((m) => m.tipo === "ENTRADA" || m.tipo === "COMPRA")
    .sort((a, b) => (a.fecha > b.fecha ? 1 : -1));

  const lotes = entradas.map((entry, i) => {
    const nextFecha = entradas[i + 1]?.fecha ?? HOY;
    const dias = diffDays(entry.fecha, nextFecha);
    const activo = i === entradas.length - 1;
    return { fecha: entry.fecha, cantidad: entry.cantidad, dias, activo };
  });

  const lotesConDuracion = lotes.slice(0, -1); // excluye el activo para promediar
  const avgDias =
    lotesConDuracion.length > 0
      ? Math.round(lotesConDuracion.reduce((s, l) => s + l.dias, 0) / lotesConDuracion.length)
      : null;

  const avgCantidad =
    lotesConDuracion.length > 0
      ? Math.round(lotesConDuracion.reduce((s, l) => s + l.cantidad, 0) / lotesConDuracion.length)
      : (entradas[0]?.cantidad ?? null);

  const consumoDiario = avgDias && avgCantidad ? +(avgCantidad / avgDias).toFixed(2) : null;
  const diasRestantes =
    consumoDiario && stockActual != null
      ? Math.round(stockActual / consumoDiario)
      : null;
  const fechaCompra =
    diasRestantes != null
      ? addDays(HOY, Math.max(0, diasRestantes - 3)) // aviso 3 días antes
      : null;

  return { lotes, avgDias, consumoDiario, diasRestantes, fechaCompra };
}

function ProductoKPICard({ productoId, productos, onRemove }) {
  const [movimientos, setMovimientos] = useState(null);
  const [stockActual, setStockActual] = useState(null);
  const [loading, setLoading] = useState(true);

  const prod = productos.find((p) => p.id === productoId);

  useEffect(() => {
    if (!productoId) return;
    setLoading(true);
    Promise.all([
      api.get(`/stock/movimientos/?producto_id=${productoId}`),
      api.get(`/stock/actual/`),
    ]).then(([movs, actual]) => {
      setMovimientos(movs);
      const registros = actual.filter((r) => r.producto_id === productoId);
      const total = registros.reduce((s, r) => s + (r.cantidad || 0), 0);
      setStockActual(total);
      setLoading(false);
    });
  }, [productoId]);

  if (!prod) return null;

  const { lotes, avgDias, consumoDiario, diasRestantes, fechaCompra } =
    movimientos ? calcStockStats(movimientos, stockActual) : {};

  const urgencia =
    diasRestantes != null
      ? diasRestantes <= 5
        ? "text-red-600 font-bold"
        : diasRestantes <= 10
        ? "text-amber-600 font-semibold"
        : "text-green-700"
      : "text-slate-400";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="text-lg">📦</span>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{prod.descripcion}</p>
            <p className="text-xs text-slate-400">{prod.codigo}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {stockActual != null && (
            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
              Stock actual: {stockActual}
            </span>
          )}
          <button
            onClick={() => onRemove(productoId)}
            className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none"
            title="Quitar del seguimiento"
          >
            ×
          </button>
        </div>
      </div>

      {loading ? (
        <div className="px-5 py-6 text-sm text-slate-400">Cargando movimientos…</div>
      ) : !lotes || lotes.length === 0 ? (
        <div className="px-5 py-6 text-sm text-slate-400">Sin entradas registradas para este insumo.</div>
      ) : (
        <>
          {/* Tabla de lotes */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs">
                  <th className="text-left px-5 py-2.5">Fecha entrada</th>
                  <th className="text-right px-5 py-2.5">Cantidad</th>
                  <th className="text-right px-5 py-2.5">Días que duró</th>
                </tr>
              </thead>
              <tbody>
                {[...lotes].reverse().map((l, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-2.5 text-xs text-slate-700">
                      {new Date(l.fecha + "T12:00:00Z").toLocaleDateString("es-AR", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-2.5 text-xs text-right font-medium text-slate-700">
                      {l.cantidad}
                    </td>
                    <td className="px-5 py-2.5 text-xs text-right">
                      {l.activo ? (
                        <span className="text-blue-500 font-medium">
                          {l.dias} días (activo)
                        </span>
                      ) : (
                        <span className="text-slate-600">{l.dias} días</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumen */}
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Prom. entre reposiciones</p>
              <p className="text-sm font-semibold text-slate-700">
                {avgDias != null ? `~${avgDias} días` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Consumo diario estimado</p>
              <p className="text-sm font-semibold text-slate-700">
                {consumoDiario != null ? `${consumoDiario} u/día` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Días restantes</p>
              <p className={`text-sm ${urgencia}`}>
                {diasRestantes != null ? `~${diasRestantes} días` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Compra sugerida</p>
              <p className="text-sm font-semibold text-slate-700">
                {fechaCompra
                  ? new Date(fechaCompra + "T12:00:00Z").toLocaleDateString("es-AR", {
                      day: "numeric", month: "short", year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StockKPI() {
  const [watchedIds, setWatchedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch { return []; }
  });
  const [productos, setProductos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/stock/productos/").then(setProductos);
  }, []);

  function saveWatched(ids) {
    setWatchedIds(ids);
    localStorage.setItem(LS_KEY, JSON.stringify(ids));
  }

  function addProducto(id) {
    if (!watchedIds.includes(id)) saveWatched([...watchedIds, id]);
    setShowModal(false);
    setSearch("");
  }

  function removeProducto(id) {
    saveWatched(watchedIds.filter((w) => w !== id));
  }

  const disponibles = productos.filter(
    (p) =>
      !watchedIds.includes(p.id) &&
      (p.descripcion.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Insumos en seguimiento</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Seguí los insumos clave para planificar reposiciones a tiempo
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-sm font-medium bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors"
        >
          <span className="text-base leading-none">+</span> Agregar insumo
        </button>
      </div>

      {watchedIds.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 px-6 py-12 text-center">
          <p className="text-2xl mb-2">📦</p>
          <p className="text-sm font-medium text-slate-600">No hay insumos en seguimiento</p>
          <p className="text-xs text-slate-400 mt-1">
            Hacé clic en &quot;Agregar insumo&quot; para empezar a monitorear un producto
          </p>
        </div>
      )}

      {watchedIds.map((id) => (
        <ProductoKPICard
          key={id}
          productoId={id}
          productos={productos}
          onRemove={removeProducto}
        />
      ))}

      {/* Modal agregar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Seleccioná un insumo</h3>
              <button
                onClick={() => { setShowModal(false); setSearch(""); }}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="px-5 py-3 border-b border-slate-100">
              <input
                autoFocus
                type="text"
                placeholder="Buscar por nombre o código…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
              {disponibles.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Sin resultados</p>
              ) : (
                disponibles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProducto(p.id)}
                    className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-slate-700">{p.descripcion}</p>
                    <p className="text-xs text-slate-400">{p.codigo}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────

export default function EstadisticasPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "dashboard";

  const titulos = {
    dashboard:   "Dashboard",
    horas:       "Horas Trabajadas",
    responsable: "Servicios por Responsable",
    clientes:    "Servicios por Cliente",
    cruzado:     "Reporte Cruzado",
    stock:       "Stock KPI",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{titulos[tab] || "Estadísticas"}</h1>
      {tab === "dashboard"   && <DashboardEstadisticas />}
      {tab === "horas"       && <HorasTrabajadas />}
      {tab === "responsable" && <ServiciosResponsable />}
      {tab === "clientes"    && <ServiciosCliente />}
      {tab === "cruzado"     && <ReporteCruzado />}
      {tab === "stock"       && <StockKPI />}
    </div>
  );
}
