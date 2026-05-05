"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

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

// ── Íconos ────────────────────────────────────────────────────────────
const IconCalendar = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconClock = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconClipboard = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
const IconPencil   = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const IconEye = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const IconHistory = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconChart = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default function DashboardPage() {
  const router  = useRouter();
  const _hoyAR  = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
  const hoy     = _hoyAR;
  const mesNum  = parseInt(new Date().toLocaleDateString("en-US", { timeZone: "America/Argentina/Buenos_Aires", month: "numeric" }));
  const anioNum = parseInt(new Date().toLocaleDateString("en-US", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric" }));

  const [svcsHoy,   setSvcsHoy]   = useState([]);
  const [svcsMes,   setSvcsMes]   = useState([]);
  const [recientes, setRecientes] = useState([]);
  const [tareas,    setTareas]    = useState([]);
  const [cargando,  setCargando]  = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [eqHoy, intHoy, eqMes, intMes, tareasData] = await Promise.all([
          api.get("/servicios/", { fecha: hoy, tipo: "equipos"  }),
          api.get("/servicios/", { fecha: hoy, tipo: "interior" }),
          api.get("/servicios/", { mes: mesNum, anio: anioNum, tipo: "equipos"  }),
          api.get("/servicios/", { mes: mesNum, anio: anioNum, tipo: "interior" }),
          api.get("/tareas/").catch(() => []),
        ]);
        setTareas(tareasData || []);
        const todosHoy = [...(eqHoy || []), ...(intHoy || [])];
        const todosMes = [...(eqMes || []), ...(intMes || [])];
        setSvcsHoy(todosHoy);
        setSvcsMes(todosMes);
        // Últimos 6 por fecha desc
        const ordenados = [...todosMes].sort((a, b) => {
          const fd = (b.fecha || "").localeCompare(a.fecha || "");
          return fd !== 0 ? fd : (b.id || 0) - (a.id || 0);
        });
        setRecientes(ordenados.slice(0, 6));
      } catch {}
      finally { setCargando(false); }
    };
    cargar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── KPIs ──────────────────────────────────────────────────────────
  const totalHoy      = svcsHoy.length;
  const totalMes      = svcsMes.length;
  const realizadosMes = svcsMes.filter(s => s.estado === "REALIZADO").length;
  const sinCerrar     = svcsMes.filter(s => s.estado === "PENDIENTE" || s.estado === "CONFIRMADO").length;
  const pctRealizados = totalMes > 0 ? Math.round((realizadosMes / totalMes) * 100) : 0;

  // ── Barras por día del mes ────────────────────────────────────────
  const diasEnMes = new Date(anioNum, mesNum, 0).getDate();
  const porDia = Array.from({ length: diasEnMes }, (_, i) => {
    const dia = i + 1;
    const fechaStr = `${anioNum}-${String(mesNum).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
    const count = svcsMes.filter(s => s.fecha === fechaStr).length;
    return { dia: String(dia), servicios: count };
  }).filter(d => d.servicios > 0 || parseInt(d.dia) <= parseInt(_hoyAR.split("-")[2]));

  // ── Donut por estado ──────────────────────────────────────────────
  const estadoCount = {};
  svcsMes.forEach(s => { estadoCount[s.estado] = (estadoCount[s.estado] || 0) + 1; });
  const donutData = Object.entries(estadoCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const kpis = [
    {
      label: "Servicios hoy",
      value: totalHoy,
      icon: <IconCalendar />,
      gradient: "bg-gradient-to-br from-indigo-500 to-violet-600",
      sub: hoy.split("-").reverse().join("/"),
    },
    {
      label: `Servicios ${MESES[mesNum - 1]}`,
      value: totalMes,
      icon: <IconClipboard />,
      gradient: "bg-gradient-to-br from-sky-400 to-indigo-500",
      sub: `${anioNum}`,
    },
    {
      label: "Realizados",
      value: realizadosMes,
      icon: <IconCheck />,
      gradient: "bg-gradient-to-br from-emerald-400 to-teal-600",
      sub: totalMes > 0 ? `${pctRealizados}% del mes` : "—",
    },
    {
      label: "Sin cerrar",
      value: sinCerrar,
      icon: <IconClock />,
      gradient: sinCerrar > 0 ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-slate-400 to-slate-600",
      sub: "Pendientes + Confirmados",
    },
  ];

  const accesos = [
    { label: "Carga del Día",   icon: <IconPencil />,  gradient: "bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700", href: "/dashboard/carga-dia"  },
    { label: "Vista del Día",   icon: <IconEye />,     gradient: "bg-gradient-to-br from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600",        href: "/dashboard/vista-dia"  },
    { label: "Cargar Horarios", icon: <IconHistory />, gradient: "bg-gradient-to-br from-violet-500 to-purple-700 hover:from-violet-600 hover:to-purple-800",  href: "/dashboard/personal/horario-tecnico" },
    { label: "Estadísticas",    icon: <IconChart />,   gradient: "bg-gradient-to-br from-slate-600 to-slate-800 hover:from-slate-700 hover:to-slate-900",       href: "/dashboard/estadisticas?tab=responsable" },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" })}
        </p>
      </div>

      {cargando ? (
        <div className="text-slate-400 text-sm">Cargando datos…</div>
      ) : (
        <>
          {/* ── Fila 1: KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map(k => (
              <div key={k.label}
                className={`${k.gradient} rounded-xl shadow-md p-5 flex items-start gap-4 text-white`}>
                <div className="p-2.5 rounded-xl bg-white/20 shrink-0">
                  {k.icon}
                </div>
                <div>
                  <p className="text-xs opacity-80 leading-tight">{k.label}</p>
                  <p className="text-3xl font-bold leading-tight mt-0.5">{k.value}</p>
                  <p className="text-xs opacity-70 mt-0.5">{k.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Fila 2: Gráficos ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Barras por día */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">
                Servicios por día — {MESES[mesNum - 1]} {anioNum}
              </h2>
              {porDia.every(d => d.servicios === 0) ? (
                <p className="text-slate-400 text-sm">Sin servicios este mes.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={porDia} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval={1} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(v) => [`${v} servicio${v !== 1 ? "s" : ""}`, ""]}
                      labelFormatter={(l) => `Día ${l}`}
                    />
                    <Bar dataKey="servicios" fill="#6366f1" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Donut estados */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">
                Distribución de estados
              </h2>
              {donutData.length === 0 ? (
                <p className="text-slate-400 text-sm">Sin datos.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%"
                        innerRadius={45} outerRadius={70}
                        dataKey="value" paddingAngle={2}>
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

          {/* ── Fila 3: Recientes + Accesos ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Últimos servicios */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Últimos servicios del mes</h2>
                <button onClick={() => router.push("/dashboard/historial")}
                  className="text-xs text-indigo-600 hover:underline">Ver historial →</button>
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
                  {recientes.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-4 text-slate-400">Sin servicios este mes.</td></tr>
                  ) : recientes.map((s, i) => {
                    const ec = ESTADO_COLOR[s.estado] || { bg: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
                    return (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-5 py-2.5 font-mono">{s.fecha?.split("-").reverse().join("/")}</td>
                        <td className="px-5 py-2.5 font-medium">{s.responsable || "—"}</td>
                        <td className="px-5 py-2.5 text-slate-600 max-w-[140px] truncate">{s.cliente || "—"}</td>
                        <td className="px-5 py-2.5 text-slate-600">{s.tipo_servicio === "-" ? "FERIADO" : (s.tipo_servicio || "—")}</td>
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

            {/* Accesos rápidos */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Accesos rápidos</h2>
              <div className="grid grid-cols-2 gap-3">
                {accesos.map(a => (
                  <button key={a.label} onClick={() => router.push(a.href)}
                    className={`${a.gradient} text-white rounded-xl p-4 flex flex-col items-center gap-2 transition shadow-md`}>
                    {a.icon}
                    <span className="text-xs font-semibold text-center leading-tight">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Fila 4: Tareas pendientes ── */}
          {(() => {
            const hoyDate = new Date(_hoyAR + "T00:00:00");
            const tareasUrgentes = tareas
              .filter(t => t.estado !== "completada")
              .map(t => {
                const venc = new Date(t.fecha_vencimiento + "T00:00:00");
                const dias = Math.ceil((venc - hoyDate) / (1000 * 60 * 60 * 24));
                return { ...t, dias };
              })
              .sort((a, b) => a.dias - b.dias)
              .slice(0, 5);

            if (tareasUrgentes.length === 0) return null;

            return (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    Tareas pendientes
                    {tareasUrgentes.some(t => t.dias < 0) && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {tareasUrgentes.filter(t => t.dias < 0).length} vencida{tareasUrgentes.filter(t => t.dias < 0).length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </h2>
                  <button onClick={() => router.push("/dashboard/tareas?vista=lista")}
                    className="text-xs text-indigo-600 hover:underline">Ver todas →</button>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                      <th className="text-left px-5 py-2.5">Tarea</th>
                      <th className="text-left px-5 py-2.5">Prioridad</th>
                      <th className="text-left px-5 py-2.5">Vencimiento</th>
                      <th className="text-left px-5 py-2.5">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tareasUrgentes.map(t => (
                      <tr key={t.id} className={`border-b border-slate-50 hover:bg-slate-50 ${t.dias < 0 ? "bg-red-50/50" : t.dias <= 2 ? "bg-amber-50/50" : ""}`}>
                        <td className="px-5 py-2.5 font-medium text-slate-700 max-w-[200px] truncate">{t.titulo}</td>
                        <td className="px-5 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            t.prioridad === "alta" ? "bg-red-100 text-red-700 border-red-300" :
                            t.prioridad === "baja" ? "bg-green-100 text-green-700 border-green-300" :
                            "bg-yellow-100 text-yellow-700 border-yellow-300"
                          }`}>{t.prioridad?.toUpperCase()}</span>
                        </td>
                        <td className="px-5 py-2.5">
                          <span className={`font-medium ${t.dias < 0 ? "text-red-600" : t.dias <= 2 ? "text-amber-600" : "text-slate-600"}`}>
                            {t.fecha_vencimiento?.split("-").reverse().join("/")}
                            {t.dias < 0 && ` (${Math.abs(t.dias)}d atrás)`}
                            {t.dias === 0 && " (hoy)"}
                            {t.dias === 1 && " (mañana)"}
                          </span>
                        </td>
                        <td className="px-5 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            t.estado === "en_progreso" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                          }`}>{t.estado === "en_progreso" ? "En progreso" : "Pendiente"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
