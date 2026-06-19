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
  REALIZADO:    "#22c55e",
  CONFIRMADO:   "#3b82f6",
  PENDIENTE:    "#eab308",
  SUSPENDIDO:   "#ef4444",
  REPROGRAMADO: "#f97316",
  EVALUADO:     "#8b5cf6",
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
  const evaluados     = svcsMes.filter(s => s.estado === "EVALUADO").length;

  // REPROGRAMADO se considera resuelto si la misma patente tiene un REALIZADO posterior en el mes
  const reprogramadoResuelto = (svc) => {
    if (!svc.patente?.trim()) return false;
    return svcsMes.some(r => r.patente === svc.patente && r.estado === "REALIZADO" && r.fecha > svc.fecha);
  };
  const sinCerrar = svcsMes.filter(s =>
    s.estado === "PENDIENTE" ||
    s.estado === "CONFIRMADO" ||
    (s.estado === "REPROGRAMADO" && !reprogramadoResuelto(s))
  ).length;

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
      accentColor: "#0f172a",
      meta: { icon: "📅", text: hoy.split("-").reverse().join("/"), color: "#64748b" },
    },
    {
      label: `Servicios ${MESES[mesNum - 1]}`,
      value: totalMes,
      icon: <IconClipboard />,
      accentColor: "#2563eb",
      meta: { icon: "📈", text: `${anioNum}`, color: "#2563eb" },
    },
    {
      label: "Realizados",
      value: realizadosMes,
      icon: <IconCheck />,
      accentColor: "#16a34a",
      meta: { icon: "✓", text: totalMes > 0 ? `${pctRealizados}% del mes` : "—", color: "#16a34a" },
    },
    {
      label: "Sin cerrar",
      value: sinCerrar,
      icon: <IconClock />,
      accentColor: sinCerrar > 0 ? "#d97706" : "#94a3b8",
      meta: { icon: sinCerrar > 0 ? "⚠" : "✓", text: "Pendientes + Confirmados + Reprog.", color: sinCerrar > 0 ? "#d97706" : "#94a3b8" },
    },
    {
      label: "Evaluados",
      value: evaluados,
      icon: <IconCheck />,
      accentColor: "#8b5cf6",
      meta: { icon: "◎", text: "Revisados este mes", color: "#8b5cf6" },
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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {kpis.map(k => (
              <div key={k.label}
                className="bg-white rounded-[10px] border border-border hover:shadow-card transition-shadow duration-200"
                style={{ padding: "14px 16px", position: "relative", overflow: "hidden" }}>
                {/* Top accent line */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0,
                  height: 2, borderRadius: "10px 10px 0 0",
                  background: k.accentColor,
                }}/>
                {/* Label */}
                <p style={{
                  margin: 0, fontSize: 9.5, fontWeight: 600,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "#94a3b8",
                }}>
                  {k.label}
                </p>
                {/* Number */}
                <p style={{
                  margin: "6px 0 0", fontSize: 28, fontWeight: 600,
                  fontFamily: "var(--font-mono, 'DM Mono', monospace)",
                  color: "#0f172a", lineHeight: 1,
                }}>
                  {k.value}
                </p>
                {/* Meta */}
                <p style={{
                  margin: "6px 0 0", fontSize: 10,
                  color: k.meta.color,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span>{k.meta.icon}</span>
                  <span>{k.meta.text}</span>
                </p>
              </div>
            ))}
          </div>

          {/* ── Fila 2: Gráficos ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Barras por día */}
            <div className="lg:col-span-2 bg-white rounded-[10px] border border-border p-5">
              <h2 style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 16 }}>
                Servicios por día — {MESES[mesNum - 1]} {anioNum}
              </h2>
              {porDia.every(d => d.servicios === 0) ? (
                <p className="text-slate-400 text-sm">Sin servicios este mes.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={porDia} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="0" stroke="#f1f5f9" strokeWidth={1} vertical={false}/>
                    <XAxis dataKey="dia" tick={{ fontSize: 9.5, fill: "#94a3b8", fontFamily: "DM Mono, monospace" }} axisLine={false} tickLine={false} interval={1} />
                    <YAxis tick={{ fontSize: 9.5, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.06)", fontFamily: "DM Mono, monospace" }}
                      formatter={(v) => [`${v} servicio${v !== 1 ? "s" : ""}`, ""]}
                      labelFormatter={(l) => `Día ${l}`}
                    />
                    <Bar dataKey="servicios" fill="#2563eb" radius={[4,4,0,0]}
                      onMouseOver={(d, i, e) => { if (e) e.target.style.fill = "#bfdbfe"; }}
                      onMouseOut={(d, i, e) => { if (e) e.target.style.fill = "#2563eb"; }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Donut estados */}
            <div className="bg-white rounded-[10px] border border-border p-5">
              <h2 style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 16 }}>
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
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
                        formatter={(v, n) => [`${v} servicios`, n]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {donutData.map(d => (
                      <div key={d.name} className="flex items-center justify-between" style={{ fontSize: 11.5 }}>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: PIE_COLORS[d.name] || "#94a3b8" }} />
                          <span style={{ color: "#475569" }}>{d.name}</span>
                        </div>
                        <span style={{ fontWeight: 600, color: "#1e293b", fontFamily: "DM Mono, monospace" }}>{d.value}</span>
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
            <div className="lg:col-span-2 bg-white rounded-[10px] border border-border overflow-hidden">
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: 12, fontWeight: 600, color: "#334155", margin: 0 }}>Últimos servicios del mes</h2>
                <button onClick={() => router.push("/dashboard/historial")}
                  style={{ fontSize: 11, color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}>
                  Ver historial →
                </button>
              </div>
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                    {["Fecha","Responsable","Cliente","Tipo","Estado"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 20px", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#94a3b8" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recientes.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: "16px 20px", fontSize: 12, color: "#94a3b8" }}>Sin servicios este mes.</td></tr>
                  ) : recientes.map((s, i) => {
                    const BADGE = {
                      REALIZADO:    { bg: "#f0fdf4", color: "#16a34a" },
                      PENDIENTE:    { bg: "#fffbeb", color: "#d97706" },
                      CONFIRMADO:   { bg: "#eff6ff", color: "#2563eb" },
                      SUSPENDIDO:   { bg: "#fef2f2", color: "#dc2626" },
                      REPROGRAMADO: { bg: "#fff7ed", color: "#ea580c" },
                      EVALUADO:     { bg: "#f5f3ff", color: "#7c3aed" },
                    };
                    const badge = BADGE[s.estado] || { bg: "#f1f5f9", color: "#64748b" };
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "9px 20px", fontSize: 11, fontFamily: "DM Mono, monospace", color: "#64748b" }}>
                          {s.fecha?.split("-").reverse().join("/")}
                        </td>
                        <td style={{ padding: "9px 20px", fontSize: 12, fontWeight: 500, color: "#1e293b" }}>{s.responsable || "—"}</td>
                        <td style={{ padding: "9px 20px", fontSize: 12, color: "#475569", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.cliente || "—"}</td>
                        <td style={{ padding: "9px 20px", fontSize: 11, color: "#64748b" }}>{s.tipo_servicio === "-" ? "FERIADO" : (s.tipo_servicio || "—")}</td>
                        <td style={{ padding: "9px 20px" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "2px 8px", borderRadius: 999,
                            fontSize: 10, fontWeight: 600,
                            background: badge.bg, color: badge.color,
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: badge.color, display: "inline-block" }}/>
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
            <div className="bg-white rounded-[10px] border border-border p-5">
              <h2 style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 14 }}>Accesos rápidos</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {accesos.map(a => (
                  <button key={a.label} onClick={() => router.push(a.href)}
                    style={{
                      background: "#f8fafc", border: "1.5px solid #e2e8f0",
                      borderRadius: 10, padding: "14px 8px",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                      cursor: "pointer", transition: "border-color 150ms, background 150ms, box-shadow 150ms",
                      color: "#334155",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#93c5fd"; e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#2563eb"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#334155"; }}
                  >
                    {a.icon}
                    <span style={{ fontSize: 11, fontWeight: 600, textAlign: "center", lineHeight: 1.3 }}>{a.label}</span>
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
