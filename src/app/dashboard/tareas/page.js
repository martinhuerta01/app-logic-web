"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const PRIORIDAD_STYLE = {
  alta:  "bg-red-100 text-red-700 border-red-300",
  media: "bg-yellow-100 text-yellow-700 border-yellow-300",
  baja:  "bg-green-100 text-green-700 border-green-300",
};

const ESTADO_STYLE = {
  pendiente:   "bg-yellow-100 text-yellow-700",
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

function diasVencimiento(fecha) {
  if (!fecha) return 999;
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const venc = new Date(fecha + "T00:00:00");
  return Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
}

function ModalTarea({ tarea, onClose, onSave }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    titulo: tarea?.titulo || "",
    descripcion: tarea?.descripcion || "",
    fecha_vencimiento: tarea?.fecha_vencimiento || new Date().toISOString().split("T")[0],
    prioridad: tarea?.prioridad || "media",
    estado: tarea?.estado || "pendiente",
    asignado_a: tarea?.asignado_a || "",
    es_recurrente: tarea?.es_recurrente || false,
    frecuencia: tarea?.frecuencia || "diaria",
  });

  const guardar = async () => {
    if (!form.titulo.trim()) return;
    const body = { ...form };
    if (!form.es_recurrente) {
      body.frecuencia = null;
    }
    if (form.es_recurrente) {
      body.fecha_vencimiento = null;
      body.estado = "pendiente";
    }
    if (!tarea) body.cargado_por = user;
    const ok = await onSave(tarea?.id, body);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-700">
          {tarea ? "Editar tarea" : "Nueva tarea"}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Título *</label>
            <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={2} />
          </div>

          {/* Toggle recurrente */}
          <div className="flex items-center gap-3 py-2 border-t border-b border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.es_recurrente}
                onChange={e => setForm({ ...form, es_recurrente: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
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
                <label className="block text-xs text-slate-500 mb-1">Fecha vencimiento</label>
                <input type="date" value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Prioridad</label>
              <select value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            {!form.es_recurrente && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">Estado</label>
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
            <label className="block text-xs text-slate-500 mb-1">Asignado a</label>
            <input type="text" value={form.asignado_a} onChange={e => setForm({ ...form, asignado_a: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Nombre (opcional)" />
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancelar</button>
          <button onClick={guardar} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">Guardar</button>
        </div>
      </div>
    </div>
  );
}

/* ── Sección de tareas recurrentes del día ── */
function TareasRecurrentes({ tareas, completaciones, onToggle, onEdit, onDelete, fechaSeleccionada }) {
  const hoy = fechaSeleccionada || new Date().toISOString().split("T")[0];
  const ayer = (() => {
    const d = new Date(hoy + "T00:00:00");
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  })();

  const recurrentes = tareas.filter(t => t.es_recurrente);
  if (recurrentes.length === 0) return null;

  const estaCompletada = (tareaId, fecha) =>
    completaciones.some(c => c.tarea_id === tareaId && c.fecha === fecha);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          Tareas del día
          <span className="text-xs font-normal text-slate-400">{hoy.split("-").reverse().join("/")}</span>
        </h2>
        <div className="flex items-center gap-2">
          <input type="date" value={hoy}
            onChange={e => onToggle("__fecha__", e.target.value)}
            className="border border-slate-200 rounded px-2 py-1 text-xs" />
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {recurrentes.map(t => {
          const hecha = estaCompletada(t.id, hoy);
          const noHechaAyer = !estaCompletada(t.id, ayer) && hoy !== ayer;
          const fechaHoyDate = new Date(hoy + "T00:00:00");
          const diaSemana = fechaHoyDate.getDay();
          const diaDelMes = fechaHoyDate.getDate();

          if (t.frecuencia === "semanal" && diaSemana !== 1) return null;
          if (t.frecuencia === "quincenal" && diaDelMes !== 1 && diaDelMes !== 16) return null;
          if (t.frecuencia === "mensual" && diaDelMes !== 1) return null;

          return (
            <div key={t.id} className={`flex items-center gap-4 px-5 py-3 ${noHechaAyer && !hecha ? "bg-red-50/60" : ""}`}>
              <button onClick={() => onToggle(t.id, hoy)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                  hecha ? "bg-green-500 border-green-500" : "border-slate-300 hover:border-blue-400"
                }`}>
                {hecha && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${hecha ? "line-through text-slate-400" : "text-slate-800"}`}>
                    {t.titulo}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200">
                    {FREQ_LABELS[t.frecuencia] || t.frecuencia}
                  </span>
                  {noHechaAyer && !hecha && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-300">
                      No completada ayer
                    </span>
                  )}
                </div>
                {t.descripcion && <p className="text-xs text-slate-500 mt-0.5">{t.descripcion}</p>}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onEdit(t)} className="text-slate-400 hover:text-blue-600 transition p-1 rounded hover:bg-blue-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={() => onDelete(t.id)} className="text-slate-400 hover:text-red-600 transition p-1 rounded hover:bg-red-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VistaLista({ tareas, onEdit, onDelete, onEstado }) {
  const tareasNormales = tareas.filter(t => !t.es_recurrente);

  return (
    <div className="space-y-2">
      {tareasNormales.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-8 text-center text-slate-400 text-sm">
          No hay tareas puntuales para este período
        </div>
      ) : tareasNormales.map(t => {
        const dias = diasVencimiento(t.fecha_vencimiento);
        const vencida = dias < 0 && t.estado !== "completada";
        const proxima = dias >= 0 && dias <= 2 && t.estado !== "completada";

        return (
          <div key={t.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4 ${vencida ? "border-red-300 bg-red-50/50" : proxima ? "border-amber-300 bg-amber-50/50" : "border-slate-200"}`}>
            <button onClick={() => onEstado(t.id, t.estado === "completada" ? "pendiente" : "completada")}
              className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${t.estado === "completada" ? "bg-green-500 border-green-500" : "border-slate-300 hover:border-blue-400"}`}>
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
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${PRIORIDAD_STYLE[t.prioridad] || PRIORIDAD_STYLE.media}`}>
                  {t.prioridad?.toUpperCase()}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${ESTADO_STYLE[t.estado] || ESTADO_STYLE.pendiente}`}>
                  {ESTADO_LABELS[t.estado] || t.estado}
                </span>
              </div>
              {t.descripcion && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.descripcion}</p>}
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                <span className={vencida ? "text-red-600 font-semibold" : proxima ? "text-amber-600 font-semibold" : ""}>
                  {t.fecha_vencimiento?.split("-").reverse().join("/")}
                  {vencida && ` (vencida hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? "s" : ""})`}
                  {proxima && dias === 0 && " (vence hoy)"}
                  {proxima && dias === 1 && " (vence mañana)"}
                  {proxima && dias === 2 && " (vence en 2 días)"}
                </span>
                {t.asignado_a && <span>→ {t.asignado_a}</span>}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onEdit(t)} className="text-slate-400 hover:text-blue-600 transition p-1 rounded hover:bg-blue-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={() => onDelete(t.id)} className="text-slate-400 hover:text-red-600 transition p-1 rounded hover:bg-red-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VistaCalendario({ tareas, mes, anio, onDiaClick }) {
  const primerDia = new Date(anio, mes, 1);
  let diaInicio = primerDia.getDay() - 1;
  if (diaInicio < 0) diaInicio = 6;
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const hoy = new Date().toISOString().split("T")[0];

  const celdas = [];
  for (let i = 0; i < diaInicio; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  const tareasPorDia = {};
  tareas.filter(t => !t.es_recurrente).forEach(t => {
    const dia = parseInt(t.fecha_vencimiento?.split("-")[2]);
    if (!tareasPorDia[dia]) tareasPorDia[dia] = [];
    tareasPorDia[dia].push(t);
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="grid grid-cols-7">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2 bg-slate-50 border-b border-slate-200">{d}</div>
        ))}
        {celdas.map((dia, idx) => {
          if (dia === null) return <div key={`e-${idx}`} className="border-b border-r border-slate-100 min-h-[80px] bg-slate-50/50" />;

          const fechaStr = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const esHoy = fechaStr === hoy;
          const tareasDelDia = tareasPorDia[dia] || [];
          const pendientes = tareasDelDia.filter(t => t.estado !== "completada");
          const vencidas = pendientes.filter(t => diasVencimiento(t.fecha_vencimiento) < 0);

          return (
            <div key={dia}
              onClick={() => onDiaClick(fechaStr)}
              className={`border-b border-r border-slate-100 min-h-[80px] p-1.5 cursor-pointer hover:bg-blue-50/50 transition ${esHoy ? "bg-blue-50" : ""}`}>
              <div className={`text-xs font-medium mb-1 ${esHoy ? "bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center" : "text-slate-600"}`}>
                {dia}
              </div>
              {tareasDelDia.slice(0, 3).map(t => (
                <div key={t.id}
                  className={`text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate ${
                    t.estado === "completada" ? "bg-green-100 text-green-700 line-through" :
                    vencidas.includes(t) ? "bg-red-100 text-red-700" :
                    t.prioridad === "alta" ? "bg-red-50 text-red-600" :
                    "bg-blue-50 text-blue-700"
                  }`}>
                  {t.titulo}
                </div>
              ))}
              {tareasDelDia.length > 3 && (
                <div className="text-[10px] text-slate-400">+{tareasDelDia.length - 3} más</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TareasPage() {
  const searchParams = useSearchParams();
  const vista = searchParams.get("vista") || "lista";

  const [tareas, setTareas] = useState([]);
  const [completaciones, setCompletaciones] = useState([]);
  const [modal, setModal] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [fechaRecurrentes, setFechaRecurrentes] = useState(new Date().toISOString().split("T")[0]);
  const [msg, setMsg] = useState("");
  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [anioActual, setAnioActual] = useState(new Date().getFullYear());

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
      if (id) {
        await api.put(`/tareas/${id}/`, form);
      } else {
        await api.post("/tareas/", form);
      }
      cargar();
      return true;
    } catch { setMsg("Error al guardar tarea."); return false; }
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    try {
      await api.delete(`/tareas/${id}`);
      cargar();
    } catch { setMsg("Error al eliminar tarea."); }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await api.put(`/tareas/${id}`, { estado });
      cargar();
    } catch { setMsg("Error al actualizar estado."); }
  };

  const toggleCompletacion = async (tareaId, fecha) => {
    if (tareaId === "__fecha__") {
      setFechaRecurrentes(fecha);
      return;
    }
    try {
      const existe = completaciones.find(c => c.tarea_id === tareaId && c.fecha === fecha);
      if (existe) {
        await api.delete("/tareas/completaciones/", { tarea_id: tareaId, fecha });
      } else {
        await api.post("/tareas/completaciones/", { tarea_id: tareaId, fecha });
      }
      cargar();
    } catch { setMsg("Error al actualizar completación."); }
  };

  const tareasNormales = tareas.filter(t => !t.es_recurrente);
  const tareasFiltradas = filtroEstado === "todas"
    ? tareasNormales
    : tareasNormales.filter(t => t.estado === filtroEstado);

  const tareasDelMes = tareasNormales.filter(t => {
    if (!t.fecha_vencimiento) return false;
    const [a, m] = t.fecha_vencimiento.split("-");
    return parseInt(a) === anioActual && parseInt(m) === mesActual + 1;
  });

  const mesAnterior = () => {
    if (mesActual === 0) { setMesActual(11); setAnioActual(a => a - 1); }
    else setMesActual(m => m - 1);
  };
  const mesSiguiente = () => {
    if (mesActual === 11) { setMesActual(0); setAnioActual(a => a + 1); }
    else setMesActual(m => m + 1);
  };

  const pendientes = tareasNormales.filter(t => t.estado !== "completada").length;
  const vencidas = tareasNormales.filter(t => t.estado !== "completada" && diasVencimiento(t.fecha_vencimiento) < 0).length;
  const proximas = tareasNormales.filter(t => t.estado !== "completada" && diasVencimiento(t.fecha_vencimiento) >= 0 && diasVencimiento(t.fecha_vencimiento) <= 2).length;

  return (
    <div className="space-y-6">
      {modal !== undefined && modal !== null && (
        <ModalTarea tarea={modal === "nueva" ? null : modal} onClose={() => setModal(null)} onSave={guardar} />
      )}
      {msg && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Tareas</h1>
        <button onClick={() => setModal("nueva")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
          + Nueva tarea
        </button>
      </div>

      {/* Tareas recurrentes del día */}
      <TareasRecurrentes
        tareas={tareas}
        completaciones={completaciones}
        onToggle={toggleCompletacion}
        onEdit={t => setModal(t)}
        onDelete={eliminar}
        fechaSeleccionada={fechaRecurrentes}
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-md p-4 text-white">
          <p className="text-xs opacity-80">Pendientes</p>
          <p className="text-2xl font-bold">{pendientes}</p>
        </div>
        <div className={`rounded-xl shadow-md p-4 text-white ${vencidas > 0 ? "bg-gradient-to-br from-red-500 to-red-700" : "bg-gradient-to-br from-slate-400 to-slate-600"}`}>
          <p className="text-xs opacity-80">Vencidas</p>
          <p className="text-2xl font-bold">{vencidas}</p>
        </div>
        <div className={`rounded-xl shadow-md p-4 text-white ${proximas > 0 ? "bg-gradient-to-br from-amber-500 to-yellow-600" : "bg-gradient-to-br from-green-400 to-emerald-600"}`}>
          <p className="text-xs opacity-80">Próximas a vencer</p>
          <p className="text-2xl font-bold">{proximas}</p>
        </div>
      </div>

      {/* Tabs vista + filtros */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[{ key: "lista", label: "Lista" }, { key: "calendario", label: "Calendario" }].map(v => (
            <a key={v.key} href={`/dashboard/tareas?vista=${v.key}`}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                vista === v.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              {v.label}
            </a>
          ))}
        </div>

        {vista === "lista" && (
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {[
              { key: "todas", label: "Todas" },
              { key: "pendiente", label: "Pendientes" },
              { key: "en_progreso", label: "En progreso" },
              { key: "completada", label: "Completadas" },
            ].map(f => (
              <button key={f.key} onClick={() => setFiltroEstado(f.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  filtroEstado === f.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        )}

        {vista === "calendario" && (
          <div className="flex items-center gap-3">
            <button onClick={mesAnterior} className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-slate-700 min-w-[140px] text-center">
              {MESES[mesActual]} {anioActual}
            </span>
            <button onClick={mesSiguiente} className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Contenido */}
      {vista === "lista" ? (
        <VistaLista
          tareas={tareasFiltradas}
          onEdit={t => setModal(t)}
          onDelete={eliminar}
          onEstado={cambiarEstado}
        />
      ) : (
        <VistaCalendario
          tareas={tareasDelMes}
          mes={mesActual}
          anio={anioActual}
          onDiaClick={() => {}}
        />
      )}
    </div>
  );
}
