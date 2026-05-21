"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const PUNTOS = ["Oficina", "Casa Maxi", "Casa Hugo"];
const TIPOS_LICENCIA = ["Médica", "Vacaciones", "Personal", "Sin aviso", "Otro"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const TIPO_COLOR = {
  "Médica":     "bg-red-100 text-red-700",
  "Vacaciones": "bg-blue-100 text-blue-700",
  "Personal":   "bg-purple-100 text-purple-700",
  "Sin aviso":  "bg-orange-100 text-orange-700",
  "Otro":       "bg-slate-100 text-slate-600",
};

const hoy = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });

const FORM_MOV = {
  equipo_id: "", fecha: hoy(), hora_salida: "09:00", hora_llegada: "",
  punto_inicio: "", punto_fin: "", llegada_gr_lch: "", salida_gr_lch: "", observaciones: "",
};

const FORM_AUS = { empleado_id: "", fecha_desde: hoy(), fecha_hasta: hoy(), tipo_licencia: "Médica" };

function IconTrash() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export default function HorarioTecnicoPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("movimiento");

  // Datos compartidos
  const [equipos, setEquipos] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  // Tab movimiento
  const [form, setForm] = useState(FORM_MOV);
  const [tecnicosIds, setTecnicosIds] = useState([]);
  const [msgMov, setMsgMov] = useState("");
  const [errorCarga, setErrorCarga] = useState("");

  // Tab ausencias
  const [formAus, setFormAus] = useState(FORM_AUS);
  const [ausencias, setAusencias] = useState([]);
  const [msgAus, setMsgAus] = useState("");
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());

  useEffect(() => {
    api.get("/equipos/").then(setEquipos).catch(() => setErrorCarga("No se pudieron cargar los equipos."));
    api.get("/directorio/tecnicos").then(setEmpleados).catch(() => {});
    fetchAusencias();
  }, []);

  const fetchAusencias = async () => {
    try {
      const data = await api.get("/jornadas/ausencias/");
      setAusencias(data);
    } catch {}
  };

  // ── Movimiento ────────────────────────────────────────────────────────
  const equipoSeleccionado = equipos.find(e => String(e.id) === String(form.equipo_id));
  const esEquipo2 = equipoSeleccionado?.nombre === "Equipo 2";

  const toggleTecnico = (id) =>
    setTecnicosIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const guardarMovimiento = async (e) => {
    e.preventDefault();
    setMsgMov("");
    const tecnicos = tecnicosIds.map(id => ({ tecnico_id: id, presente: true }));
    const body = { ...form, cargado_por: user, tecnicos };
    if (!esEquipo2) { body.llegada_gr_lch = ""; body.salida_gr_lch = ""; }
    try {
      await api.post("/movimientos-camioneta/", body);
      setMsgMov("✓ Movimiento guardado");
      setForm({ ...FORM_MOV, fecha: form.fecha });
      setTecnicosIds([]);
    } catch (err) {
      setMsgMov("Error: " + err.message);
    }
  };

  // ── Ausencias ─────────────────────────────────────────────────────────
  const ausenciasFiltradas = ausencias.filter(a => {
    if (!a.fecha_desde) return false;
    const [y, m] = a.fecha_desde.split("-");
    return parseInt(m) === filtroMes && parseInt(y) === filtroAnio;
  });

  const guardarAusencia = async (e) => {
    e.preventDefault();
    setMsgAus("");
    try {
      await api.post("/jornadas/ausencias/", formAus);
      setMsgAus("✓ Ausencia registrada");
      setFormAus(FORM_AUS);
      fetchAusencias();
    } catch (err) {
      setMsgAus("Error: " + err.message);
    }
  };

  const eliminarAusencia = async (id) => {
    if (!confirm("¿Eliminar esta ausencia?")) return;
    try {
      await api.delete(`/jornadas/ausencias/${id}/`);
      setAusencias(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const calcDias = (desde, hasta) => {
    const d1 = new Date(desde + "T12:00:00Z");
    const d2 = new Date(hasta + "T12:00:00Z");
    return Math.round((d2 - d1) / 86400000) + 1;
  };

  const nombreEmpleado = (id) => empleados.find(e => String(e.id) === String(id))?.nombre || "—";

  const aniosDisponibles = [-1, 0, 1].map(d => new Date().getFullYear() + d);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Horario Técnico</h1>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {[["movimiento", "Movimiento camioneta"], ["ausencias", "Ausencias"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === key ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Movimiento ── */}
      {tab === "movimiento" && (
        <>
          {errorCarga && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{errorCarga}</div>
          )}
          <form onSubmit={guardarMovimiento} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-2">Cargar movimiento camioneta</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Equipo</label>
                <select value={form.equipo_id} onChange={e => setForm({ ...form, equipo_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
                  <option value="">Seleccionar</option>
                  {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.patente})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Hora salida</label>
                <input type="time" value={form.hora_salida} onChange={e => setForm({ ...form, hora_salida: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Hora llegada</label>
                <input type="time" value={form.hora_llegada} onChange={e => setForm({ ...form, hora_llegada: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Punto inicio</label>
                <select value={form.punto_inicio} onChange={e => setForm({ ...form, punto_inicio: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar</option>
                  {PUNTOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Punto fin</label>
                <select value={form.punto_fin} onChange={e => setForm({ ...form, punto_fin: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar</option>
                  {PUNTOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Observaciones</label>
              <input type="text" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Ej: intercambio de equipos, moto propia, etc." />
            </div>

            {empleados.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-xs text-slate-500 mb-2">Técnicos en jornada</label>
                <div className="flex flex-wrap gap-2">
                  {empleados.map(emp => {
                    const sel = tecnicosIds.includes(String(emp.id));
                    return (
                      <button key={emp.id} type="button" onClick={() => toggleTecnico(String(emp.id))}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition ${
                          sel
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium"
                            : "bg-white border-slate-300 text-slate-500 hover:border-slate-400"
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${sel ? "bg-indigo-500" : "bg-slate-300"}`} />
                        {emp.nombre}
                      </button>
                    );
                  })}
                </div>
                {tecnicosIds.length > 0 && (
                  <p className="text-xs text-slate-400 mt-2">{tecnicosIds.length} técnico{tecnicosIds.length > 1 ? "s" : ""} seleccionado{tecnicosIds.length > 1 ? "s" : ""}</p>
                )}
              </div>
            )}

            {esEquipo2 && (
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Llegada GR/LCH</label>
                  <input type="time" value={form.llegada_gr_lch} onChange={e => setForm({ ...form, llegada_gr_lch: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Salida GR/LCH</label>
                  <input type="time" value={form.salida_gr_lch} onChange={e => setForm({ ...form, salida_gr_lch: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button type="submit"
                className="bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
                Guardar
              </button>
              {msgMov && (
                <span className={`text-sm font-medium ${msgMov.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
                  {msgMov}
                </span>
              )}
            </div>
          </form>
        </>
      )}

      {/* ── Tab: Ausencias ── */}
      {tab === "ausencias" && (
        <div className="space-y-6">
          <form onSubmit={guardarAusencia} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-2">Registrar ausencia</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Técnico</label>
                <select value={formAus.empleado_id} onChange={e => setFormAus({ ...formAus, empleado_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
                  <option value="">Seleccionar</option>
                  {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Desde</label>
                <input type="date" value={formAus.fecha_desde}
                  onChange={e => setFormAus({ ...formAus, fecha_desde: e.target.value, fecha_hasta: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Hasta</label>
                <input type="date" value={formAus.fecha_hasta} min={formAus.fecha_desde}
                  onChange={e => setFormAus({ ...formAus, fecha_hasta: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {TIPOS_LICENCIA.map(tipo => (
                <button key={tipo} type="button"
                  onClick={() => setFormAus({ ...formAus, tipo_licencia: tipo })}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                    formAus.tipo_licencia === tipo
                      ? `${TIPO_COLOR[tipo]} border-transparent`
                      : "bg-white text-slate-500 border-slate-300 hover:border-slate-400"
                  }`}>
                  {tipo}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
                Registrar
              </button>
              {msgAus && (
                <span className={`text-sm font-medium ${msgAus.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
                  {msgAus}
                </span>
              )}
            </div>
          </form>

          {/* Historial */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-base font-semibold text-slate-700">Historial de ausencias</h2>
              <div className="flex gap-2">
                <select value={filtroMes} onChange={e => setFiltroMes(Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select value={filtroAnio} onChange={e => setFiltroAnio(Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                  {aniosDisponibles.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {ausenciasFiltradas.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">
                No hay ausencias registradas para {MESES[filtroMes - 1]} {filtroAnio}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-slate-100">
                      <th className="text-left pb-2 font-medium">Técnico</th>
                      <th className="text-left pb-2 font-medium">Tipo</th>
                      <th className="text-left pb-2 font-medium">Desde</th>
                      <th className="text-left pb-2 font-medium">Hasta</th>
                      <th className="text-center pb-2 font-medium">Días</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ausenciasFiltradas.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-3 font-medium text-slate-800">{nombreEmpleado(a.empleado_id)}</td>
                        <td className="py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${TIPO_COLOR[a.tipo_licencia] || TIPO_COLOR["Otro"]}`}>
                            {a.tipo_licencia || "—"}
                          </span>
                        </td>
                        <td className="py-3 text-slate-600">{a.fecha_desde}</td>
                        <td className="py-3 text-slate-600">{a.fecha_hasta}</td>
                        <td className="py-3 text-center">
                          <span className="font-semibold text-slate-700">{calcDias(a.fecha_desde, a.fecha_hasta)}</span>
                        </td>
                        <td className="py-3 text-right">
                          <button onClick={() => eliminarAusencia(a.id)}
                            className="text-slate-300 hover:text-red-500 transition p-1">
                            <IconTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
