"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { hoyAR, mesAR, anioAR } from "@/lib/date";

const PRIORIDAD_STYLE = {
  alta:  "bg-red-100 text-red-700 border-red-200",
  media: "bg-amber-100 text-amber-700 border-amber-200",
  baja:  "bg-green-100 text-green-700 border-green-200",
};

const ESTADO_STYLE = {
  pendiente:   "bg-slate-100 text-slate-600",
  en_progreso: "bg-blue-100 text-blue-700",
  completada:  "bg-green-100 text-green-700",
};

const ESTADO_LABELS = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completada: "Completada",
};

const FREQ_LABELS = { diaria: "Diaria", semanal: "Semanal", quincenal: "Quincenal", mensual: "Mensual" };
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_SEMANA = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const DIAS_LARGO = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

function diasVencimiento(fecha) {
  if (!fecha) return 999;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fecha + "T00:00:00");
  return Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
}

function ajustarADiaHabil(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function prevDiaHabil(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  do { d.setDate(d.getDate() - 1); } while (d.getDay() === 0 || d.getDay() === 6);
  return d.toISOString().split("T")[0];
}

function debeMostrar(t, hoy) {
  const fechaInicio = t.fecha_vencimiento || hoy;
  const inicioDate = new Date(fechaInicio + "T00:00:00");
  const hoyDate   = new Date(hoy + "T00:00:00");
  if (hoyDate < inicioDate) return false;
  const dow = hoyDate.getDay();
  if (t.frecuencia === "diaria") return dow !== 0 && dow !== 6;
  if (t.frecuencia === "semanal") {
    if (dow === 0 || dow === 6) return false;
    const inicioAjustado = new Date(ajustarADiaHabil(fechaInicio) + "T00:00:00");
    return dow === inicioAjustado.getDay();
  }
  if (t.frecuencia === "quincenal") {
    const current = new Date(inicioDate);
    while (current <= hoyDate) {
      if (ajustarADiaHabil(current.toISOString().split("T")[0]) === hoy) return true;
      current.setDate(current.getDate() + 15);
    }
    return false;
  }
  if (t.frecuencia === "mensual") {
    const current = new Date(inicioDate);
    while (current <= hoyDate) {
      if (ajustarADiaHabil(current.toISOString().split("T")[0]) === hoy) return true;
      current.setMonth(current.getMonth() + 1);
    }
    return false;
  }
  return true;
}

function fmtFecha(str) {
  if (!str) return "";
  return str.split("-").reverse().join("/");
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconEdit({ onClick }) {
  return (
    <button onClick={onClick} className="text-slate-300 hover:text-indigo-500 transition p-1 rounded hover:bg-indigo-50">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  );
}

function IconDelete({ onClick }) {
  return (
    <button onClick={onClick} className="text-slate-300 hover:text-red-500 transition p-1 rounded hover:bg-red-50">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}

// ── Modal ────────────────────────────────────────────────────────────
function ModalTarea({ tarea, onClose, onSave }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    titulo: tarea?.titulo || "",
    descripcion: tarea?.descripcion || "",
    fecha_vencimiento: tarea?.fecha_vencimiento || hoyAR(),
    prioridad: tarea?.prioridad || "media",
    estado: tarea?.estado || "pendiente",
    asignado_a: tarea?.asignado_a || "",
    es_recurrente: tarea?.es_recurrente || false,
    frecuencia: tarea?.frecuencia || "diaria",
  });

  const guardar = async () => {
    if (!form.titulo.trim()) return;
    const body = { ...form };
    if (!form.es_recurrente) body.frecuencia = null;
    if (form.es_recurrente) {
      body.fecha_vencimiento = tarea?.fecha_vencimiento || hoyAR();
      body.estado = "pendiente";
    }
    if (!tarea) body.cargado_por = user;
    const ok = await onSave(tarea?.id, body);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">{tarea ? "Editar tarea" : "Nueva tarea"}</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Título *</label>
            <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" rows={2} />
          </div>

          <div className="flex items-center gap-3 py-2 border-t border-b border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.es_recurrente}
                onChange={e => setForm({ ...form, es_recurrente: e.target.checked })}
                className="w-4 h-4 rounded accent-indigo-600" />
              <span className="text-sm font-medium text-slate-700">Tarea recurrente</span>
            </label>
            {form.es_recurrente && (
              <select value={form.frecuencia} onChange={e => setForm({ ...form, frecuencia: e.target.value })}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                <option value="diaria">Diaria</option>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </select>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {!form.es_recurrente && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Vencimiento</label>
                <input type="date" value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Prioridad</label>
              <select value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            {!form.es_recurrente && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
                <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="pendiente">Pendiente</option>
                  <option value="en_progreso">En progreso</option>
                  <option value="completada">Completada</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Asignado a</label>
            <input type="text" value={form.asignado_a} onChange={e => setForm({ ...form, asignado_a: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Nombre (opcional)" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancelar</button>
          <button onClick={guardar} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-medium">Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ── Tab HOY ──────────────────────────────────────────────────────────
function TabHoy({ tareas, completaciones, onToggle, onEdit, onDelete, onEstado }) {
  const [fecha, setFecha] = useState(hoyAR());
  const hoy = hoyAR();
  const esHoy = fecha === hoy;

  const recurrentes = tareas.filter(t => t.es_recurrente && debeMostrar(t, fecha));

  const urgentes = tareas.filter(t => {
    if (t.es_recurrente || t.estado === "completada") return false;
    const d = diasVencimiento(t.fecha_vencimiento);
    return d <= 2;
  }).sort((a, b) => diasVencimiento(a.fecha_vencimiento) - diasVencimiento(b.fecha_vencimiento));

  const estaCompletada = (tareaId) =>
    completaciones.some(c => c.tarea_id === tareaId && c.fecha === fecha);

  const navFecha = (delta) => {
    const d = new Date(fecha + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + delta);
    setFecha(d.toISOString().split("T")[0]);
  };

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const dow = new Date(fecha + "T12:00:00Z").getUTCDay();
  const fechaLabel = `${DIAS_LARGO[dow].charAt(0).toUpperCase() + DIAS_LARGO[dow].slice(1)} ${dia} de ${MESES[mes - 1]}`;

  return (
    <div className="space-y-5">
      {/* Navegador de fecha */}
      <div className="flex items-center gap-3">
        <button onClick={() => navFecha(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-slate-700 min-w-[200px] text-center">
          {fechaLabel}
          {esHoy && <span className="ml-2 text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-medium">Hoy</span>}
        </span>
        <button onClick={() => navFecha(1)} disabled={esHoy} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition disabled:opacity-30">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {!esHoy && (
          <button onClick={() => setFecha(hoy)} className="text-xs text-indigo-600 hover:underline ml-1">Volver a hoy</button>
        )}
      </div>

      {/* Recurrentes del día */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Tareas del día</h2>
          <span className="text-xs text-slate-400">{recurrentes.length} tarea{recurrentes.length !== 1 ? "s" : ""}</span>
        </div>
        {recurrentes.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            {dow === 0 || dow === 6 ? "Fin de semana — sin tareas recurrentes" : "No hay tareas recurrentes para este día"}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recurrentes.map(t => {
              const hecha = estaCompletada(t.id);
              const ultimoDiaHabil = prevDiaHabil(fecha);
              const noHechaAntes = t.frecuencia === "diaria" && esHoy &&
                !completaciones.some(c => c.tarea_id === t.id && c.fecha === ultimoDiaHabil) && !hecha;

              return (
                <div key={t.id} className={`flex items-center gap-4 px-5 py-3.5 transition ${noHechaAntes ? "bg-red-50/50" : ""}`}>
                  <button onClick={() => onToggle(t.id, fecha)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                      hecha ? "bg-green-500 border-green-500" : "border-slate-300 hover:border-indigo-400"
                    }`}>
                    {hecha && <CheckIcon />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${hecha ? "line-through text-slate-400" : "text-slate-800"}`}>
                        {t.titulo}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium">
                        {FREQ_LABELS[t.frecuencia]}
                      </span>
                      {noHechaAntes && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-bold">
                          No completada ayer
                        </span>
                      )}
                    </div>
                    {t.descripcion && <p className="text-xs text-slate-400 mt-0.5">{t.descripcion}</p>}
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <IconEdit onClick={() => onEdit(t)} />
                    <IconDelete onClick={() => onDelete(t.id)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Urgentes / Vencidas (solo si estamos viendo hoy) */}
      {esHoy && urgentes.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-red-700">Urgentes / Vencidas</h2>
            <span className="text-xs text-red-400">{urgentes.length} tarea{urgentes.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {urgentes.map(t => {
              const dias = diasVencimiento(t.fecha_vencimiento);
              const vencida = dias < 0;
              return (
                <div key={t.id} className="flex items-center gap-4 px-5 py-3.5">
                  <button onClick={() => onEstado(t.id, "completada")}
                    className="w-6 h-6 rounded-full border-2 border-slate-300 hover:border-indigo-400 flex items-center justify-center shrink-0 transition" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800">{t.titulo}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${PRIORIDAD_STYLE[t.prioridad] || PRIORIDAD_STYLE.media}`}>
                        {t.prioridad?.toUpperCase()}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 font-medium ${vencida ? "text-red-600" : "text-amber-600"}`}>
                      {vencida
                        ? `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? "s" : ""}`
                        : dias === 0 ? "Vence hoy"
                        : dias === 1 ? "Vence mañana"
                        : `Vence en ${dias} días`}
                      {t.asignado_a && <span className="text-slate-400 font-normal ml-2">→ {t.asignado_a}</span>}
                    </p>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <IconEdit onClick={() => onEdit(t)} />
                    <IconDelete onClick={() => onDelete(t.id)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {esHoy && urgentes.length === 0 && tareas.filter(t => !t.es_recurrente && t.estado !== "completada").length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-700 font-medium text-center">
          Sin tareas vencidas ni próximas a vencer
        </div>
      )}
    </div>
  );
}

// ── Tab TODAS ────────────────────────────────────────────────────────
function TabTodas({ tareas, onEdit, onDelete, onEstado }) {
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [vistaCalendario, setVistaCalendario] = useState(false);
  const [mesActual, setMesActual] = useState(() => mesAR() - 1);
  const [anioActual, setAnioActual] = useState(anioAR);

  const normales = tareas.filter(t => !t.es_recurrente);
  const filtradas = normales.filter(t => {
    if (filtroEstado !== "todas" && t.estado !== filtroEstado) return false;
    if (filtroPrioridad !== "todas" && t.prioridad !== filtroPrioridad) return false;
    if (busqueda && !t.titulo.toLowerCase().includes(busqueda.toLowerCase()) &&
        !t.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) &&
        !t.asignado_a?.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const prioOrder = { alta: 0, media: 1, baja: 2 };
    if (a.estado === "completada" && b.estado !== "completada") return 1;
    if (b.estado === "completada" && a.estado !== "completada") return -1;
    const prio = (prioOrder[a.prioridad] ?? 1) - (prioOrder[b.prioridad] ?? 1);
    if (prio !== 0) return prio;
    return (a.fecha_vencimiento || "9999") < (b.fecha_vencimiento || "9999") ? -1 : 1;
  });

  const tareasDelMes = normales.filter(t => {
    if (!t.fecha_vencimiento) return false;
    const [a, m] = t.fecha_vencimiento.split("-");
    return parseInt(a) === anioActual && parseInt(m) === mesActual + 1;
  });

  const mesAnterior = () => { if (mesActual === 0) { setMesActual(11); setAnioActual(a => a - 1); } else setMesActual(m => m - 1); };
  const mesSiguiente = () => { if (mesActual === 11) { setMesActual(0); setAnioActual(a => a + 1); } else setMesActual(m => m + 1); };

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Estado */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[{ k: "todas", l: "Todas" }, { k: "pendiente", l: "Pendientes" }, { k: "en_progreso", l: "En progreso" }, { k: "completada", l: "Completadas" }].map(f => (
            <button key={f.k} onClick={() => setFiltroEstado(f.k)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filtroEstado === f.k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {f.l}
            </button>
          ))}
        </div>

        {/* Prioridad */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[{ k: "todas", l: "Prioridad" }, { k: "alta", l: "Alta" }, { k: "media", l: "Media" }, { k: "baja", l: "Baja" }].map(f => (
            <button key={f.k} onClick={() => setFiltroPrioridad(f.k)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filtroPrioridad === f.k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {f.l}
            </button>
          ))}
        </div>

        {/* Busqueda */}
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar..."
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-300 min-w-[160px]" />

        <div className="ml-auto">
          <button onClick={() => setVistaCalendario(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${vistaCalendario ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Calendario
          </button>
        </div>
      </div>

      {/* Calendario */}
      {vistaCalendario && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <button onClick={mesAnterior} className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-semibold text-slate-700 min-w-[150px] text-center">{MESES[mesActual]} {anioActual}</span>
            <button onClick={mesSiguiente} className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-7">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2 bg-slate-50 border-b border-slate-100">{d}</div>
            ))}
            {(() => {
              const primerDia = new Date(anioActual, mesActual, 1);
              let inicio = primerDia.getDay() - 1;
              if (inicio < 0) inicio = 6;
              const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
              const hoy = hoyAR();
              const celdas = [...Array(inicio).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)];
              const porDia = {};
              tareasDelMes.forEach(t => {
                const d = parseInt(t.fecha_vencimiento?.split("-")[2]);
                if (!porDia[d]) porDia[d] = [];
                porDia[d].push(t);
              });
              return celdas.map((dia, idx) => {
                if (!dia) return <div key={`e-${idx}`} className="border-b border-r border-slate-100 min-h-[80px] bg-slate-50/50" />;
                const fechaStr = `${anioActual}-${String(mesActual + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                const esHoy = fechaStr === hoy;
                const del = porDia[dia] || [];
                return (
                  <div key={dia} className={`border-b border-r border-slate-100 min-h-[80px] p-1.5 ${esHoy ? "bg-indigo-50" : ""}`}>
                    <div className={`text-xs font-medium mb-1 ${esHoy ? "bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center" : "text-slate-500"}`}>{dia}</div>
                    {del.slice(0, 3).map(t => (
                      <div key={t.id} className={`text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate ${
                        t.estado === "completada" ? "bg-green-100 text-green-700 line-through" :
                        diasVencimiento(t.fecha_vencimiento) < 0 ? "bg-red-100 text-red-700" :
                        t.prioridad === "alta" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"
                      }`}>{t.titulo}</div>
                    ))}
                    {del.length > 3 && <div className="text-[10px] text-slate-400">+{del.length - 3} más</div>}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-10 text-center text-slate-400 text-sm">
          No hay tareas con los filtros seleccionados
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(t => {
            const dias = diasVencimiento(t.fecha_vencimiento);
            const vencida = dias < 0 && t.estado !== "completada";
            const proxima = dias >= 0 && dias <= 2 && t.estado !== "completada";
            return (
              <div key={t.id} className={`bg-white rounded-xl border shadow-sm px-5 py-3.5 flex items-center gap-4 transition ${
                vencida ? "border-red-200 bg-red-50/30" : proxima ? "border-amber-200 bg-amber-50/30" : "border-slate-200"
              }`}>
                <button onClick={() => onEstado(t.id, t.estado === "completada" ? "pendiente" : "completada")}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                    t.estado === "completada" ? "bg-green-500 border-green-500" : "border-slate-300 hover:border-indigo-400"
                  }`}>
                  {t.estado === "completada" && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${t.estado === "completada" ? "line-through text-slate-400" : "text-slate-800"}`}>
                      {t.titulo}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${PRIORIDAD_STYLE[t.prioridad] || PRIORIDAD_STYLE.media}`}>
                      {t.prioridad?.toUpperCase()}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_STYLE[t.estado] || ESTADO_STYLE.pendiente}`}>
                      {ESTADO_LABELS[t.estado] || t.estado}
                    </span>
                  </div>
                  {t.descripcion && <p className="text-xs text-slate-400 mt-0.5 truncate">{t.descripcion}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className={vencida ? "text-red-600 font-semibold" : proxima ? "text-amber-600 font-semibold" : "text-slate-400"}>
                      {fmtFecha(t.fecha_vencimiento)}
                      {vencida && ` — vencida hace ${Math.abs(dias)}d`}
                      {proxima && dias === 0 && " — vence hoy"}
                      {proxima && dias === 1 && " — vence mañana"}
                    </span>
                    {t.asignado_a && <span className="text-slate-400">→ {t.asignado_a}</span>}
                  </div>
                </div>

                <div className="flex gap-0.5 shrink-0">
                  <IconEdit onClick={() => onEdit(t)} />
                  <IconDelete onClick={() => onDelete(t.id)} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────
export default function TareasPage() {
  const [tab, setTab] = useState("hoy");
  const [tareas, setTareas] = useState([]);
  const [completaciones, setCompletaciones] = useState([]);
  const [modal, setModal] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const [data, comps] = await Promise.all([
        api.get("/tareas/"),
        api.get("/tareas/completaciones/").catch(() => []),
      ]);
      setTareas(data);
      setCompletaciones(comps || []);
    } catch { setMsg("Error al cargar tareas."); }
  };

  const guardar = async (id, form) => {
    try {
      if (id) await api.put(`/tareas/${id}/`, form);
      else await api.post("/tareas/", form);
      cargar();
      return true;
    } catch { setMsg("Error al guardar tarea."); return false; }
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    try { await api.delete(`/tareas/${id}`); cargar(); }
    catch { setMsg("Error al eliminar tarea."); }
  };

  const cambiarEstado = async (id, estado) => {
    try { await api.put(`/tareas/${id}`, { estado }); cargar(); }
    catch { setMsg("Error al actualizar estado."); }
  };

  const toggleCompletacion = async (tareaId, fecha) => {
    try {
      const existe = completaciones.find(c => c.tarea_id === tareaId && c.fecha === fecha);
      if (existe) await api.delete("/tareas/completaciones/", { tarea_id: tareaId, fecha });
      else await api.post("/tareas/completaciones/", { tarea_id: tareaId, fecha });
      cargar();
    } catch { setMsg("Error al actualizar completación."); }
  };

  // Contadores para badges en tabs
  const recurrentesHoy = tareas.filter(t => t.es_recurrente && debeMostrar(t, hoyAR())).length;
  const completadasHoy = completaciones.filter(c => c.fecha === hoyAR()).length;
  const urgentesHoy = tareas.filter(t => !t.es_recurrente && t.estado !== "completada" && diasVencimiento(t.fecha_vencimiento) <= 2).length;
  const pendientesTotal = tareas.filter(t => !t.es_recurrente && t.estado !== "completada").length;

  return (
    <div className="space-y-5 max-w-4xl">
      {modal != null && (
        <ModalTarea tarea={modal === "nueva" ? null : modal} onClose={() => setModal(null)} onSave={guardar} />
      )}
      {msg && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Tareas</h1>
        <button onClick={() => setModal("nueva")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
          + Nueva tarea
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab("hoy")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition ${tab === "hoy" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Hoy
          {urgentesHoy > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{urgentesHoy}</span>
          )}
          {urgentesHoy === 0 && recurrentesHoy > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${completadasHoy === recurrentesHoy ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {completadasHoy}/{recurrentesHoy}
            </span>
          )}
        </button>
        <button onClick={() => setTab("todas")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition ${tab === "todas" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Todas
          {pendientesTotal > 0 && (
            <span className="bg-slate-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendientesTotal}</span>
          )}
        </button>
      </div>

      {/* Contenido */}
      {tab === "hoy" ? (
        <TabHoy
          tareas={tareas}
          completaciones={completaciones}
          onToggle={toggleCompletacion}
          onEdit={t => setModal(t)}
          onDelete={eliminar}
          onEstado={cambiarEstado}
        />
      ) : (
        <TabTodas
          tareas={tareas}
          onEdit={t => setModal(t)}
          onDelete={eliminar}
          onEstado={cambiarEstado}
        />
      )}
    </div>
  );
}
