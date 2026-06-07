"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

const TIPOS = {
  tarea:         { label: "Tarea",         color: "bg-slate-100 text-slate-600 border-slate-200" },
  investigacion: { label: "Investigación", color: "bg-blue-100 text-blue-700 border-blue-200" },
  bug:           { label: "Bug",           color: "bg-red-100 text-red-700 border-red-200" },
  mejora:        { label: "Mejora",        color: "bg-violet-100 text-violet-700 border-violet-200" },
};

const PRIORIDADES = {
  alta:  { label: "Alta",  color: "bg-red-100 text-red-700" },
  media: { label: "Media", color: "bg-amber-100 text-amber-700" },
  baja:  { label: "Baja",  color: "bg-green-100 text-green-700" },
};

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function numStr(n) {
  return n != null ? `#${String(n).padStart(3, "0")}` : "#---";
}

function fmtFecha(str) {
  if (!str) return "—";
  return str.split("-").reverse().join("/");
}

export default function HistorialTicketsPage() {
  const hoy    = new Date();
  const [mes,  setMes]  = useState(hoy.getMonth());       // 0-based
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [todos, setTodos] = useState(false);              // mostrar todos los tiempos

  const [tickets,    setTickets]    = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda,   setBusqueda]   = useState("");

  useEffect(() => { cargar(); }, [mes, anio, todos]);

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await api.get("/tareas/?estado=completada");
      setTickets(data || []);
    } catch {}
    setCargando(false);
  };

  const navMes = (delta) => {
    setMes(m => {
      let nm = m + delta;
      if (nm < 0)  { setAnio(a => a - 1); return 11; }
      if (nm > 11) { setAnio(a => a + 1); return 0;  }
      return nm;
    });
  };

  const filtrados = tickets.filter(t => {
    if (filtroTipo !== "todos" && t.tipo !== filtroTipo) return false;
    if (!todos && t.fecha_vencimiento) {
      const [ta, tm] = t.fecha_vencimiento.split("-");
      if (parseInt(ta) !== anio || parseInt(tm) !== mes + 1) return false;
    }
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!t.titulo.toLowerCase().includes(q) &&
          !(t.categoria?.toLowerCase().includes(q)) &&
          !(t.asignado_a?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  // Estadísticas del período
  const porTipo = Object.keys(TIPOS).map(k => ({
    key: k,
    label: TIPOS[k].label,
    color: TIPOS[k].color,
    count: filtrados.filter(t => t.tipo === k).length,
  })).filter(x => x.count > 0);

  const TIPO_BADGE = {
    tarea:         { bg:"#f1f5f9", color:"#475569", dot:"#94a3b8" },
    investigacion: { bg:"#eff6ff", color:"#2563eb", dot:"#3b82f6" },
    bug:           { bg:"#fef2f2", color:"#dc2626", dot:"#ef4444" },
    mejora:        { bg:"#f5f3ff", color:"#7c3aed", dot:"#8b5cf6" },
  };
  const PRIO_BADGE = {
    alta:  { bg:"#fef2f2", color:"#dc2626" },
    media: { bg:"#fffbeb", color:"#d97706" },
    baja:  { bg:"#f0fdf4", color:"#16a34a" },
  };
  const TH = { textAlign:"left", padding:"8px 16px", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, maxWidth:900 }}>
      {/* Header */}
      <div>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#0f172a" }}>Historial de Tickets</h1>
        <p style={{ margin:"4px 0 0", fontSize:13, color:"#64748b" }}>Tickets resueltos por período</p>
      </div>

      {/* Controles */}
      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        {!todos && (
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:"6px 12px" }}>
            <button onClick={() => navMes(-1)} style={{ border:"none", background:"none", cursor:"pointer", color:"#94a3b8", padding:2 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:13, fontWeight:600, color:"#1e293b", minWidth:140, textAlign:"center", fontFamily:"DM Mono, monospace" }}>
              {MESES[mes]} {anio}
            </span>
            <button onClick={() => navMes(1)} style={{ border:"none", background:"none", cursor:"pointer", color:"#94a3b8", padding:2 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        )}

        <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#475569", cursor:"pointer" }}>
          <input type="checkbox" checked={todos} onChange={e => setTodos(e.target.checked)} />
          Todos los tiempos
        </label>

        {/* Filtro tipo */}
        <div style={{ display:"flex", gap:4, background:"#f1f5f9", borderRadius:8, padding:4, marginLeft:"auto" }}>
          {[{ k: "todos", l: "Todos" }, ...Object.entries(TIPOS).map(([k, v]) => ({ k, l: v.label }))].map(f => (
            <button key={f.k} onClick={() => setFiltroTipo(f.k)} style={{
              padding:"5px 11px", borderRadius:6, border:"none", cursor:"pointer", fontSize:11.5, fontWeight:500,
              background: filtroTipo === f.k ? "#fff" : "transparent",
              color: filtroTipo === f.k ? "#1e293b" : "#64748b",
              boxShadow: filtroTipo === f.k ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}>
              {f.l}
            </button>
          ))}
        </div>

        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar…" style={{
          border:"1.5px solid #e2e8f0", borderRadius:8, padding:"6px 12px", fontSize:13, outline:"none", minWidth:150,
          background:"#f8fafc", color:"#1e293b",
        }} />
      </div>

      {/* Resumen KPIs */}
      {filtrados.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 16px", display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:26, fontWeight:700, color:"#0f172a", fontFamily:"DM Mono, monospace", lineHeight:1 }}>{filtrados.length}</span>
            <span style={{ fontSize:11, color:"#64748b", lineHeight:1.4 }}>tickets<br/>resueltos</span>
          </div>
          {porTipo.map(x => {
            const bd = TIPO_BADGE[x.key] || TIPO_BADGE.tarea;
            return (
              <div key={x.key} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 16px", display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:9.5, padding:"3px 9px", borderRadius:999, fontWeight:600, background:bd.bg, color:bd.color }}>{x.label}</span>
                <span style={{ fontSize:18, fontWeight:700, color:"#1e293b", fontFamily:"DM Mono, monospace" }}>{x.count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Lista */}
      {cargando ? (
        <div style={{ fontSize:13, color:"#94a3b8", textAlign:"center", padding:"32px 0" }}>Cargando…</div>
      ) : filtrados.length === 0 ? (
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", padding:"48px 16px", textAlign:"center", fontSize:13, color:"#94a3b8" }}>
          {todos ? "No hay tickets resueltos" : `No hay tickets resueltos en ${MESES[mes]} ${anio}`}
        </div>
      ) : (
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={{ ...TH, width:56 }}>#</th>
                <th style={TH}>Título</th>
                <th style={{ ...TH, width:100 }}>Tipo</th>
                <th style={{ ...TH, width:90 }}>Prioridad</th>
                <th style={{ ...TH, width:110 }}>Categoría</th>
                <th style={{ ...TH, width:110 }}>Asignado</th>
                <th style={{ ...TH, width:100 }}>Vencimiento</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(t => {
                const tb = TIPO_BADGE[t.tipo] || TIPO_BADGE.tarea;
                const pb = PRIO_BADGE[t.prioridad] || PRIO_BADGE.media;
                return (
                  <tr key={t.id} style={{ borderBottom:"1px solid #f8fafc" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                  >
                    <td style={{ padding:"10px 16px", fontSize:11, fontWeight:700, color:"#94a3b8", fontFamily:"DM Mono, monospace" }}>{numStr(t.numero)}</td>
                    <td style={{ padding:"10px 16px" }}>
                      <span style={{ fontSize:13, fontWeight:500, color:"#64748b", textDecoration:"line-through" }}>{t.titulo}</span>
                      {t.descripcion && (
                        <p style={{ fontSize:11, color:"#94a3b8", margin:"2px 0 0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:280 }}>{t.descripcion}</p>
                      )}
                    </td>
                    <td style={{ padding:"10px 16px" }}>
                      <span style={{ fontSize:9.5, padding:"3px 9px", borderRadius:999, fontWeight:600, background:tb.bg, color:tb.color }}>
                        {TIPOS[t.tipo]?.label || t.tipo}
                      </span>
                    </td>
                    <td style={{ padding:"10px 16px" }}>
                      <span style={{ fontSize:9.5, padding:"3px 9px", borderRadius:999, fontWeight:600, background:pb.bg, color:pb.color }}>
                        {PRIORIDADES[t.prioridad]?.label || t.prioridad}
                      </span>
                    </td>
                    <td style={{ padding:"10px 16px", fontSize:12, color:"#64748b" }}>{t.categoria || "—"}</td>
                    <td style={{ padding:"10px 16px", fontSize:12, color:"#64748b" }}>{t.asignado_a || "—"}</td>
                    <td style={{ padding:"10px 16px", fontSize:12, color:"#64748b", fontFamily:"DM Mono, monospace" }}>{fmtFecha(t.fecha_vencimiento)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
