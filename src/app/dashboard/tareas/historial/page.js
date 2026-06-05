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

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Historial de Tickets</h1>
        <p className="text-sm text-slate-400 mt-0.5">Tickets resueltos por período</p>
      </div>

      {/* Controles de período */}
      <div className="flex items-center gap-3 flex-wrap">
        {!todos && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
            <button onClick={() => navMes(-1)} className="text-slate-400 hover:text-slate-600 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-slate-700 min-w-[140px] text-center">
              {MESES[mes]} {anio}
            </span>
            <button onClick={() => navMes(1)} className="text-slate-400 hover:text-slate-600 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={todos} onChange={e => setTodos(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600" />
          Todos los tiempos
        </label>

        {/* Filtro tipo */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 ml-auto">
          {[{ k: "todos", l: "Todos" }, ...Object.entries(TIPOS).map(([k, v]) => ({ k, l: v.label }))].map(f => (
            <button key={f.k} onClick={() => setFiltroTipo(f.k)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filtroTipo === f.k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {f.l}
            </button>
          ))}
        </div>

        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar…"
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-300 min-w-[150px]" />
      </div>

      {/* Resumen */}
      {filtrados.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
            <span className="text-2xl font-bold text-slate-800">{filtrados.length}</span>
            <span className="text-xs text-slate-500 leading-tight">tickets<br/>resueltos</span>
          </div>
          {porTipo.map(x => (
            <div key={x.key} className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${x.color}`}>{x.label}</span>
              <span className="text-lg font-bold text-slate-700">{x.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Lista */}
      {cargando ? (
        <div className="text-sm text-slate-400 py-8 text-center">Cargando…</div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-12 text-center text-slate-400 text-sm">
          {todos ? "No hay tickets resueltos" : `No hay tickets resueltos en ${MESES[mes]} ${anio}`}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <th className="text-left px-4 py-3 w-14">#</th>
                <th className="text-left px-4 py-3">Título</th>
                <th className="text-left px-4 py-3 w-28">Tipo</th>
                <th className="text-left px-4 py-3 w-20">Prioridad</th>
                <th className="text-left px-4 py-3 w-28">Categoría</th>
                <th className="text-left px-4 py-3 w-28">Asignado</th>
                <th className="text-left px-4 py-3 w-24">Vencimiento</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(t => {
                const tipo = TIPOS[t.tipo] || TIPOS.tarea;
                const prio = PRIORIDADES[t.prioridad] || PRIORIDADES.media;
                return (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-bold text-xs text-slate-400">{numStr(t.numero)}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-700 line-through decoration-slate-400">{t.titulo}</span>
                      {t.descripcion && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{t.descripcion}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${tipo.color}`}>
                        {tipo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${prio.color}`}>
                        {prio.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{t.categoria || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{t.asignado_a || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtFecha(t.fecha_vencimiento)}</td>
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
