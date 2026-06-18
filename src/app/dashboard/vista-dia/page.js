"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Modal, { BtnPrimary, BtnSecondary, KeyboardHint, FieldLabel, FieldInput, FieldSelect } from "@/components/Modal";
import { fetchOpciones } from "@/lib/opciones";

const inputStyle = {
  padding: "7px 11px", borderRadius: 7, border: "1.5px solid #e2e8f0",
  background: "#f8fafc", fontSize: 13, outline: "none", fontFamily: "inherit",
};
const inputFocus = (e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; };
const inputBlur  = (e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };

function ModalEditar({ servicio, onClose, onSave, estadosOpts = [] }) {
  const [form, setForm] = useState({
    fecha: servicio.fecha || "",
    hora_programada: servicio.hora_programada?.slice(0, 5) || "",
    cliente: servicio.cliente || "",
    tipo_servicio: servicio.tipo_servicio || "INSTALACION",
    dispositivo: servicio.dispositivo || "",
    patente: servicio.patente || "",
    observaciones: servicio.observaciones || "",
    estado: servicio.estado || "-",
  });
  const [dispositivos, setDispositivos] = useState([]);
  useEffect(() => {
    fetchOpciones().then(opts => setDispositivos(opts.dispositivos || []));
  }, []);

  const guardar = async () => {
    await onSave(servicio.id, form);
    onClose();
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Editar Servicio"
      width="540px"
      footer={
        <>
          <KeyboardHint />
          <div style={{display:"flex", gap:8}}>
            <BtnSecondary onClick={onClose}>Cancelar</BtnSecondary>
            <BtnPrimary onClick={guardar}>Guardar</BtnPrimary>
          </div>
        </>
      }
    >
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
        <div>
          <FieldLabel required>Fecha</FieldLabel>
          <FieldInput type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Hora</FieldLabel>
          <FieldInput type="time" value={form.hora_programada} onChange={e => setForm({ ...form, hora_programada: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Cliente</FieldLabel>
          <FieldInput type="text" value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Tipo</FieldLabel>
          <FieldSelect value={form.tipo_servicio} onChange={e => setForm({ ...form, tipo_servicio: e.target.value })}>
            <option value="-">-</option>
            <option>INSTALACION</option>
            <option>REVISION</option>
            <option>DESINSTALACION</option>
          </FieldSelect>
        </div>
        <div>
          <FieldLabel>Dispositivo</FieldLabel>
          <FieldSelect value={form.dispositivo} onChange={e => setForm({ ...form, dispositivo: e.target.value })}>
            <option value="">-</option>
            {dispositivos.map(d => <option key={d} value={d}>{d}</option>)}
          </FieldSelect>
        </div>
        <div>
          <FieldLabel>Patente</FieldLabel>
          <FieldInput type="text" value={form.patente} onChange={e => setForm({ ...form, patente: e.target.value.toUpperCase() })} />
        </div>
        <div>
          <FieldLabel>Observaciones</FieldLabel>
          <FieldInput type="text" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Estado</FieldLabel>
          <FieldSelect value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
            <option value="-">-</option>
            {estadosOpts.map(e => <option key={e} value={e}>{e}</option>)}
          </FieldSelect>
        </div>
      </div>
    </Modal>
  );
}

export default function VistaDiaPage() {
  const [fecha, setFecha] = useState(() => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }));
  const [equipos, setEquipos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [vista, setVista] = useState("interna");
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState("");
  const [estados, setEstados] = useState([]);

  useEffect(() => {
    api.get("/equipos/").then(setEquipos).catch(() => setError("No se pudieron cargar los equipos."));
    fetchOpciones().then(opts => setEstados(opts.estados || []));
  }, []);

  const buscar = async () => {
    setError("");
    try {
      const [svcs, movs] = await Promise.all([
        api.get("/servicios/", { fecha }),
        api.get("/movimientos-camioneta/", { fecha }),
      ]);
      setServicios(svcs);
      setMovimientos(movs);
    } catch { setError("Error al buscar servicios. Verificá la conexión con el servidor."); }
  };

  const cambiarEstado = async (svcId, nuevoEstado) => {
    try {
      await api.put(`/servicios/${svcId}`, { estado: nuevoEstado });
      setServicios(prev => prev.map(s => s.id === svcId ? { ...s, estado: nuevoEstado } : s));
    } catch { setError("No se pudo actualizar el estado."); }
  };

  const eliminar = async (svcId) => {
    if (!confirm("¿Eliminar este servicio?")) return;
    try {
      await api.delete(`/servicios/${svcId}`);
      setServicios(prev => prev.filter(s => s.id !== svcId));
    } catch { setError("No se pudo eliminar el servicio."); }
  };

  const guardarEdicion = async (id, form) => {
    await api.put(`/servicios/${id}`, form);
    setServicios(prev => prev.map(s => s.id === id ? { ...s, ...form } : s));
  };

  const getMovimiento = (equipoId) => movimientos.find(m => m.equipo_id === equipoId && m.fecha === fecha);
  const svcEquipo = (eqId) => servicios.filter(s => s.equipo_id === eqId);
  const svcInterior = servicios.filter(s => !s.equipo_id);

  const estadoBadge = (estado) => {
    const map = {
      REALIZADO:  { bg:"#f0fdf4", color:"#16a34a" },
      CONFIRMADO: { bg:"#eff6ff", color:"#2563eb" },
      PENDIENTE:  { bg:"#fffbeb", color:"#d97706" },
      SUSPENDIDO: { bg:"#fef2f2", color:"#dc2626" },
    };
    const s = map[estado] || { bg:"#f1f5f9", color:"#64748b" };
    return (
      <span style={{display:"inline-flex", alignItems:"center", gap:4, background:s.bg, color:s.color, borderRadius:6, padding:"2px 8px", fontSize:10.5, fontWeight:600}}>
        <span style={{width:5, height:5, borderRadius:"50%", background:s.color, display:"inline-block"}} />
        {estado}
      </span>
    );
  };

  const IconPencil = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
  const IconTrash = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  const thStyle = {textAlign:"left", padding:"8px 16px", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9"};
  const tdStyle = {padding:"9px 16px", fontSize:12.5, color:"#334155"};

  const TablaServicios = ({ items }) => (
    <table style={{width:"100%", borderCollapse:"collapse"}}>
      <thead>
        <tr>
          <th style={thStyle}>Hora</th>
          <th style={thStyle}>Cliente</th>
          <th style={thStyle}>Tipo</th>
          <th style={thStyle}>Dispositivo</th>
          <th style={thStyle}>Patente</th>
          <th style={thStyle}>Estado</th>
          <th style={thStyle}>Observaciones</th>
          {vista === "interna" && <th style={thStyle}></th>}
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr><td colSpan={vista === "interna" ? 8 : 7} style={{...tdStyle, color:"#94a3b8", fontStyle:"italic"}}>Sin servicios</td></tr>
        ) : items.map(s => (
          <tr key={s.id}
            style={{borderBottom:"1px solid #f1f5f9"}}
            onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
            onMouseLeave={e => e.currentTarget.style.background=""}>
            <td style={{...tdStyle, fontFamily:"DM Mono, monospace", fontSize:11, color:"#64748b"}}>{s.hora_programada?.slice(0,5) || "—"}</td>
            <td style={tdStyle}>
              {s.tipo_servicio === "-"
                ? <span style={{background:"#fff7ed", color:"#ea580c", border:"1px solid #fed7aa", borderRadius:6, padding:"2px 7px", fontSize:10.5, fontWeight:700}}>FERIADO</span>
                : s.cliente}
            </td>
            <td style={{...tdStyle, color:"#2563eb", fontWeight:500}}>{s.tipo_servicio === "-" ? "—" : s.tipo_servicio}</td>
            <td style={tdStyle}>{s.dispositivo || "—"}</td>
            <td style={{...tdStyle, fontFamily:"DM Mono, monospace", fontSize:11, color:"#64748b"}}>{s.patente || "—"}</td>
            <td style={tdStyle}>
              {vista === "interna" ? (
                <select value={s.estado || "-"} onChange={e => cambiarEstado(s.id, e.target.value)}
                  style={{padding:"4px 8px", borderRadius:6, border:"1.5px solid #e2e8f0", background:"#f8fafc", fontSize:12, outline:"none", fontFamily:"inherit"}}
                  onFocus={inputFocus} onBlur={inputBlur}>
                  <option value="-">-</option>
                  {estados.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              ) : estadoBadge(s.estado)}
            </td>
            <td style={{...tdStyle, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#64748b"}}>{s.observaciones || "—"}</td>
            {vista === "interna" && (
              <td style={{...tdStyle, textAlign:"right", whiteSpace:"nowrap"}}>
                <button onClick={() => setEditando(s)}
                  style={{color:"#60a5fa", background:"none", border:"none", cursor:"pointer", padding:"4px", borderRadius:6, marginRight:4}}
                  onMouseEnter={e => { e.currentTarget.style.color="#2563eb"; e.currentTarget.style.background="#eff6ff"; }}
                  onMouseLeave={e => { e.currentTarget.style.color="#60a5fa"; e.currentTarget.style.background="none"; }}>
                  <IconPencil />
                </button>
                <button onClick={() => eliminar(s.id)}
                  style={{color:"#fca5a5", background:"none", border:"none", cursor:"pointer", padding:"4px", borderRadius:6}}
                  onMouseEnter={e => { e.currentTarget.style.color="#dc2626"; e.currentTarget.style.background="#fef2f2"; }}
                  onMouseLeave={e => { e.currentTarget.style.color="#fca5a5"; e.currentTarget.style.background="none"; }}>
                  <IconTrash />
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div style={{paddingBottom:32}}>
      {editando && (
        <ModalEditar
          servicio={editando}
          onClose={() => setEditando(null)}
          onSave={guardarEdicion}
          estadosOpts={estados}
        />
      )}

      {/* Page header */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12}}>
        <div>
          <h1 style={{fontSize:22, fontWeight:700, color:"#0f172a", margin:0}}>Vista del Día</h1>
          <p style={{fontSize:13, color:"#64748b", marginTop:4}}>Consultá y gestioná los servicios de cualquier fecha</p>
        </div>
        <div style={{display:"flex", gap:6}}>
          {["interna", "tecnicos"].map(v => (
            <button key={v} onClick={() => setVista(v)}
              style={{
                padding:"7px 14px", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", border:"1.5px solid",
                ...(vista === v
                  ? {background:"#2563eb", color:"#fff", borderColor:"#2563eb"}
                  : {background:"#f8fafc", color:"#475569", borderColor:"#e2e8f0"})
              }}>
              {v === "interna" ? "Vista interna" : "Vista técnicos"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"10px 16px", fontSize:13, marginBottom:16}}>
          {error}
        </div>
      )}

      <div style={{display:"flex", alignItems:"flex-end", gap:12, marginBottom:24}}>
        <div>
          <label style={{display:"block", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", marginBottom:5}}>Fecha</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
        </div>
        <button onClick={buscar}
          style={{background:"#2563eb", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer"}}
          onMouseEnter={e => e.currentTarget.style.background="#1d4ed8"}
          onMouseLeave={e => e.currentTarget.style.background="#2563eb"}>
          Buscar
        </button>
      </div>

      {/* Equipos */}
      <div style={{display:"flex", flexDirection:"column", gap:20}}>
        {equipos.map(eq => {
          const mov = getMovimiento(eq.id);
          return (
            <div key={eq.id} style={{background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", overflow:"hidden"}}>
              <div style={{padding:"14px 20px", borderBottom:"1px solid #f1f5f9"}}>
                <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:vista === "interna" ? 6 : 0}}>
                  <h2 style={{fontSize:14, fontWeight:700, color:"#2563eb", margin:0}}>
                    {eq.nombre}
                    {vista === "interna" && (
                      <span style={{marginLeft:8, fontSize:11, fontWeight:400, color:"#94a3b8"}}>{eq.patente}</span>
                    )}
                  </h2>
                </div>
                {vista === "interna" && (
                  mov ? (
                    <p style={{fontSize:11.5, color:"#64748b", margin:0}}>
                      Salida: <strong>{mov.hora_salida?.slice(0,5) || "—"}</strong>
                      {" "}— Llegada: <strong>{mov.hora_llegada?.slice(0,5) || "—"}</strong>
                      {mov.punto_inicio && <> | {mov.punto_inicio} → {mov.punto_fin || "—"}</>}
                    </p>
                  ) : (
                    <p style={{fontSize:11.5, color:"#94a3b8", margin:0}}>Salida: <strong>-</strong> — Llegada: <strong>-</strong></p>
                  )
                )}
              </div>
              <div style={{overflowX:"auto"}}>
                <TablaServicios items={svcEquipo(eq.id)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Interior */}
      {svcInterior.length > 0 && (
        <div style={{background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", overflow:"hidden", marginTop:20}}>
          <div style={{padding:"14px 20px", borderBottom:"1px solid #f1f5f9"}}>
            <h2 style={{fontSize:14, fontWeight:700, color:"#0d9488", margin:0}}>Interior</h2>
          </div>
          <div style={{overflowX:"auto"}}>
            <TablaServicios items={svcInterior} />
          </div>
        </div>
      )}
    </div>
  );
}
