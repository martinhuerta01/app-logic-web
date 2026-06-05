"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// ── Constantes ────────────────────────────────────────────────────────
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

const ESTADOS = [
  { key: "pendiente",   label: "Pendiente",   dot: "bg-slate-400" },
  { key: "en_progreso", label: "En Progreso", dot: "bg-blue-500"  },
  { key: "completada",  label: "Resuelto",    dot: "bg-green-500" },
];
const ESTADO_IDX = { pendiente: 0, en_progreso: 1, completada: 2 };
const ESTADO_COLOR = {
  pendiente:   "bg-slate-100 text-slate-600",
  en_progreso: "bg-blue-100 text-blue-700",
  completada:  "bg-green-100 text-green-700",
};

function fmtFecha(str) {
  if (!str) return "";
  return str.split("-").reverse().join("/");
}

function diasVenc(fecha) {
  if (!fecha) return 999;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(fecha + "T00:00:00") - hoy) / 86400000);
}

function numStr(n) {
  return n != null ? `#${String(n).padStart(3, "0")}` : "#---";
}


// ── Modal crear / editar ──────────────────────────────────────────────
function ModalTicket({ ticket, onClose, onSave }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    titulo:            ticket?.titulo            || "",
    descripcion:       ticket?.descripcion       || "",
    tipo:              ticket?.tipo              || "tarea",
    categoria:         ticket?.categoria         || "",
    prioridad:         ticket?.prioridad         || "media",
    estado:            ticket?.estado            || "pendiente",
    asignado_a:        ticket?.asignado_a        || "",
    fecha_vencimiento: ticket?.fecha_vencimiento || "",
  });
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const guardar = async () => {
    if (!form.titulo.trim()) return;
    setGuardando(true);
    const body = {
      ...form,
      fecha_vencimiento: form.fecha_vencimiento || null,
      categoria:         form.categoria.trim()  || null,
      asignado_a:        form.asignado_a.trim() || null,
    };
    if (!ticket) body.cargado_por = user;
    const ok = await onSave(ticket?.id, body);
    if (ok) onClose();
    setGuardando(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">
            {ticket ? `Editar ${numStr(ticket.numero)}` : "Nuevo ticket"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Título *</label>
            <input type="text" value={form.titulo} onChange={e => set("titulo", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => set("tipo", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Categoría</label>
              <input type="text" value={form.categoria} onChange={e => set("categoria", e.target.value)}
                placeholder="GPS, Stock, Sistema…"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Prioridad</label>
              <select value={form.prioridad} onChange={e => set("prioridad", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                {Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
              <select value={form.estado} onChange={e => set("estado", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                {ESTADOS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Vencimiento</label>
              <input type="date" value={form.fecha_vencimiento} onChange={e => set("fecha_vencimiento", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
            <textarea value={form.descripcion} onChange={e => set("descripcion", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none" rows={3} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Asignado a</label>
            <input type="text" value={form.asignado_a} onChange={e => set("asignado_a", e.target.value)}
              placeholder="Nombre (opcional)"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancelar</button>
          <button onClick={guardar} disabled={guardando || !form.titulo.trim()}
            className="px-5 py-2 text-sm bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-lg font-medium transition disabled:opacity-60">
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Panel de detalle (slide-over derecho) ─────────────────────────────
function PanelDetalle({ ticket, onClose, onEdit, onDelete, onMover }) {
  const { user } = useAuth();
  const [notas,        setNotas]        = useState([]);
  const [nuevaNota,    setNuevaNota]    = useState("");
  const [guardandoN,   setGuardandoN]   = useState(false);
  const [cargandoN,    setCargandoN]    = useState(false);

  useEffect(() => {
    if (ticket?.id) cargarNotas();
  }, [ticket?.id]);

  const cargarNotas = async () => {
    setCargandoN(true);
    try {
      const data = await api.get(`/tareas/${ticket.id}/notas/`);
      setNotas(data || []);
    } catch {}
    setCargandoN(false);
  };

  const agregarNota = async () => {
    if (!nuevaNota.trim()) return;
    setGuardandoN(true);
    try {
      await api.post(`/tareas/${ticket.id}/notas/`, { texto: nuevaNota.trim(), cargado_por: user });
      setNuevaNota("");
      cargarNotas();
    } catch {}
    setGuardandoN(false);
  };

  const eliminarNota = async (id) => {
    try {
      await api.delete(`/tareas/${ticket.id}/notas/${id}`);
      cargarNotas();
    } catch {}
  };

  const tipo     = TIPOS[ticket.tipo]           || TIPOS.tarea;
  const prio     = PRIORIDADES[ticket.prioridad] || PRIORIDADES.media;
  const estadoObj = ESTADOS[ESTADO_IDX[ticket.estado]] || ESTADOS[0];
  const idx      = ESTADO_IDX[ticket.estado] ?? 0;
  const dias     = diasVenc(ticket.fecha_vencimiento);

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold text-slate-400">{numStr(ticket.numero)}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${tipo.color}`}>{tipo.label}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${prio.color}`}>{prio.label}</span>
            </div>
            <h2 className="text-base font-bold text-slate-800 leading-tight">{ticket.titulo}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0 mt-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto">

          {/* Metadata */}
          <div className="px-5 py-4 space-y-3 border-b border-slate-100">

            {/* Estado + botones mover */}
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ESTADO_COLOR[ticket.estado]}`}>
                {estadoObj.label}
              </span>
              <div className="flex gap-1 ml-auto">
                {idx > 0 && (
                  <button onClick={() => onMover(ticket.id, ESTADOS[idx - 1].key)}
                    className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition">
                    ← {ESTADOS[idx - 1].label}
                  </button>
                )}
                {idx < 2 && (
                  <button onClick={() => onMover(ticket.id, ESTADOS[idx + 1].key)}
                    className="text-xs px-2.5 py-1 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 text-indigo-700 font-medium transition">
                    {ESTADOS[idx + 1].label} →
                  </button>
                )}
              </div>
            </div>

            {/* Campos meta */}
            <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-500">
              {ticket.categoria && (
                <div><span className="font-semibold text-slate-600">Categoría:</span> {ticket.categoria}</div>
              )}
              {ticket.asignado_a && (
                <div><span className="font-semibold text-slate-600">Asignado:</span> {ticket.asignado_a}</div>
              )}
              {ticket.cargado_por && (
                <div><span className="font-semibold text-slate-600">Creado por:</span> {ticket.cargado_por}</div>
              )}
              {ticket.fecha_vencimiento && (
                <div className={dias < 0 ? "text-red-600 font-semibold" : dias <= 2 ? "text-amber-600 font-semibold" : ""}>
                  <span className="font-semibold text-slate-600">Vence:</span> {fmtFecha(ticket.fecha_vencimiento)}
                  {dias < 0 && ` (hace ${Math.abs(dias)}d)`}
                  {dias === 0 && " (hoy)"}
                  {dias === 1 && " (mañana)"}
                </div>
              )}
            </div>

            {/* Descripción */}
            {ticket.descripcion && (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2.5 leading-relaxed">
                {ticket.descripcion}
              </p>
            )}

            {/* Acciones */}
            <div className="flex gap-2 pt-1">
              <button onClick={() => onEdit(ticket)}
                className="flex-1 text-xs py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition font-medium">
                ✎ Editar
              </button>
              <button onClick={() => { if (confirm("¿Eliminar este ticket?")) { onDelete(ticket.id); onClose(); } }}
                className="flex-1 text-xs py-2 border border-red-200 rounded-lg hover:bg-red-50 text-red-600 transition font-medium">
                Eliminar
              </button>
            </div>
          </div>

          {/* Notas / Historial */}
          <div className="px-5 py-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Notas / Historial
            </h3>

            {cargandoN ? (
              <p className="text-xs text-slate-400 italic mb-3">Cargando…</p>
            ) : notas.length === 0 ? (
              <p className="text-xs text-slate-400 italic mb-4">Sin notas aún.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {notas.map(n => (
                  <div key={n.id} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 group">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{n.texto}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-slate-400">
                        {n.cargado_por && `${n.cargado_por} · `}
                        {n.created_at
                          ? new Date(n.created_at).toLocaleDateString("es-AR", {
                              day: "2-digit", month: "2-digit", year: "2-digit",
                              hour: "2-digit", minute: "2-digit",
                            })
                          : ""}
                      </span>
                      <button onClick={() => eliminarNota(n.id)}
                        className="text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <textarea value={nuevaNota} onChange={e => setNuevaNota(e.target.value)}
                placeholder="Agregar nota o actualización…"
                rows={3}
                onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) agregarNota(); }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none" />
              <button onClick={agregarNota} disabled={!nuevaNota.trim() || guardandoN}
                className="w-full py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition disabled:opacity-50">
                {guardandoN ? "Guardando…" : "Agregar nota"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


// ── Tarjeta Kanban ────────────────────────────────────────────────────
function KanbanCard({ ticket, onDetalle, onMover }) {
  const tipo = TIPOS[ticket.tipo] || TIPOS.tarea;
  const prio = PRIORIDADES[ticket.prioridad] || PRIORIDADES.media;
  const idx  = ESTADO_IDX[ticket.estado] ?? 0;
  const dias = diasVenc(ticket.fecha_vencimiento);
  const vencida = dias < 0 && ticket.estado !== "completada";

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm p-3.5 cursor-pointer hover:border-indigo-300 hover:shadow-md transition group ${vencida ? "border-red-200 bg-red-50/30" : "border-slate-200"}`}
      onClick={() => onDetalle(ticket)}>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold text-slate-400">{numStr(ticket.numero)}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${tipo.color}`}>{tipo.label}</span>
      </div>

      <p className="text-sm font-medium text-slate-800 leading-snug mb-2.5">{ticket.titulo}</p>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${prio.color}`}>{prio.label}</span>
        {ticket.categoria && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{ticket.categoria}</span>
        )}
        {ticket.asignado_a && (
          <span className="text-[10px] text-slate-400 ml-auto truncate">→ {ticket.asignado_a}</span>
        )}
      </div>

      {ticket.fecha_vencimiento && (
        <div className={`text-[10px] mt-2 ${vencida ? "text-red-600 font-semibold" : dias <= 2 ? "text-amber-600" : "text-slate-400"}`}>
          {vencida ? `⚠ Vencido ${fmtFecha(ticket.fecha_vencimiento)}` : `📅 ${fmtFecha(ticket.fecha_vencimiento)}`}
        </div>
      )}

      {/* Flechas de mover — visibles al hover */}
      <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition"
        onClick={e => e.stopPropagation()}>
        {idx > 0 && (
          <button onClick={() => onMover(ticket.id, ESTADOS[idx - 1].key)}
            className="flex-1 text-[10px] py-1 border border-slate-200 rounded text-slate-500 hover:bg-slate-50 transition truncate">
            ← {ESTADOS[idx - 1].label}
          </button>
        )}
        {idx < 2 && (
          <button onClick={() => onMover(ticket.id, ESTADOS[idx + 1].key)}
            className="flex-1 text-[10px] py-1 border border-indigo-200 bg-indigo-50 rounded text-indigo-600 hover:bg-indigo-100 transition truncate">
            {ESTADOS[idx + 1].label} →
          </button>
        )}
      </div>
    </div>
  );
}


// ── Vista Kanban ──────────────────────────────────────────────────────
function VistaKanban({ tickets, onDetalle, onMover }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {ESTADOS.map(estado => {
        const col = tickets.filter(t => t.estado === estado.key);
        return (
          <div key={estado.key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1 mb-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${estado.dot}`} />
                <span className="text-sm font-semibold text-slate-700">{estado.label}</span>
              </div>
              <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">{col.length}</span>
            </div>
            <div className="bg-slate-50/80 rounded-xl p-2 flex-1 space-y-2 min-h-[200px] border border-slate-200/60">
              {col.length === 0 && (
                <div className="flex items-center justify-center h-20 text-xs text-slate-300 italic">Sin tickets</div>
              )}
              {col.map(t => (
                <KanbanCard key={t.id} ticket={t} onDetalle={onDetalle} onMover={onMover} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ── Vista Lista ───────────────────────────────────────────────────────
function VistaLista({ tickets, onDetalle }) {
  const [filtroEstado,    setFiltroEstado]    = useState("todos");
  const [filtroTipo,      setFiltroTipo]      = useState("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todos");
  const [busqueda,        setBusqueda]        = useState("");

  const filtrados = tickets.filter(t => {
    if (filtroEstado    !== "todos" && t.estado    !== filtroEstado)    return false;
    if (filtroTipo      !== "todos" && t.tipo      !== filtroTipo)      return false;
    if (filtroPrioridad !== "todos" && t.prioridad !== filtroPrioridad) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!t.titulo.toLowerCase().includes(q) &&
          !(t.descripcion?.toLowerCase().includes(q)) &&
          !(t.categoria?.toLowerCase().includes(q)) &&
          !(t.asignado_a?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[{ k: "todos", l: "Todos" }, ...ESTADOS.map(e => ({ k: e.key, l: e.label }))].map(f => (
            <button key={f.k} onClick={() => setFiltroEstado(f.k)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filtroEstado === f.k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {f.l}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[{ k: "todos", l: "Tipo" }, ...Object.entries(TIPOS).map(([k, v]) => ({ k, l: v.label }))].map(f => (
            <button key={f.k} onClick={() => setFiltroTipo(f.k)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filtroTipo === f.k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {f.l}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[{ k: "todos", l: "Prio" }, ...Object.entries(PRIORIDADES).map(([k, v]) => ({ k, l: v.label }))].map(f => (
            <button key={f.k} onClick={() => setFiltroPrioridad(f.k)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filtroPrioridad === f.k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {f.l}
            </button>
          ))}
        </div>

        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar…"
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-300 min-w-[160px]" />
      </div>

      {filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-10 text-center text-slate-400 text-sm">
          No hay tickets con los filtros seleccionados
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(t => {
            const tipo     = TIPOS[t.tipo]           || TIPOS.tarea;
            const prio     = PRIORIDADES[t.prioridad] || PRIORIDADES.media;
            const estadoObj = ESTADOS[ESTADO_IDX[t.estado]] || ESTADOS[0];
            const dias     = diasVenc(t.fecha_vencimiento);
            const vencida  = dias < 0 && t.estado !== "completada";

            return (
              <div key={t.id}
                onClick={() => onDetalle(t)}
                className={`bg-white rounded-xl border shadow-sm px-5 py-3.5 flex items-center gap-4 cursor-pointer hover:border-indigo-200 hover:shadow-md transition ${vencida ? "border-red-200 bg-red-50/30" : "border-slate-200"}`}>

                <span className="text-xs font-bold text-slate-400 shrink-0 w-10">{numStr(t.numero)}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${tipo.color}`}>{tipo.label}</span>
                    <span className={`text-sm font-medium ${t.estado === "completada" ? "line-through text-slate-400" : "text-slate-800"}`}>
                      {t.titulo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded-full font-semibold ${prio.color}`}>{prio.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-full ${ESTADO_COLOR[t.estado]}`}>{estadoObj.label}</span>
                    {t.categoria && <span className="bg-slate-100 px-1.5 py-0.5 rounded-full">{t.categoria}</span>}
                    {t.asignado_a && <span>→ {t.asignado_a}</span>}
                    {t.fecha_vencimiento && (
                      <span className={vencida ? "text-red-600 font-semibold" : dias <= 2 ? "text-amber-600" : ""}>
                        📅 {fmtFecha(t.fecha_vencimiento)}
                        {vencida && ` (vencido hace ${Math.abs(dias)}d)`}
                        {!vencida && dias === 0 && " (hoy)"}
                        {!vencida && dias === 1 && " (mañana)"}
                      </span>
                    )}
                  </div>
                </div>

                <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── Página principal ──────────────────────────────────────────────────
export default function TareasPage() {
  const [vista,   setVista]   = useState("kanban");
  const [tickets, setTickets] = useState([]);
  const [modal,   setModal]   = useState(null);   // null | "nuevo" | ticket
  const [detalle, setDetalle] = useState(null);   // ticket | null
  const [msg,     setMsg]     = useState("");

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const data = await api.get("/tareas/");
      setTickets(data || []);
    } catch { setMsg("Error al cargar tickets."); }
  };

  const guardar = async (id, form) => {
    try {
      if (id) await api.put(`/tareas/${id}`, form);
      else    await api.post("/tareas/", form);
      cargar();
      return true;
    } catch { setMsg("Error al guardar."); return false; }
  };

  const eliminar = async (id) => {
    try { await api.delete(`/tareas/${id}`); cargar(); }
    catch { setMsg("Error al eliminar."); }
  };

  const moverEstado = async (ticketId, nuevoEstado) => {
    try {
      await api.put(`/tareas/${ticketId}`, { estado: nuevoEstado });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, estado: nuevoEstado } : t));
      if (detalle?.id === ticketId) setDetalle(prev => ({ ...prev, estado: nuevoEstado }));
    } catch { setMsg("Error al actualizar estado."); }
  };

  // Stats
  const abiertos   = tickets.filter(t => t.estado === "pendiente").length;
  const enProgreso = tickets.filter(t => t.estado === "en_progreso").length;
  const resueltos  = tickets.filter(t => t.estado === "completada").length;

  // Ticket en el panel usa la versión más reciente del array
  const ticketDetalle = detalle ? tickets.find(t => t.id === detalle.id) || detalle : null;

  return (
    <div className="space-y-5">
      {/* Modal crear/editar */}
      {modal !== null && (
        <ModalTicket
          ticket={modal === "nuevo" ? null : modal}
          onClose={() => setModal(null)}
          onSave={guardar}
        />
      )}

      {/* Panel de detalle */}
      {ticketDetalle && (
        <PanelDetalle
          ticket={ticketDetalle}
          onClose={() => setDetalle(null)}
          onEdit={t => { setDetalle(null); setModal(t); }}
          onDelete={id => { eliminar(id); setDetalle(null); }}
          onMover={moverEstado}
        />
      )}

      {msg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tickets</h1>
          <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
            <span><span className="font-semibold text-slate-700">{abiertos}</span> pendientes</span>
            <span><span className="font-semibold text-blue-600">{enProgreso}</span> en progreso</span>
            <span><span className="font-semibold text-green-600">{resueltos}</span> resueltos</span>
          </div>
        </div>
        <button onClick={() => setModal("nuevo")}
          className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition shadow-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo ticket
        </button>
      </div>

      {/* Tabs de vista */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button onClick={() => setVista("kanban")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${vista === "kanban" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          Kanban
        </button>
        <button onClick={() => setVista("lista")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${vista === "lista" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Lista
        </button>
      </div>

      {/* Contenido */}
      {vista === "kanban" ? (
        <VistaKanban
          tickets={tickets}
          onDetalle={t => setDetalle(t)}
          onMover={moverEstado}
        />
      ) : (
        <VistaLista
          tickets={tickets}
          onDetalle={t => setDetalle(t)}
        />
      )}
    </div>
  );
}
