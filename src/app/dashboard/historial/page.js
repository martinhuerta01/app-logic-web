"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Modal, { BtnSecondary } from "@/components/Modal";

const MESES_NOMBRES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_SEMANA   = ["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"];

const inputStyle = {
  padding: "7px 11px", borderRadius: 7, border: "1.5px solid #e2e8f0",
  background: "#f8fafc", fontSize: 13, outline: "none", fontFamily: "inherit",
};
const inputFocus = (e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; };
const inputBlur  = (e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };

const thStyle = {textAlign:"left", padding:"8px 16px", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9"};
const tdStyle  = {padding:"9px 16px", fontSize:12.5, color:"#334155"};

const ESTADO_BADGE = {
  REALIZADO:  { bg:"#f0fdf4", color:"#16a34a" },
  CONFIRMADO: { bg:"#eff6ff", color:"#2563eb" },
  PENDIENTE:  { bg:"#fffbeb", color:"#d97706" },
  SUSPENDIDO: { bg:"#fef2f2", color:"#dc2626" },
};

function EstadoBadge({ estado }) {
  const s = ESTADO_BADGE[estado] || { bg:"#f1f5f9", color:"#64748b" };
  return (
    <span style={{display:"inline-flex", alignItems:"center", gap:4, background:s.bg, color:s.color, borderRadius:6, padding:"2px 8px", fontSize:10.5, fontWeight:600}}>
      <span style={{width:5, height:5, borderRadius:"50%", background:s.color, display:"inline-block"}} />
      {estado || "—"}
    </span>
  );
}

// ─── Modal detalle de un día ──────────────────────────────────────────────────
function ModalDia({ fecha, svcEquipos, svcInterior, equipos, onClose }) {
  const todosDia = [...svcEquipos, ...svcInterior].filter(s => s.fecha === fecha);

  const [anioN, mesN, diaN] = fecha.split("-").map(Number);
  const dateObj = new Date(anioN, mesN - 1, diaN);
  const DIAS_N = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const titulo = `${DIAS_N[dateObj.getDay()]} ${diaN} de ${MESES_NOMBRES[mesN - 1]}`;

  const EQ_COLORS = ["#2563eb","#ea580c"];
  const INT_COLOR = "#7c3aed";

  const grupos = equipos.map((eq, idx) => ({
    nombre: eq.nombre,
    svcs: todosDia.filter(s => String(s.equipo_id) === String(eq.id) || s.responsable === eq.nombre),
    color: EQ_COLORS[idx] || "#2563eb",
  }));
  const interiorGrupo = {
    nombre: "Interior",
    svcs: todosDia.filter(s => !s.equipo_id),
    color: INT_COLOR,
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={titulo}
      width="820px"
      footer={
        <div style={{marginLeft:"auto"}}>
          <BtnSecondary onClick={onClose}>Cerrar</BtnSecondary>
        </div>
      }
    >
      <div style={{display:"flex", flexDirection:"column", gap:16}}>
        {[...grupos, interiorGrupo].map(g => (
          <div key={g.nombre} style={{borderRadius:8, border:"1px solid #e2e8f0", overflow:"hidden"}}>
            <div style={{background:g.color, padding:"8px 16px", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <span style={{fontSize:13, fontWeight:600, color:"#fff"}}>{g.nombre}</span>
              <span style={{fontSize:11, color:"rgba(255,255,255,0.8)"}}>
                {g.svcs.length} servicio{g.svcs.length !== 1 ? "s" : ""}
              </span>
            </div>
            {g.svcs.length === 0 ? (
              <div style={{padding:"10px 16px", fontSize:12, color:"#94a3b8", fontStyle:"italic"}}>Sin servicios este día</div>
            ) : (
              <table style={{width:"100%", borderCollapse:"collapse"}}>
                <thead>
                  <tr>
                    {["Hora","Cliente","Tipo","Dispositivo","Patente","Estado","Observaciones"].map(h => (
                      <th key={h} style={{...thStyle, background:"#fafbfc"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.svcs.map((s, i) => (
                    <tr key={i} style={{borderBottom:"1px solid #f1f5f9"}}
                      onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background=""}>
                      <td style={{...tdStyle, fontFamily:"DM Mono, monospace", fontSize:11, color:"#64748b"}}>{s.hora_programada?.slice(0,5) || "—"}</td>
                      <td style={{...tdStyle, fontWeight:500}}>
                        {s.tipo_servicio === "-"
                          ? <span style={{background:"#fff7ed", color:"#ea580c", border:"1px solid #fed7aa", borderRadius:6, padding:"2px 7px", fontSize:10.5, fontWeight:700}}>FERIADO</span>
                          : s.cliente}
                      </td>
                      <td style={{...tdStyle, color:"#2563eb", fontWeight:500}}>{s.tipo_servicio === "-" ? "—" : s.tipo_servicio}</td>
                      <td style={tdStyle}>{s.dispositivo || "—"}</td>
                      <td style={{...tdStyle, fontFamily:"DM Mono, monospace", fontSize:11, color:"#64748b"}}>{s.patente || "—"}</td>
                      <td style={tdStyle}><EstadoBadge estado={s.estado} /></td>
                      <td style={{...tdStyle, color:"#64748b"}}>{s.observaciones || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─── Grilla de calendario ──────────────────────────────────────────────────────
function CalendarioVista({ mes, anio, svcEquipos, svcInterior, equipos, onDayClick }) {
  const _ar = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
  const mesNum  = parseInt(mes)  || parseInt(_ar.split("-")[1]);
  const anioNum = parseInt(anio) || parseInt(_ar.split("-")[0]);

  const diasEnMes  = new Date(anioNum, mesNum, 0).getDate();
  const primerDow  = new Date(anioNum, mesNum - 1, 1).getDay();
  const offsetLun  = (primerDow + 6) % 7;

  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });

  const ESTADOS_ABIERTOS = new Set(["PENDIENTE", "CONFIRMADO"]);
  const porFecha = {};
  svcEquipos.forEach(s => {
    if (!porFecha[s.fecha]) porFecha[s.fecha] = { equipos: {}, interior: 0, sinCerrar: 0 };
    const nombre = equipos.find(e => String(e.id) === String(s.equipo_id))?.nombre || s.responsable || "?";
    porFecha[s.fecha].equipos[nombre] = (porFecha[s.fecha].equipos[nombre] || 0) + 1;
    if (ESTADOS_ABIERTOS.has(s.estado)) porFecha[s.fecha].sinCerrar++;
  });
  svcInterior.forEach(s => {
    if (!porFecha[s.fecha]) porFecha[s.fecha] = { equipos: {}, interior: 0, sinCerrar: 0 };
    porFecha[s.fecha].interior++;
    if (ESTADOS_ABIERTOS.has(s.estado)) porFecha[s.fecha].sinCerrar++;
  });

  const cells = [...Array(offsetLun).fill(null), ...Array.from({length: diasEnMes}, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const EQ_COLORS = ["#2563eb","#ea580c"];
  const INT_COLOR = "#7c3aed";

  return (
    <div style={{background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", overflow:"hidden"}}>
      <div style={{background:"#1e293b", color:"#fff", padding:"12px 20px", textAlign:"center"}}>
        <h2 style={{fontSize:12, fontWeight:700, letterSpacing:"0.12em", margin:0}}>
          {mes ? MESES_NOMBRES[mesNum - 1].toUpperCase() : "MES"} {anio}
        </h2>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"repeat(7, 1fr)", borderBottom:"1px solid #e2e8f0"}}>
        {DIAS_SEMANA.map(d => (
          <div key={d} style={{textAlign:"center", fontSize:10, fontWeight:600, padding:"8px 0", color: d === "SÁB" || d === "DOM" ? "#94a3b8" : "#64748b"}}>
            {d}
          </div>
        ))}
      </div>

      <div style={{display:"grid", gridTemplateColumns:"repeat(7, 1fr)"}}>
        {cells.map((dia, idx) => {
          if (!dia) return <div key={idx} style={{minHeight:96, background:"#f8fafc"}} />;

          const isWeekend = idx % 7 >= 5;
          const fechaStr = `${anioNum}-${String(mesNum).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
          const isHoy = fechaStr === hoy;
          const data = porFecha[fechaStr];
          const hasSvcs = data && (Object.keys(data.equipos).length > 0 || data.interior > 0);

          return (
            <div key={idx}
              onClick={() => hasSvcs && onDayClick(fechaStr)}
              style={{
                minHeight:96, padding:6, userSelect:"none",
                background: isWeekend ? "#f8fafc" : "#fff",
                cursor: hasSvcs ? "pointer" : "default",
                outline: isHoy ? "2px solid #60a5fa" : "none",
                outlineOffset: isHoy ? "-2px" : "0",
                borderRight:"1px solid #f1f5f9",
                borderBottom:"1px solid #f1f5f9",
                transition:"background 120ms",
              }}
              onMouseEnter={e => { if (hasSvcs) e.currentTarget.style.background="#f0f9ff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = isWeekend ? "#f8fafc" : "#fff"; }}>
              <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:6}}>
                <span style={{fontSize:11, fontWeight:700, color: isHoy ? "#2563eb" : hasSvcs ? "#334155" : "#cbd5e1"}}>
                  {dia}
                  {isHoy && <span style={{marginLeft:4, fontSize:9, color:"#93c5fd", fontWeight:400}}>hoy</span>}
                </span>
                {data?.sinCerrar > 0 && (
                  <span style={{background:"#fef9c3", color:"#854d0e", fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:10, lineHeight:1.4}}>
                    ⚠ {data.sinCerrar}
                  </span>
                )}
              </div>
              {hasSvcs && (
                <div style={{display:"flex", flexDirection:"column", gap:2}}>
                  {equipos.map((eq, eqIdx) => {
                    const count = data.equipos[eq.nombre] || 0;
                    if (!count) return null;
                    return (
                      <div key={eq.id} style={{fontSize:10, borderRadius:4, padding:"1px 6px", fontWeight:500, background:EQ_COLORS[eqIdx] || "#2563eb", color:"#fff"}}>
                        {eq.nombre}: <strong>{count}</strong>
                      </div>
                    );
                  })}
                  {data.interior > 0 && (
                    <div style={{fontSize:10, borderRadius:4, padding:"1px 6px", fontWeight:500, background:INT_COLOR, color:"#fff"}}>
                      Interior: <strong>{data.interior}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div style={{borderTop:"1px solid #f1f5f9", padding:"10px 16px", display:"flex", gap:16, flexWrap:"wrap"}}>
        {equipos.map((eq, idx) => (
          <span key={eq.id} style={{display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#64748b"}}>
            <span style={{width:12, height:12, borderRadius:3, background:EQ_COLORS[idx] || "#2563eb"}} />
            {eq.nombre}
          </span>
        ))}
        <span style={{display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#64748b"}}>
          <span style={{width:12, height:12, borderRadius:3, background:INT_COLOR}} /> Interior
        </span>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function HistorialPage() {
  const hoyDate = new Date(new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }) + "T00:00:00");
  const [equipos,     setEquipos]     = useState([]);
  const [svcEquipos,  setSvcEquipos]  = useState([]);
  const [svcInterior, setSvcInterior] = useState([]);
  const [filtroMes,   setFiltroMes]   = useState(String(hoyDate.getMonth() + 1));
  const [filtroAnio,  setFiltroAnio]  = useState(String(hoyDate.getFullYear()));
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [busquedaActiva, setBusquedaActiva] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [error,    setError]    = useState("");

  const buscar = async (mes = filtroMes, anio = filtroAnio) => {
    setError("");
    setCargando(true);
    const params = {};
    if (mes)  params.mes  = mes;
    if (anio) params.anio = anio;
    try {
      const [eq, int] = await Promise.all([
        api.get("/servicios/", { ...params, tipo: "equipos" }),
        api.get("/servicios/", { ...params, tipo: "interior" }),
      ]);
      setSvcEquipos(eq);
      setSvcInterior(int);
    } catch { setError("Error al buscar servicios. Verificá la conexión con el servidor."); }
    finally  { setCargando(false); }
  };

  const buscarTexto = async (texto) => {
    if (!texto.trim()) return;
    setBusquedaActiva(texto);
    setCargandoBusqueda(true);
    setError("");
    try {
      const params = { anio: filtroAnio };
      const [eq, int] = await Promise.all([
        api.get("/servicios/", { ...params, tipo: "equipos" }),
        api.get("/servicios/", { ...params, tipo: "interior" }),
      ]);
      const todos = [...(eq || []), ...(int || [])];
      const q = texto.toLowerCase();
      const filtrados = todos.filter(s =>
        [s.patente, s.cliente, s.responsable, s.tipo_servicio, s.dispositivo, s.observaciones, s.estado]
          .some(v => v?.toLowerCase().includes(q))
      ).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
      setResultadosBusqueda(filtrados);
    } catch { setError("Error al buscar. Verificá la conexión con el servidor."); }
    finally  { setCargandoBusqueda(false); }
  };

  const limpiarBusqueda = () => {
    setBusquedaActiva("");
    setTextoBusqueda("");
    setResultadosBusqueda([]);
  };

  useEffect(() => {
    api.get("/equipos/").then(eqs => {
      setEquipos(eqs);
      buscar();
    }).catch(() => {
      setError("No se pudieron cargar los equipos.");
      buscar();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{paddingBottom:32}}>
      {/* Page header */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22, fontWeight:700, color:"#0f172a", margin:0}}>Historial de Servicios</h1>
          <p style={{fontSize:13, color:"#64748b", marginTop:4}}>Navegá por mes o buscá en todo el año</p>
        </div>
      </div>

      {error && (
        <div style={{background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"10px 16px", fontSize:13, marginBottom:16}}>
          {error}
        </div>
      )}

      {/* Filtros */}
      <div style={{display:"flex", alignItems:"flex-end", gap:12, flexWrap:"wrap", marginBottom:16}}>
        <div>
          <label style={{display:"block", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", marginBottom:5}}>Mes</label>
          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
            style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}>
            {MESES_NOMBRES.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{display:"block", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", marginBottom:5}}>Año</label>
          <select value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)}
            style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}>
            <option>2025</option><option>2026</option><option>2027</option>
          </select>
        </div>
        <button onClick={() => { buscar(filtroMes, filtroAnio); setBusquedaActiva(""); setTextoBusqueda(""); }} disabled={cargando}
          style={{background: cargando ? "#93c5fd" : "#2563eb", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, cursor: cargando ? "not-allowed" : "pointer"}}
          onMouseEnter={e => { if (!cargando) e.currentTarget.style.background="#1d4ed8"; }}
          onMouseLeave={e => { if (!cargando) e.currentTarget.style.background="#2563eb"; }}>
          {cargando ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {/* Buscador */}
      <div style={{display:"flex", gap:8, marginBottom:24}}>
        <input
          type="text"
          placeholder="Buscar por patente, cliente, responsable, tipo..."
          value={textoBusqueda}
          onChange={e => setTextoBusqueda(e.target.value)}
          onKeyDown={e => e.key === "Enter" && buscarTexto(textoBusqueda)}
          style={{...inputStyle, flex:1}}
          onFocus={inputFocus} onBlur={inputBlur}
        />
        <button onClick={() => buscarTexto(textoBusqueda)} disabled={cargandoBusqueda}
          style={{background: cargandoBusqueda ? "#93c5fd" : "#2563eb", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:600, cursor: cargandoBusqueda ? "not-allowed" : "pointer"}}
          onMouseEnter={e => { if (!cargandoBusqueda) e.currentTarget.style.background="#1d4ed8"; }}
          onMouseLeave={e => { if (!cargandoBusqueda) e.currentTarget.style.background="#2563eb"; }}>
          {cargandoBusqueda ? "Buscando…" : "Buscar"}
        </button>
        {busquedaActiva && (
          <button onClick={limpiarBusqueda}
            style={{background:"#f8fafc", color:"#475569", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:500, cursor:"pointer"}}
            onMouseEnter={e => e.currentTarget.style.background="#e9edf1"}
            onMouseLeave={e => e.currentTarget.style.background="#f8fafc"}>
            Limpiar
          </button>
        )}
      </div>

      {/* Resultados de búsqueda o Calendario */}
      {busquedaActiva ? (
        <div style={{background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", overflow:"hidden"}}>
          <div style={{padding:"12px 20px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
            <div>
              <span style={{fontSize:13, fontWeight:600, color:"#0f172a"}}>
                Resultados para &quot;{busquedaActiva}&quot;
              </span>
              {!cargandoBusqueda && (
                <span style={{fontSize:11, color:"#94a3b8", marginLeft:8}}>
                  {resultadosBusqueda.length} encontrado{resultadosBusqueda.length !== 1 ? "s" : ""}
                  <span style={{marginLeft:4, color:"#cbd5e1"}}>— año {filtroAnio}</span>
                </span>
              )}
            </div>
          </div>
          {cargandoBusqueda ? (
            <div style={{padding:"40px 20px", textAlign:"center", fontSize:13, color:"#94a3b8"}}>Buscando en todos los meses…</div>
          ) : resultadosBusqueda.length === 0 ? (
            <div style={{padding:"40px 20px", textAlign:"center", fontSize:13, color:"#94a3b8"}}>Sin resultados</div>
          ) : (
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%", borderCollapse:"collapse"}}>
                <thead>
                  <tr>
                    {["Fecha","Responsable","Cliente","Tipo","Dispositivo","Patente","Estado","Observaciones"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultadosBusqueda.map((s, i) => (
                    <tr key={i} style={{borderBottom:"1px solid #f1f5f9"}}
                      onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background=""}>
                      <td style={{...tdStyle, fontFamily:"DM Mono, monospace", fontSize:11, color:"#64748b"}}>{s.fecha?.split("-").reverse().join("/")}</td>
                      <td style={{...tdStyle, fontWeight:500}}>{s.equipos?.nombre || s.responsable || "Interior"}</td>
                      <td style={tdStyle}>{s.tipo_servicio === "-" ? "FERIADO" : (s.cliente || "—")}</td>
                      <td style={{...tdStyle, color:"#2563eb", fontWeight:500}}>{s.tipo_servicio === "-" ? "—" : (s.tipo_servicio || "—")}</td>
                      <td style={tdStyle}>{s.dispositivo || "—"}</td>
                      <td style={{...tdStyle, fontFamily:"DM Mono, monospace", fontSize:11, color:"#64748b", fontWeight:500}}>{s.patente || "—"}</td>
                      <td style={tdStyle}><EstadoBadge estado={s.estado} /></td>
                      <td style={{...tdStyle, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#64748b"}}>{s.observaciones || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <CalendarioVista
          mes={filtroMes}
          anio={filtroAnio}
          svcEquipos={svcEquipos}
          svcInterior={svcInterior}
          equipos={equipos}
          onDayClick={setDiaSeleccionado}
        />
      )}

      {diaSeleccionado && (
        <ModalDia
          fecha={diaSeleccionado}
          svcEquipos={svcEquipos}
          svcInterior={svcInterior}
          equipos={equipos}
          onClose={() => setDiaSeleccionado(null)}
        />
      )}
    </div>
  );
}
