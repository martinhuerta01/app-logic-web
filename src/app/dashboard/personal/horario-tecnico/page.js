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
  if (typeof raw === "number") {
    const info = XLSX.SSF.parse_date_code(raw);
    return `${info.y}-${String(info.m).padStart(2,"0")}-${String(info.d).padStart(2,"0")}`;
  }
  const str = String(raw).split(" ")[0];
  const parts = str.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${String(parts[1]).padStart(2,"0")}-${String(parts[0]).padStart(2,"0")}`;
  }
  return "";
}

function parsearReporteGeocercas(workbook, equipos) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  let hi = rows.findIndex(r => String(r[0]).trim().toLowerCase().includes("eh") && String(r[0]).trim().toLowerCase().includes("culo"));
  if (hi === -1) return [];

  const headers = rows[hi].map(h => String(h).trim());
  const findCol = (keyword) => headers.findIndex(h => h.toLowerCase().includes(keyword.toLowerCase()));
  const col = {
    vehiculo: 0,
    fecha:    findCol("fecha"),
    mensaje:  findCol("mensaje"),
  };

  const events = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const row = rows[i];
    const vehiculo = String(row[col.vehiculo] || "").trim();
    const mensaje  = String(row[col.mensaje]  || "").trim();
    const fechaRaw = row[col.fecha];
    if (!vehiculo || !mensaje.startsWith("GeoCerca") || !fechaRaw) continue;

    const fechaStr = String(fechaRaw);
    const [partesFecha, partesHora] = fechaStr.split(" ");
    const hora  = partesHora ? partesHora.slice(0, 5) : "";
    const fecha = parsearFechaExcel(partesFecha);
    if (!fecha || !hora) continue;
    events.push({ vehiculo, fecha, mensaje, hora });
  }

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

    const rel = group.events
      .filter(e => isBase(e.mensaje) || isGrLch(e.mensaje))
      .sort((a, b) => a.hora.localeCompare(b.hora));

    let hora_salida = "", punto_inicio = "";
    let hora_llegada = "", punto_fin = "";
    let llegada_gr_lch = "", salida_gr_lch = "";
    const obs = [];

    for (const e of rel) {
      if (isBase(e.mensaje) && isSal(e.mensaje)) {
        hora_salida = e.hora;
        punto_inicio = geocercaToPunto(e.mensaje);
        break;
      }
    }
    for (const e of rel) {
      if (isGrLch(e.mensaje) && isEnt(e.mensaje)) { llegada_gr_lch = e.hora; break; }
    }
    for (const e of [...rel].reverse()) {
      if (isGrLch(e.mensaje) && isSal(e.mensaje)) { salida_gr_lch = e.hora; break; }
    }
    const refTime = salida_gr_lch || hora_salida;
    for (const e of rel) {
      if (e.hora > refTime && isBase(e.mensaje) && isEnt(e.mensaje)) {
        hora_llegada = e.hora;
        punto_fin    = geocercaToPunto(e.mensaje);
        break;
      }
    }
    if (!hora_llegada) {
      for (const e of rel) {
        if (isBase(e.mensaje) && isEnt(e.mensaje)) {
          hora_llegada = e.hora;
          punto_fin    = geocercaToPunto(e.mensaje);
          break;
        }
      }
    }
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
  "Médica":     { bg:"#fef2f2", color:"#dc2626" },
  "Vacaciones": { bg:"#eff6ff", color:"#2563eb" },
  "Personal":   { bg:"#f5f3ff", color:"#7c3aed" },
  "Sin aviso":  { bg:"#fff7ed", color:"#ea580c" },
  "Otro":       { bg:"#f1f5f9", color:"#64748b" },
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

const inputStyle = {
  padding: "7px 11px", borderRadius: 7, border: "1.5px solid #e2e8f0",
  background: "#f8fafc", fontSize: 13, outline: "none", fontFamily: "inherit", width: "100%",
};
const inputFocus = (e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; };
const inputBlur  = (e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };
const labelStyle = { display:"block", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", marginBottom:5 };

export default function HorarioTecnicoPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("movimiento");

  const [equipos, setEquipos] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  const [form, setForm] = useState(FORM_MOV);
  const [tecnicosIds, setTecnicosIds] = useState([]);
  const [msgMov, setMsgMov] = useState("");
  const [errorCarga, setErrorCarga] = useState("");

  const [reporteSemana, setReporteSemana] = useState([]);
  const [reporteNombre, setReporteNombre] = useState("");
  const fileInputRef = useRef(null);

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

  const cargarArchivoReporte = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setReporteNombre(file.name);
    const esCsv = file.name.toLowerCase().endsWith(".csv");
    const reader = new FileReader();
    reader.onload = (ev) => {
      let wb;
      if (esCsv) {
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

  const thStyle = {textAlign:"left", padding:"8px 16px", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9"};
  const tdStyle = {padding:"9px 16px", fontSize:12.5, color:"#334155"};

  return (
    <div style={{paddingBottom:32}}>
      {/* Page header */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22, fontWeight:700, color:"#0f172a", margin:0}}>Horario Técnico</h1>
          <p style={{fontSize:13, color:"#64748b", marginTop:4}}>Movimientos de camioneta y ausencias</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex", gap:4, background:"#f1f5f9", padding:4, borderRadius:10, width:"fit-content", marginBottom:24}}>
        {[["movimiento", "Movimiento camioneta"], ["ausencias", "Ausencias"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{
              padding:"7px 16px", borderRadius:7, fontSize:13, fontWeight:500, cursor:"pointer", border:"none",
              ...(tab === key
                ? {background:"#fff", color:"#0f172a", boxShadow:"0 1px 3px rgba(0,0,0,0.1)"}
                : {background:"transparent", color:"#64748b"})
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Movimiento ── */}
      {tab === "movimiento" && (
        <>
          {errorCarga && (
            <div style={{background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"10px 16px", fontSize:13, marginBottom:16}}>
              {errorCarga}
            </div>
          )}

          {/* Panel reporte semanal */}
          <div style={{background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", padding:20, marginBottom:20}}>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12}}>
              <div>
                <h2 style={{fontSize:13, fontWeight:600, color:"#0f172a", margin:0}}>Cargar desde reporte semanal</h2>
                <p style={{fontSize:11.5, color:"#94a3b8", marginTop:3, marginBottom:0}}>
                  Subí el Excel exportado de LogicTracker — se pre-llena el formulario al elegir el día
                </p>
              </div>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                {reporteNombre && (
                  <span style={{fontSize:11, color:"#64748b", background:"#f1f5f9", padding:"5px 10px", borderRadius:7, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {reporteNombre}
                  </span>
                )}
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={cargarArchivoReporte} />
                <button type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:500, background:"#1e293b", color:"#fff", border:"none", borderRadius:8, padding:"7px 14px", cursor:"pointer"}}
                  onMouseEnter={e => e.currentTarget.style.background="#0f172a"}
                  onMouseLeave={e => e.currentTarget.style.background="#1e293b"}>
                  📂 {reporteSemana.length > 0 ? "Cambiar archivo" : "Seleccionar archivo"}
                </button>
              </div>
            </div>

            {reporteSemana.length > 0 && (
              <div style={{marginTop:16}}>
                <p style={{fontSize:11.5, color:"#64748b", marginBottom:8}}>
                  {reporteSemana.length} registro{reporteSemana.length > 1 ? "s" : ""} encontrado{reporteSemana.length > 1 ? "s" : ""} — clic para pre-llenar:
                </p>
                <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
                  {reporteSemana.map((r, i) => {
                    const tieneObs = !!r.observaciones;
                    const activo   = form.equipo_id === r.equipo_id && form.fecha === r.fecha;
                    return (
                      <button key={i} type="button" onClick={() => aplicarDia(r)}
                        style={{
                          fontSize:11.5, padding:"5px 12px", borderRadius:8, cursor:"pointer", fontWeight:500, border:"1.5px solid",
                          ...(activo
                            ? {background:"#4f46e5", color:"#fff", borderColor:"#4f46e5"}
                            : tieneObs
                            ? {background:"#fffbeb", color:"#d97706", borderColor:"#fcd34d"}
                            : {background:"#f8fafc", color:"#334155", borderColor:"#e2e8f0"})
                        }}>
                        {fmtDia(r.fecha)} · {r.equipo_nombre}
                        {tieneObs && <span style={{marginLeft:4}}>⚠️</span>}
                      </button>
                    );
                  })}
                </div>
                <p style={{fontSize:11, color:"#94a3b8", marginTop:8}}>
                  ⚠️ = uso indebido detectado · Los chips azules indican el día activo en el formulario
                </p>
              </div>
            )}
          </div>

          <form onSubmit={guardarMovimiento} style={{background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", padding:24}}>
            <h2 style={{fontSize:13, fontWeight:600, color:"#0f172a", marginBottom:20, paddingBottom:12, borderBottom:"1px solid #f1f5f9"}}>
              Cargar movimiento camioneta
            </h2>
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:16, marginBottom:20}}>
              <div>
                <label style={labelStyle}>Equipo</label>
                <select value={form.equipo_id} onChange={e => setForm({ ...form, equipo_id: e.target.value })}
                  style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} required>
                  <option value="">Seleccionar</option>
                  {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.patente})</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                  style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} required />
              </div>
              <div>
                <label style={labelStyle}>Hora salida</label>
                <input type="time" value={form.hora_salida} onChange={e => setForm({ ...form, hora_salida: e.target.value })}
                  style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
              </div>
              <div>
                <label style={labelStyle}>Hora llegada</label>
                <input type="time" value={form.hora_llegada} onChange={e => setForm({ ...form, hora_llegada: e.target.value })}
                  style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
              </div>
              <div>
                <label style={labelStyle}>Punto inicio</label>
                <select value={form.punto_inicio} onChange={e => setForm({ ...form, punto_inicio: e.target.value })}
                  style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}>
                  <option value="">Seleccionar</option>
                  {PUNTOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Punto fin</label>
                <select value={form.punto_fin} onChange={e => setForm({ ...form, punto_fin: e.target.value })}
                  style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}>
                  <option value="">Seleccionar</option>
                  {PUNTOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div style={{marginBottom:20}}>
              <label style={labelStyle}>Observaciones</label>
              <input type="text" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })}
                style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
                placeholder="Ej: intercambio de equipos, moto propia, etc." />
            </div>

            {empleados.length > 0 && (
              <div style={{borderTop:"1px solid #f1f5f9", paddingTop:16, marginBottom:20}}>
                <label style={labelStyle}>Técnicos en jornada</label>
                <div style={{display:"flex", flexWrap:"wrap", gap:8, marginTop:6}}>
                  {empleados.map(emp => {
                    const sel = tecnicosIds.includes(String(emp.id));
                    return (
                      <button key={emp.id} type="button" onClick={() => toggleTecnico(String(emp.id))}
                        style={{
                          display:"flex", alignItems:"center", gap:8, padding:"6px 12px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:500, transition:"all 150ms", border:"1.5px solid",
                          ...(sel
                            ? {background:"#eff6ff", borderColor:"#93c5fd", color:"#2563eb"}
                            : {background:"#fff", borderColor:"#e2e8f0", color:"#64748b"})
                        }}>
                        <span style={{width:8, height:8, borderRadius:"50%", background: sel ? "#2563eb" : "#cbd5e1"}} />
                        {emp.nombre}
                      </button>
                    );
                  })}
                </div>
                {tecnicosIds.length > 0 && (
                  <p style={{fontSize:11, color:"#94a3b8", marginTop:8}}>{tecnicosIds.length} técnico{tecnicosIds.length > 1 ? "s" : ""} seleccionado{tecnicosIds.length > 1 ? "s" : ""}</p>
                )}
              </div>
            )}

            {esEquipo2 && (
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, borderTop:"1px solid #f1f5f9", paddingTop:16, marginBottom:20}}>
                <div>
                  <label style={labelStyle}>Llegada GR/LCH</label>
                  <input type="time" value={form.llegada_gr_lch} onChange={e => setForm({ ...form, llegada_gr_lch: e.target.value })}
                    style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
                <div>
                  <label style={labelStyle}>Salida GR/LCH</label>
                  <input type="time" value={form.salida_gr_lch} onChange={e => setForm({ ...form, salida_gr_lch: e.target.value })}
                    style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                </div>
              </div>
            )}

            <div style={{display:"flex", alignItems:"center", gap:12}}>
              <button type="submit"
                style={{background:"#2563eb", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer"}}
                onMouseEnter={e => e.currentTarget.style.background="#1d4ed8"}
                onMouseLeave={e => e.currentTarget.style.background="#2563eb"}>
                Guardar
              </button>
              {msgMov && (
                <span style={{fontSize:13, fontWeight:500, color: msgMov.startsWith("Error") ? "#dc2626" : "#16a34a"}}>
                  {msgMov}
                </span>
              )}
            </div>
          </form>
        </>
      )}

      {/* ── Tab: Ausencias ── */}
      {tab === "ausencias" && (
        <div style={{display:"flex", flexDirection:"column", gap:20}}>
          <form onSubmit={guardarAusencia} style={{background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", padding:24}}>
            <h2 style={{fontSize:13, fontWeight:600, color:"#0f172a", marginBottom:20, paddingBottom:12, borderBottom:"1px solid #f1f5f9"}}>
              Registrar ausencia
            </h2>
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:16, marginBottom:20}}>
              <div>
                <label style={labelStyle}>Técnico</label>
                <select value={formAus.empleado_id} onChange={e => setFormAus({ ...formAus, empleado_id: e.target.value })}
                  style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} required>
                  <option value="">Seleccionar</option>
                  {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Desde</label>
                <input type="date" value={formAus.fecha_desde}
                  onChange={e => setFormAus({ ...formAus, fecha_desde: e.target.value, fecha_hasta: e.target.value })}
                  style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} required />
              </div>
              <div>
                <label style={labelStyle}>Hasta</label>
                <input type="date" value={formAus.fecha_hasta} min={formAus.fecha_desde}
                  onChange={e => setFormAus({ ...formAus, fecha_hasta: e.target.value })}
                  style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} required />
              </div>
            </div>

            <div style={{display:"flex", flexWrap:"wrap", gap:8, marginBottom:20}}>
              {TIPOS_LICENCIA.map(tipo => {
                const sel = formAus.tipo_licencia === tipo;
                const c = TIPO_COLOR[tipo] || TIPO_COLOR["Otro"];
                return (
                  <button key={tipo} type="button"
                    onClick={() => setFormAus({ ...formAus, tipo_licencia: tipo })}
                    style={{
                      padding:"5px 14px", borderRadius:20, fontSize:12.5, fontWeight:500, cursor:"pointer", border:"1.5px solid",
                      ...(sel
                        ? {background:c.bg, color:c.color, borderColor:c.color}
                        : {background:"#fff", color:"#64748b", borderColor:"#e2e8f0"})
                    }}>
                    {tipo}
                  </button>
                );
              })}
            </div>

            <div style={{display:"flex", alignItems:"center", gap:12}}>
              <button type="submit"
                style={{background:"#2563eb", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer"}}
                onMouseEnter={e => e.currentTarget.style.background="#1d4ed8"}
                onMouseLeave={e => e.currentTarget.style.background="#2563eb"}>
                Registrar
              </button>
              {msgAus && (
                <span style={{fontSize:13, fontWeight:500, color: msgAus.startsWith("Error") ? "#dc2626" : "#16a34a"}}>
                  {msgAus}
                </span>
              )}
            </div>
          </form>

          {/* Historial */}
          <div style={{background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", overflow:"hidden"}}>
            <div style={{padding:"14px 20px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12}}>
              <h2 style={{fontSize:13, fontWeight:600, color:"#0f172a", margin:0}}>Historial de ausencias</h2>
              <div style={{display:"flex", gap:8}}>
                <select value={filtroMes} onChange={e => setFiltroMes(Number(e.target.value))}
                  style={{...inputStyle, width:"auto"}} onFocus={inputFocus} onBlur={inputBlur}>
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select value={filtroAnio} onChange={e => setFiltroAnio(Number(e.target.value))}
                  style={{...inputStyle, width:"auto"}} onFocus={inputFocus} onBlur={inputBlur}>
                  {aniosDisponibles.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {ausenciasFiltradas.length === 0 ? (
              <p style={{fontSize:13, color:"#94a3b8", padding:"40px 20px", textAlign:"center"}}>
                No hay ausencias registradas para {MESES[filtroMes - 1]} {filtroAnio}
              </p>
            ) : (
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%", borderCollapse:"collapse"}}>
                  <thead>
                    <tr>
                      {["Técnico","Tipo","Desde","Hasta","Días",""].map((h, i) => (
                        <th key={i} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ausenciasFiltradas.map(a => {
                      const c = TIPO_COLOR[a.tipo_licencia] || TIPO_COLOR["Otro"];
                      return (
                        <tr key={a.id} style={{borderBottom:"1px solid #f1f5f9"}}
                          onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                          onMouseLeave={e => e.currentTarget.style.background=""}>
                          <td style={{...tdStyle, fontWeight:500}}>{nombreEmpleado(a.empleado_id)}</td>
                          <td style={tdStyle}>
                            <span style={{background:c.bg, color:c.color, borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:500}}>
                              {a.tipo_licencia || "—"}
                            </span>
                          </td>
                          <td style={{...tdStyle, fontFamily:"DM Mono, monospace", fontSize:11, color:"#64748b"}}>{a.fecha_desde}</td>
                          <td style={{...tdStyle, fontFamily:"DM Mono, monospace", fontSize:11, color:"#64748b"}}>{a.fecha_hasta}</td>
                          <td style={{...tdStyle, textAlign:"center", fontWeight:600}}>{calcDias(a.fecha_desde, a.fecha_hasta)}</td>
                          <td style={{...tdStyle, textAlign:"right"}}>
                            <button onClick={() => eliminarAusencia(a.id)}
                              style={{color:"#cbd5e1", background:"none", border:"none", cursor:"pointer", display:"inline-flex", alignItems:"center", justifyContent:"center", padding:4, borderRadius:6}}
                              onMouseEnter={e => { e.currentTarget.style.color="#dc2626"; e.currentTarget.style.background="#fef2f2"; }}
                              onMouseLeave={e => { e.currentTarget.style.color="#cbd5e1"; e.currentTarget.style.background="none"; }}>
                              <IconTrash />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
