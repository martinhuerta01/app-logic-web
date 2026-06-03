"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import * as XLSX from "xlsx";

const PUNTOS = ["Oficina", "Casa Maxi", "Casa Hugo"];

// ── Configuración geocercas por patente ──────────────────────────
const GEOCERCA_CONFIG = {
  "AH453YE": { base: ["Casa Hugo", "Chutro"], gr_lch: ["GENERAL RODRIGUEZ"] },
  "AB887CX": { base: ["Casa Maxi", "Chutro"], gr_lch: ["LONGCHAMPS"] },
};

function geocercaToPunto(msg) {
  if (msg.includes("Casa Hugo")) return "Casa Hugo";
  if (msg.includes("Casa Maxi")) return "Casa Maxi";
  if (msg.includes("Chutro"))    return "Oficina";
  return "";
}

function parsearFechaExcel(raw) {
  if (!raw) return "";
  // Número serial de Excel
  if (typeof raw === "number") {
    const info = XLSX.SSF.parse_date_code(raw);
    return `${info.y}-${String(info.m).padStart(2,"0")}-${String(info.d).padStart(2,"0")}`;
  }
  // Texto "2/6/2026" (ya sin la parte de hora, que se separa antes de llamar)
  const str = String(raw).split(" ")[0];
  const parts = str.split("/");
  if (parts.length === 3) {
    // Formato d/m/yyyy (Argentina)
    return `${parts[2]}-${String(parts[1]).padStart(2,"0")}-${String(parts[0]).padStart(2,"0")}`;
  }
  return "";
}

function parsearReporteGeocercas(workbook, equipos) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // Buscar fila de encabezados (donde col 0 contiene "eh" + "culo" — tolera encoding del acento)
  let hi = rows.findIndex(r => String(r[0]).trim().toLowerCase().includes("eh") && String(r[0]).trim().toLowerCase().includes("culo"));
  if (hi === -1) return [];

  const headers = rows[hi].map(h => String(h).trim());
  // Buscar columnas por nombre flexible (tolera encoding)
  const findCol = (keyword) => headers.findIndex(h => h.toLowerCase().includes(keyword.toLowerCase()));
  const col = {
    vehiculo: 0, // siempre la primera columna
    fecha:    findCol("fecha"),
    mensaje:  findCol("mensaje"),
  };

  // Leer eventos relevantes
  const events = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const row = rows[i];
    const vehiculo = String(row[col.vehiculo] || "").trim();
    const mensaje  = String(row[col.mensaje]  || "").trim();
    const fechaRaw = row[col.fecha];
    if (!vehiculo || !mensaje.startsWith("GeoCerca") || !fechaRaw) continue;

    // Fecha viene como "2/6/2026 08:51:55" — extraer fecha y hora juntas
    const fechaStr = String(fechaRaw);
    const [partesFecha, partesHora] = fechaStr.split(" ");
    const hora  = partesHora ? partesHora.slice(0, 5) : ""; // "HH:MM"
    const fecha = parsearFechaExcel(partesFecha);            // "YYYY-MM-DD"
    if (!fecha || !hora) continue;
    events.push({ vehiculo, fecha, mensaje, hora });
  }

  // Agrupar por vehículo + fecha
  const groups = {};
  for (const ev of events) {
    const key = `${ev.vehiculo}|${ev.fecha}`;
    if (!groups[key]) groups[key] = { vehiculo: ev.vehiculo, fecha: ev.fecha, events: [] };
    groups[key].events.push(ev);
  }

  const resultados = [];
  for (const group of Object.values(groups)) {
    const config = GEOCERCA_CONFIG[group.vehiculo];
    if (!config) continue;
    const equipo = equipos.find(e => e.patente === group.vehiculo);
    if (!equipo) continue;

    const isBase  = m => config.base.some(b => m.includes(b));
    const isGrLch = m => config.gr_lch.some(g => m.includes(g));
    const isSal   = m => m.includes("Salida");
    const isEnt   = m => m.includes("Entrada");

    // Solo geocercas relevantes, ordenadas por hora
    const rel = group.events
      .filter(e => isBase(e.mensaje) || isGrLch(e.mensaje))
      .sort((a, b) => a.hora.localeCompare(b.hora));

    let hora_salida = "", punto_inicio = "";
    let hora_llegada = "", punto_fin = "";
    let llegada_gr_lch = "", salida_gr_lch = "";
    const obs = [];

    // 1. Primera salida de base → hora salida
    for (const e of rel) {
      if (isBase(e.mensaje) && isSal(e.mensaje)) {
        hora_salida = e.hora;
        punto_inicio = geocercaToPunto(e.mensaje);
        break;
      }
    }
    // 2. Primera entrada GR/LCH
    for (const e of rel) {
      if (isGrLch(e.mensaje) && isEnt(e.mensaje)) { llegada_gr_lch = e.hora; break; }
    }
    // 3. Última salida GR/LCH
    for (const e of [...rel].reverse()) {
      if (isGrLch(e.mensaje) && isSal(e.mensaje)) { salida_gr_lch = e.hora; break; }
    }
    // 4. Primera entrada a base DESPUÉS de última salida GR/LCH (o de salida si no hay GR)
    const refTime = salida_gr_lch || hora_salida;
    for (const e of rel) {
      if (e.hora > refTime && isBase(e.mensaje) && isEnt(e.mensaje)) {
        hora_llegada = e.hora;
        punto_fin    = geocercaToPunto(e.mensaje);
        break;
      }
    }
    // Si no hay GR/LCH, tomar primera entrada a base
    if (!hora_llegada) {
      for (const e of rel) {
        if (isBase(e.mensaje) && isEnt(e.mensaje)) {
          hora_llegada = e.hora;
          punto_fin    = geocercaToPunto(e.mensaje);
          break;
        }
      }
    }
    // 5. Salida posterior a hora_llegada → uso indebido
    if (hora_llegada) {
      for (const e of rel) {
        if (e.hora > hora_llegada && isBase(e.mensaje) && isSal(e.mensaje)) {
          let retorno = "";
          for (const e2 of rel) {
            if (e2.hora > e.hora && isBase(e2.mensaje) && isEnt(e2.mensaje)) {
              retorno = e2.hora; break;
            }
          }
          obs.push(`Uso indebido: salida ${e.hora}${retorno ? `, retorno ${retorno}` : ""}`);
        }
      }
    }

    resultados.push({
      vehiculo:      group.vehiculo,
      fecha:         group.fecha,
      equipo_id:     String(equipo.id),
      equipo_nombre: equipo.nombre,
      hora_salida, hora_llegada,
      punto_inicio, punto_fin,
      llegada_gr_lch, salida_gr_lch,
      observaciones: obs.join("; "),
    });
  }

  return resultados.sort((a, b) =>
    a.fecha.localeCompare(b.fecha) || a.equipo_nombre.localeCompare(b.equipo_nombre)
  );
}
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

  // Reporte semanal
  const [reporteSemana, setReporteSemana] = useState([]);
  const [reporteNombre, setReporteNombre] = useState("");
  const fileInputRef = useRef(null);

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
    const empNombre = empleados.find(e => String(e.id) === String(formAus.empleado_id))?.nombre || "";
    try {
      await api.post("/jornadas/ausencias/", {
        ...formAus,
        nombre: empNombre,
        tipo: formAus.tipo_licencia,
      });
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

  // ── Reporte semanal ───────────────────────────────────────────────
  const cargarArchivoReporte = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setReporteNombre(file.name);
    const esCsv = file.name.toLowerCase().endsWith(".csv");
    const reader = new FileReader();
    reader.onload = (ev) => {
      let wb;
      if (esCsv) {
        // CSV: leer como texto y detectar separador (coma o punto y coma)
        const texto = ev.target.result;
        const sep = texto.indexOf(";") !== -1 ? ";" : ",";
        wb = XLSX.read(texto, { type: "string", FS: sep });
      } else {
        wb = XLSX.read(ev.target.result, { type: "array" });
      }
      const resultados = parsearReporteGeocercas(wb, equipos);
      setReporteSemana(resultados);
    };
    if (esCsv) reader.readAsText(file, "UTF-8");
    else        reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const aplicarDia = (r) => {
    setForm({
      equipo_id:      r.equipo_id,
      fecha:          r.fecha,
      hora_salida:    r.hora_salida,
      hora_llegada:   r.hora_llegada,
      punto_inicio:   r.punto_inicio,
      punto_fin:      r.punto_fin,
      llegada_gr_lch: r.llegada_gr_lch,
      salida_gr_lch:  r.salida_gr_lch,
      observaciones:  r.observaciones,
    });
    setTecnicosIds([]);
    setMsgMov("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const fmtDia = (fechaStr) => {
    const d = new Date(fechaStr + "T12:00:00Z");
    return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth()+1}`;
  };

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

          {/* Panel reporte semanal */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Cargar desde reporte semanal</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Subí el Excel exportado de LogicTracker — se pre-llena el formulario al elegir el día
                </p>
              </div>
              <div className="flex items-center gap-2">
                {reporteNombre && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg truncate max-w-[180px]">
                    {reporteNombre}
                  </span>
                )}
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
                  className="hidden" onChange={cargarArchivoReporte} />
                <button type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-medium bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition">
                  📂 {reporteSemana.length > 0 ? "Cambiar archivo" : "Seleccionar archivo"}
                </button>
              </div>
            </div>

            {reporteSemana.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2">
                  {reporteSemana.length} registro{reporteSemana.length > 1 ? "s" : ""} encontrado{reporteSemana.length > 1 ? "s" : ""} — clic para pre-llenar:
                </p>
                <div className="flex flex-wrap gap-2">
                  {reporteSemana.map((r, i) => {
                    const tieneObs = !!r.observaciones;
                    const activo   = form.equipo_id === r.equipo_id && form.fecha === r.fecha;
                    return (
                      <button key={i} type="button" onClick={() => aplicarDia(r)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                          activo
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : tieneObs
                            ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}>
                        {fmtDia(r.fecha)} · {r.equipo_nombre}
                        {tieneObs && <span className="ml-1">⚠️</span>}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  ⚠️ = uso indebido detectado · Los chips azules indican el día activo en el formulario
                </p>
              </div>
            )}
          </div>

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
