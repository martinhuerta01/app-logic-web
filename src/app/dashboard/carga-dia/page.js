"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { fetchOpciones } from "@/lib/opciones";
import Link from "next/link";
import Modal, { BtnPrimary, BtnSecondary } from "@/components/Modal";

// Sin espacios, puntos ni guiones y en mayúsculas (igual que hace el servidor al guardar)
const limpiarPatente = (v) => v.toUpperCase().replace(/[\s.\-]/g, "");
// Formatos vigentes: AAA999 (antiguo), AA999AA (Mercosur), 999AAA y A999AAA (motos)
const patenteValida = (p) => /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2}|\d{3}[A-Z]{3}|[A-Z]\d{3}[A-Z]{3})$/.test(p);
const textoCliente = (c) => (c.base ? `${c.empresa || c.nombre} / ${c.base}` : (c.empresa || c.nombre));

// El servidor devuelve el conflicto como texto con el detalle adentro
const detalleDeError = (err) => {
  try { return JSON.parse(err.message)?.detail; } catch { return null; }
};

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

let nextId = 1;
const filaVacia = (opts) => ({
  _id: nextId++,
  tipo:         opts?.tipos?.[0]        || "INSTALACION",
  dispositivo:  opts?.dispositivos?.[0] || "GPS",
  patente:      "",
  estado:       opts?.estados?.[0]      || "PENDIENTE",
  observaciones:"",
});

const inputStyle = {
  padding: "7px 11px", borderRadius: 7, border: "1.5px solid #e2e8f0",
  background: "#f8fafc", fontSize: 13, outline: "none", fontFamily: "inherit", width: "100%",
};
const inputFocus = (e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; };
const inputBlur  = (e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };

const cellInputStyle = {
  padding: "5px 8px", borderRadius: 6, border: "1.5px solid #e2e8f0",
  background: "#f8fafc", fontSize: 12, outline: "none", fontFamily: "inherit", width: "100%",
};

export default function CargaDiaPage() {
  const { user } = useAuth();
  const [equipos,       setEquipos]       = useState([]);
  const [interior,      setInterior]      = useState([]);
  const [clientes,      setClientes]      = useState([]);
  const [opciones,      setOpciones]      = useState({ tipos: [], dispositivos: [], estados: [] });

  const [svcFecha,       setSvcFecha]       = useState(() => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }));
  const [svcResponsable, setSvcResponsable] = useState("");
  const [svcLocalidad,   setSvcLocalidad]   = useState("");
  const [svcHora,        setSvcHora]        = useState("");
  const [svcCliente,     setSvcCliente]     = useState("");

  const [filas,     setFilas]     = useState([]);
  const [feriado,   setFeriado]   = useState(false);
  const [svcMsg,    setSvcMsg]    = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorCarga,setErrorCarga]= useState("");
  const [duplicados,  setDuplicados]  = useState(null);
  const [pegarAbierto,setPegarAbierto]= useState(false);
  const [pegarTexto,  setPegarTexto]  = useState("");
  const [guardadosOk, setGuardadosOk] = useState(false);

  const tecnicoInterior = interior.find(t => t.nombre === svcResponsable);
  const esInterior = !!tecnicoInterior;
  const clienteElegido = clientes.find(c => textoCliente(c) === svcCliente);

  // La localidad se toma de Contactos al elegir el técnico o taller del interior
  useEffect(() => {
    setSvcLocalidad(tecnicoInterior?.localidad || "");
  }, [svcResponsable, interior]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchOpciones().then(opts => {
      setOpciones(opts);
      setFilas([filaVacia(opts)]);
    });

    Promise.all([
      api.get("/equipos/"),
      api.get("/directorio/interior"),
      api.get("/directorio/", { tipo: "cliente" }),
    ]).then(([eqs, int, cls]) => {
      setEquipos(eqs);
      setInterior(int);
      setClientes(cls);
    }).catch(() => setErrorCarga("No se pudieron cargar los datos iniciales. Verificá la conexión con el servidor."));
  }, []);

  const agregarFila = () => setFilas(prev => [...prev, filaVacia(opciones)]);
  const eliminarFila = (id) =>
    setFilas(prev => prev.length > 1 ? prev.filter(f => f._id !== id) : prev);
  const actualizarFila = (id, campo, valor) =>
    setFilas(prev => prev.map(f => f._id === id ? { ...f, [campo]: valor } : f));

  const onPatenteKeyDown = (e, fila) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nueva = { ...filaVacia(opciones), tipo: fila.tipo, dispositivo: fila.dispositivo, estado: fila.estado };
      setFilas(prev => {
        const idx = prev.findIndex(f => f._id === fila._id);
        const arr = [...prev];
        arr.splice(idx + 1, 0, nueva);
        return arr;
      });
    }
  };

  const repetirFila = (fila) => {
    const nueva = { ...filaVacia(opciones), tipo: fila.tipo, dispositivo: fila.dispositivo, estado: fila.estado, observaciones: fila.observaciones };
    setFilas(prev => {
      const idx = prev.findIndex(f => f._id === fila._id);
      const arr = [...prev];
      arr.splice(idx + 1, 0, nueva);
      return arr;
    });
  };

  const agregarPatentesPegadas = () => {
    const nuevas = [...new Set(pegarTexto.split(/[\s,;]+/).map(limpiarPatente).filter(Boolean))];
    if (nuevas.length === 0) return;
    setFilas(prev => {
      const conPatente = prev.filter(f => f.patente.trim());
      const existentes = new Set(conPatente.map(f => f.patente));
      const modelo = conPatente[conPatente.length - 1] || prev[prev.length - 1] || filaVacia(opciones);
      const agregadas = nuevas
        .filter(p => !existentes.has(p))
        .map(p => ({ ...filaVacia(opciones), tipo: modelo.tipo, dispositivo: modelo.dispositivo, estado: modelo.estado, patente: p }));
      return [...conPatente, ...agregadas, ...(agregadas.length || conPatente.length ? [] : [filaVacia(opciones)])];
    });
    setPegarTexto("");
    setPegarAbierto(false);
  };

  const toggleFeriado = (checked) => {
    setFeriado(checked);
    if (checked) {
      setSvcCliente("-");
      setFilas([{ ...filaVacia(opciones), tipo: "-", dispositivo: "-", estado: "-" }]);
    } else {
      setSvcCliente("");
      setFilas([filaVacia(opciones)]);
    }
  };

  const enviarLote = async (confirmarDuplicado) => {
    const filasValidas = feriado ? filas.slice(0, 1) : filas.filter(f => f.patente.trim());
    const equipo = equipos.find(eq => eq.nombre === svcResponsable);
    setGuardando(true);
    try {
      // Un solo pedido: se guardan todos los servicios del bloque o ninguno
      await api.post("/servicios/lote/", {
        confirmar_duplicado: confirmarDuplicado,
        servicios: filasValidas.map(f => ({
          fecha:          svcFecha,
          equipo_id:      equipo?.id || null,
          responsable:    svcResponsable,
          localidad:      esInterior ? svcLocalidad : null,
          hora_programada:svcHora || null,
          cliente:        svcCliente,
          cliente_ref:    clienteElegido?.id || null,
          tipo_servicio:  f.tipo,
          dispositivo:    f.dispositivo,
          patente:        f.patente,
          estado:         f.estado,
          observaciones:  f.observaciones || null,
          cargado_por:    user,
        })),
      });
      const n = filasValidas.length;
      setDuplicados(null);
      setSvcMsg(`✓ ${n} servicio${n > 1 ? "s" : ""} guardado${n > 1 ? "s" : ""}`);
      setGuardadosOk(true);
      setFilas([filaVacia(opciones)]);
      setSvcHora("");
      setSvcLocalidad("");
      setFeriado(false);
      setSvcCliente("");
    } catch (err) {
      const detalle = detalleDeError(err);
      if (detalle?.codigo === "DUPLICADO") {
        setDuplicados(detalle.duplicados);
      } else {
        setDuplicados(null);
        setSvcMsg("Error: " + (detalle?.mensaje || (typeof detalle === "string" ? detalle : err.message)));
        setGuardadosOk(false);
      }
    } finally {
      setGuardando(false);
    }
  };

  const guardarBloque = async (e) => {
    e.preventDefault();
    setSvcMsg("");
    setGuardadosOk(false);
    const filasValidas = feriado ? filas.slice(0, 1) : filas.filter(f => f.patente.trim());
    if (!feriado && filasValidas.length === 0) {
      setSvcMsg("Completá al menos una patente antes de guardar.");
      return;
    }
    await enviarLote(false);
  };

  const ClienteDropdown = () => {
    const grupos = {};
    clientes.forEach(c => {
      const key = c.empresa || c.nombre || "";
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(c);
    });
    const label = textoCliente;
    const val   = textoCliente;
    return (
      <select value={svcCliente} onChange={e => setSvcCliente(e.target.value)}
        disabled={feriado}
        style={{...inputStyle, opacity: feriado ? 0.5 : 1}}
        onFocus={inputFocus} onBlur={inputBlur}
        required>
        <option value="">Seleccionar</option>
        <option value="-">-</option>
        {Object.entries(grupos).map(([empresa, lista]) =>
          lista.length === 1
            ? <option key={lista[0].id} value={val(lista[0])}>{label(lista[0])}</option>
            : (
              <optgroup key={empresa} label={empresa}>
                {lista.map(c => <option key={c.id} value={val(c)}>{label(c)}</option>)}
              </optgroup>
            )
        )}
      </select>
    );
  };

  const filasConPatente = filas.filter(f => f.patente.trim()).length;

  return (
    <div style={{padding: "0 0 32px"}}>
      {/* Page header */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22, fontWeight:700, color:"#0f172a", margin:0}}>Carga del Día</h1>
          <p style={{fontSize:13, color:"#64748b", marginTop:4}}>Registrá los servicios del día por bloque</p>
        </div>
      </div>

      {errorCarga && (
        <div style={{background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"10px 16px", fontSize:13, marginBottom:16}}>
          {errorCarga}
        </div>
      )}

      <form onSubmit={guardarBloque}
        style={{background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", padding:24}}>
        <h2 style={{fontSize:13, fontWeight:600, color:"#0f172a", marginBottom:20, paddingBottom:12, borderBottom:"1px solid #f1f5f9"}}>
          Nuevo Bloque de Servicios
        </h2>

        {/* Datos comunes */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:16, marginBottom:24}}>
          <div>
            <label style={{display:"block", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", marginBottom:5}}>Fecha</label>
            <input type="date" value={svcFecha} onChange={e => setSvcFecha(e.target.value)}
              style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} required />
          </div>

          <div>
            <label style={{display:"block", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", marginBottom:5}}>Responsable</label>
            <select value={svcResponsable} onChange={e => setSvcResponsable(e.target.value)}
              style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} required>
              <option value="">Seleccionar</option>
              {equipos.length > 0 && (
                <optgroup label="Equipos">
                  {equipos.map(eq => <option key={eq.id} value={eq.nombre}>{eq.nombre}</option>)}
                </optgroup>
              )}
              {interior.length > 0 && (
                <optgroup label="Interior">
                  {interior.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                </optgroup>
              )}
            </select>
          </div>

          {esInterior && (
            <div>
              <label style={{display:"block", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", marginBottom:5}}>Localidad</label>
              <input type="text" value={svcLocalidad} onChange={e => setSvcLocalidad(e.target.value)}
                placeholder="Ej: Rosario"
                style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
              <p style={{fontSize:10.5, marginTop:4, color: tecnicoInterior?.localidad ? "#94a3b8" : "#d97706"}}>
                {tecnicoInterior?.localidad
                  ? "Tomada de Contactos; podés cambiarla para este bloque."
                  : "Este contacto no tiene localidad cargada. Completala en Contactos → Técnicos / Talleres."}
              </p>
            </div>
          )}

          <div>
            <label style={{display:"block", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", marginBottom:5}}>Hora</label>
            <input type="time" value={svcHora} onChange={e => setSvcHora(e.target.value)}
              style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
          </div>

          <div>
            <label style={{display:"block", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", marginBottom:5}}>Cliente</label>
            <ClienteDropdown />
          </div>
        </div>

        {/* Tabla de servicios */}
        <div style={{marginBottom:20}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10}}>
            <p style={{fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8"}}>
              Servicios del bloque
            </p>
            <span style={{fontSize:11, color:"#94a3b8"}}>{filas.length} fila{filas.length !== 1 ? "s" : ""}</span>
          </div>

          <div style={{background:"#fff", borderRadius:8, border:"1px solid #e2e8f0", overflow:"hidden"}}>
            <table style={{width:"100%", borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  <th style={{textAlign:"left", padding:"8px 14px", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9", width:160}}>Tipo</th>
                  <th style={{textAlign:"left", padding:"8px 14px", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9", width:150}}>Dispositivo</th>
                  <th style={{textAlign:"left", padding:"8px 14px", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9", width:110}}>Patente</th>
                  <th style={{textAlign:"left", padding:"8px 14px", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9", width:150}}>Estado</th>
                  <th style={{textAlign:"left", padding:"8px 14px", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9"}}>Observaciones</th>
                  <th style={{padding:"8px 14px", background:"#f8fafc", borderBottom:"1px solid #f1f5f9", width:40}}></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, idx) => (
                  <tr key={fila._id}
                    style={{borderBottom: idx < filas.length - 1 ? "1px solid #f1f5f9" : "none"}}
                    onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background=""}>
                    <td style={{padding:"8px 14px"}}>
                      <select value={fila.tipo}
                        onChange={e => actualizarFila(fila._id, "tipo", e.target.value)}
                        disabled={feriado}
                        style={{...cellInputStyle, opacity: feriado ? 0.5 : 1}}
                        onFocus={inputFocus} onBlur={inputBlur}>
                        <option value="-">-</option>
                        {opciones.tipos.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={{padding:"8px 14px"}}>
                      <select value={fila.dispositivo}
                        onChange={e => actualizarFila(fila._id, "dispositivo", e.target.value)}
                        disabled={feriado}
                        style={{...cellInputStyle, opacity: feriado ? 0.5 : 1}}
                        onFocus={inputFocus} onBlur={inputBlur}>
                        <option value="-">-</option>
                        {opciones.dispositivos.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </td>
                    <td style={{padding:"8px 14px"}}>
                      <input type="text"
                        value={fila.patente}
                        onChange={e => actualizarFila(fila._id, "patente", limpiarPatente(e.target.value))}
                        onKeyDown={e => onPatenteKeyDown(e, fila)}
                        disabled={feriado}
                        placeholder="AB123CD"
                        title={fila.patente && !patenteValida(fila.patente) ? "El formato no coincide con una patente argentina (por ejemplo AB123CD o ABC123). Se puede guardar igual." : undefined}
                        style={{
                          ...cellInputStyle, fontFamily:"DM Mono, monospace", opacity: feriado ? 0.5 : 1,
                          ...(fila.patente && !patenteValida(fila.patente) ? { borderColor:"#f59e0b", background:"#fffbeb" } : {}),
                        }}
                        onFocus={inputFocus} onBlur={inputBlur} />
                    </td>
                    <td style={{padding:"8px 14px"}}>
                      <select value={fila.estado}
                        onChange={e => actualizarFila(fila._id, "estado", e.target.value)}
                        disabled={feriado}
                        style={{...cellInputStyle, opacity: feriado ? 0.5 : 1}}
                        onFocus={inputFocus} onBlur={inputBlur}>
                        <option value="-">-</option>
                        {opciones.estados.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{padding:"8px 14px"}}>
                      <input type="text"
                        value={fila.observaciones}
                        onChange={e => actualizarFila(fila._id, "observaciones", e.target.value)}
                        placeholder="Opcional"
                        style={cellInputStyle}
                        onFocus={inputFocus} onBlur={inputBlur} />
                    </td>
                    <td style={{padding:"8px 14px", textAlign:"center", whiteSpace:"nowrap"}}>
                      <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:10}}>
                      {!feriado && (
                        <button type="button" onClick={() => repetirFila(fila)} title="Repetir esta fila (mismo tipo, dispositivo y estado)"
                          style={{color:"#2563eb", background:"none", border:"none", cursor:"pointer", fontSize:11.5, fontWeight:600}}>
                          Repetir
                        </button>
                      )}
                      <button type="button"
                        onClick={() => eliminarFila(fila._id)}
                        disabled={filas.length === 1}
                        style={{color:"#fca5a5", background:"none", border:"none", cursor:"pointer", opacity: filas.length === 1 ? 0.3 : 1, display:"flex", alignItems:"center", justifyContent:"center"}}
                        onMouseEnter={e => { if (filas.length > 1) e.currentTarget.style.color="#dc2626"; }}
                        onMouseLeave={e => e.currentTarget.style.color="#fca5a5"}>
                        <IconTrash />
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!feriado && (
              <div style={{borderTop:"1px solid #f1f5f9", padding:"8px 14px"}}>
                <div style={{display:"flex", alignItems:"center", gap:20}}>
                  <button type="button" onClick={agregarFila}
                    style={{display:"flex", alignItems:"center", gap:4, fontSize:12, color:"#2563eb", background:"none", border:"none", cursor:"pointer", fontWeight:500}}
                    onMouseEnter={e => e.currentTarget.style.color="#1d4ed8"}
                    onMouseLeave={e => e.currentTarget.style.color="#2563eb"}>
                    <span style={{fontSize:16, lineHeight:1}}>+</span> Agregar fila
                  </button>
                  <button type="button" onClick={() => setPegarAbierto(v => !v)}
                    style={{fontSize:12, color:"#2563eb", background:"none", border:"none", cursor:"pointer", fontWeight:500}}>
                    {pegarAbierto ? "Cerrar" : "Pegar lista de patentes"}
                  </button>
                </div>
                {pegarAbierto && (
                  <div style={{marginTop:10, display:"flex", flexDirection:"column", gap:8}}>
                    <textarea value={pegarTexto} onChange={e => setPegarTexto(e.target.value)} rows={4}
                      placeholder="Pegá una patente por línea (o separadas por coma). Se crea una fila por patente con el mismo tipo, dispositivo y estado de la última fila."
                      style={{...inputStyle, fontFamily:"DM Mono, monospace", resize:"vertical"}} />
                    <div>
                      <BtnPrimary onClick={agregarPatentesPegadas} disabled={!pegarTexto.trim()}>Agregar patentes</BtnPrimary>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <p style={{fontSize:11, color:"#94a3b8", marginTop:6}}>
            Tip: presioná <kbd style={{background:"#f1f5f9", border:"1px solid #e2e8f0", borderRadius:4, padding:"1px 5px", fontSize:10}}>Enter</kbd> en Patente para agregar la siguiente fila automáticamente.
          </p>
        </div>

        {/* Acciones */}
        <div style={{display:"flex", alignItems:"center", gap:16, paddingTop:4}}>
          <button type="submit" disabled={guardando}
            style={{background: guardando ? "#93c5fd" : "#2563eb", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, cursor: guardando ? "not-allowed" : "pointer"}}
            onMouseEnter={e => { if (!guardando) e.currentTarget.style.background="#1d4ed8"; }}
            onMouseLeave={e => { if (!guardando) e.currentTarget.style.background="#2563eb"; }}>
            {guardando
              ? "Guardando…"
              : `Guardar ${feriado ? 1 : filasConPatente || ""} servicio${(feriado ? 1 : filasConPatente) !== 1 ? "s" : ""}`}
          </button>

          <label style={{display:"flex", alignItems:"center", gap:8, cursor:"pointer", userSelect:"none"}}>
            <input type="checkbox" checked={feriado} onChange={e => toggleFeriado(e.target.checked)}
              style={{width:16, height:16, accentColor:"#f97316", cursor:"pointer"}} />
            <span style={{fontSize:13, fontWeight:600, color: feriado ? "#ea580c" : "#64748b"}}>FERIADO</span>
          </label>

          {svcMsg && (
            <span style={{fontSize:13, fontWeight:500, color: svcMsg.startsWith("Error") ? "#dc2626" : "#16a34a"}}>
              {svcMsg}
              {guardadosOk && (
                <> &middot; <Link href="/dashboard/vista-dia" style={{color:"#2563eb", textDecoration:"underline"}}>Ver la vista del día</Link></>
              )}
            </span>
          )}
        </div>
      </form>

      <Modal
        open={!!duplicados}
        onClose={() => { if (!guardando) setDuplicados(null); }}
        title="Ya existe un servicio igual"
        width="560px"
        footer={
          <>
            <span style={{fontSize:11.5, color:"#94a3b8"}}>No se guardó nada todavía.</span>
            <div style={{display:"flex", gap:8}}>
              <BtnSecondary onClick={() => setDuplicados(null)}>Cancelar</BtnSecondary>
              <BtnPrimary onClick={() => enviarLote(true)} loading={guardando}>Cargar igual</BtnPrimary>
            </div>
          </>
        }
      >
        <p style={{margin:"0 0 12px", fontSize:13, color:"#334155", lineHeight:1.5}}>
          Hay servicios con la misma patente, tipo y fecha. Revisá si es un error de carga o si de verdad hace falta cargarlo dos veces.
          Si confirmás, se guardan todos los servicios del bloque y los repetidos quedan anotados como &ldquo;Duplicado confirmado&rdquo;.
        </p>
        <div style={{border:"1px solid #e2e8f0", borderRadius:8, overflow:"hidden", marginBottom:16}}>
          {(duplicados || []).map((d, i) => (
            <div key={i} style={{padding:"9px 12px", fontSize:12.5, color:"#334155", borderBottom: i < duplicados.length - 1 ? "1px solid #f1f5f9" : "none"}}>
              <strong style={{fontFamily:"DM Mono, monospace"}}>{d.patente}</strong> &middot; {d.tipo_servicio} &middot; {d.fecha.split("-").reverse().join("/")}
              <div style={{fontSize:11.5, color:"#94a3b8", marginTop:2}}>
                {d.en_este_lote
                  ? "Está repetido dentro de este mismo bloque"
                  : `Ya cargado: ${d.estado}${d.responsable ? " · " + d.responsable : ""}${d.cliente ? " · " + d.cliente : ""}`}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
