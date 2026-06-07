"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Modal, { BtnPrimary, BtnSecondary, KeyboardHint, FieldLabel, FieldInput, FieldSelect } from "@/components/Modal";

const PUNTOS = ["Oficina", "Casa Maxi", "Casa Hugo"];
const MESES  = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const inputStyle = {
  padding: "7px 11px", borderRadius: 7, border: "1.5px solid #e2e8f0",
  background: "#f8fafc", fontSize: 13, outline: "none", fontFamily: "inherit", width: "100%",
};
const inputFocus = (e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; };
const inputBlur  = (e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };
const thStyle = {textAlign:"left", padding:"8px 16px", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9"};
const tdStyle = {padding:"9px 16px", fontSize:12.5, color:"#334155"};

export default function HistorialCamionetaPage() {
  const [equipos,     setEquipos]     = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [filtroMes,   setFiltroMes]   = useState(new Date().getMonth() + 1);
  const [filtroAnio,  setFiltroAnio]  = useState(new Date().getFullYear());
  const [filtroEquipo,setFiltroEquipo]= useState("");
  const [editando,    setEditando]    = useState(null);
  const [msgEdit,     setMsgEdit]     = useState("");
  const [error,       setError]       = useState("");

  useEffect(() => {
    api.get("/equipos/").then(eqs => {
      setEquipos(eqs);
      fetchMovimientos("", new Date().getMonth() + 1, new Date().getFullYear());
    }).catch(() => {
      setError("No se pudieron cargar los equipos.");
      fetchMovimientos("", new Date().getMonth() + 1, new Date().getFullYear());
    });
  }, []);

  const fetchMovimientos = async (equipoId, mes, anio) => {
    const params = {};
    if (equipoId) params.equipo_id = equipoId;
    try {
      let data = await api.get("/movimientos-camioneta/", params);
      if (mes || anio) {
        data = data.filter(m => {
          if (!m.fecha) return false;
          const [y, mo] = m.fecha.split("-");
          if (anio && parseInt(y) !== parseInt(anio)) return false;
          if (mes  && parseInt(mo) !== parseInt(mes)) return false;
          return true;
        });
      }
      setMovimientos(data);
    } catch { setError("Error al cargar movimientos. Verificá la conexión con el servidor."); }
  };

  const buscar = () => fetchMovimientos(filtroEquipo, filtroMes, filtroAnio);
  const limpiar = () => {
    setFiltroMes(""); setFiltroAnio(""); setFiltroEquipo("");
    fetchMovimientos("", "", "");
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este movimiento?")) return;
    try {
      await api.delete(`/movimientos-camioneta/${id}/`);
      setMovimientos(prev => prev.filter(m => m.id !== id));
    } catch (err) { alert("Error al eliminar: " + err.message); }
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    setMsgEdit("");
    try {
      await api.patch(`/movimientos-camioneta/${editando.id}/`, {
        equipo_id:      editando.equipo_id,
        fecha:          editando.fecha,
        hora_salida:    editando.hora_salida,
        hora_llegada:   editando.hora_llegada,
        punto_inicio:   editando.punto_inicio,
        punto_fin:      editando.punto_fin,
        llegada_gr_lch: editando.llegada_gr_lch || "",
        salida_gr_lch:  editando.salida_gr_lch  || "",
        observaciones:  editando.observaciones,
      });
      setMovimientos(prev => prev.map(m => m.id === editando.id ? { ...m, ...editando } : m));
      setEditando(null);
    } catch (err) { setMsgEdit("Error: " + err.message); }
  };

  const equipoNombre  = (m) => m.equipos?.nombre || equipos.find(e => String(e.id) === String(m.equipo_id))?.nombre || "—";
  const esEquipo2     = (m) => equipoNombre(m) === "Equipo 2";
  const equipoEditNom = equipos.find(e => String(e.id) === String(editando?.equipo_id))?.nombre;

  const movsEq1 = movimientos.filter(m => !esEquipo2(m));
  const movsEq2 = movimientos.filter(m =>  esEquipo2(m));

  const tecnicosDeMovimiento = (m) => (m.tecnicos_jornada || []).filter(t => t.presente);

  const TablaMovimientos = ({ filas, conGR }) => (
    <div style={{background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%", borderCollapse:"collapse"}}>
          <thead>
            <tr>
              <th style={thStyle}>Fecha</th>
              <th style={thStyle}>Hora salida</th>
              <th style={thStyle}>Hora llegada</th>
              <th style={thStyle}>Inicio</th>
              <th style={thStyle}>Fin</th>
              {conGR && <th style={thStyle}>Llegada GR/LCH</th>}
              {conGR && <th style={thStyle}>Salida GR/LCH</th>}
              <th style={thStyle}>Técnicos</th>
              <th style={thStyle}>Observaciones</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={conGR ? 10 : 8} style={{...tdStyle, color:"#94a3b8", fontStyle:"italic"}}>
                  Sin movimientos
                </td>
              </tr>
            ) : filas.map(m => {
              const tecnicos = tecnicosDeMovimiento(m);
              return (
                <tr key={m.id} style={{borderBottom:"1px solid #f1f5f9"}}
                  onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background=""}>
                  <td style={{...tdStyle, fontFamily:"DM Mono, monospace", fontSize:11, color:"#64748b"}}>{m.fecha}</td>
                  <td style={{...tdStyle, fontFamily:"DM Mono, monospace", fontSize:11, color:"#64748b"}}>{m.hora_salida?.slice(0,5)  || "—"}</td>
                  <td style={{...tdStyle, fontFamily:"DM Mono, monospace", fontSize:11, color:"#64748b"}}>{m.hora_llegada?.slice(0,5) || "—"}</td>
                  <td style={tdStyle}>{m.punto_inicio || "—"}</td>
                  <td style={tdStyle}>{m.punto_fin    || "—"}</td>
                  {conGR && <td style={{...tdStyle, fontFamily:"DM Mono, monospace", fontSize:11, color:"#64748b"}}>{m.llegada_gr_lch?.slice(0,5) || "—"}</td>}
                  {conGR && <td style={{...tdStyle, fontFamily:"DM Mono, monospace", fontSize:11, color:"#64748b"}}>{m.salida_gr_lch?.slice(0,5)  || "—"}</td>}
                  <td style={tdStyle}>
                    {tecnicos.length === 0 ? (
                      <span style={{fontSize:11, color:"#94a3b8"}}>—</span>
                    ) : (
                      <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
                        {tecnicos.map((t, i) => (
                          <span key={i} style={{background:"#eff6ff", color:"#2563eb", fontSize:11, padding:"1px 7px", borderRadius:20}}>
                            {t.empleados?.nombre || t.tecnico_id}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{...tdStyle, color:"#64748b"}}>{m.observaciones || "—"}</td>
                  <td style={{...tdStyle, whiteSpace:"nowrap"}}>
                    <div style={{display:"flex", gap:4, alignItems:"center"}}>
                      <button
                        onClick={() => setEditando({ ...m, equipo_id: m.equipo_id || m.equipos?.id || "" })}
                        style={{color:"#60a5fa", background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:6, display:"inline-flex"}}
                        onMouseEnter={e => { e.currentTarget.style.color="#2563eb"; e.currentTarget.style.background="#eff6ff"; }}
                        onMouseLeave={e => { e.currentTarget.style.color="#60a5fa"; e.currentTarget.style.background="none"; }}>
                        <IconEdit />
                      </button>
                      <button
                        onClick={() => eliminar(m.id)}
                        style={{color:"#fca5a5", background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:6, display:"inline-flex"}}
                        onMouseEnter={e => { e.currentTarget.style.color="#dc2626"; e.currentTarget.style.background="#fef2f2"; }}
                        onMouseLeave={e => { e.currentTarget.style.color="#fca5a5"; e.currentTarget.style.background="none"; }}>
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={{paddingBottom:32}}>
      {/* Page header */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22, fontWeight:700, color:"#0f172a", margin:0}}>Historial Camioneta</h1>
          <p style={{fontSize:13, color:"#64748b", marginTop:4}}>Movimientos registrados por equipo y período</p>
        </div>
      </div>

      {error && (
        <div style={{background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"10px 16px", fontSize:13, marginBottom:16}}>
          {error}
        </div>
      )}

      {/* Filtros */}
      <div style={{display:"flex", alignItems:"flex-end", gap:12, flexWrap:"wrap", marginBottom:24}}>
        <div>
          <label style={{display:"block", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", marginBottom:5}}>Mes</label>
          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
            style={{...inputStyle, width:128}} onFocus={inputFocus} onBlur={inputBlur}>
            <option value="">Todos</option>
            {MESES.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{display:"block", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", marginBottom:5}}>Año</label>
          <select value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)}
            style={{...inputStyle, width:96}} onFocus={inputFocus} onBlur={inputBlur}>
            <option value="">Todos</option>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
        <div>
          <label style={{display:"block", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", marginBottom:5}}>Equipo</label>
          <select value={filtroEquipo} onChange={e => setFiltroEquipo(e.target.value)}
            style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}>
            <option value="">Todos</option>
            {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
          </select>
        </div>
        <button onClick={buscar}
          style={{background:"#2563eb", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer"}}
          onMouseEnter={e => e.currentTarget.style.background="#1d4ed8"}
          onMouseLeave={e => e.currentTarget.style.background="#2563eb"}>
          Buscar
        </button>
        <button onClick={limpiar}
          style={{background:"#f8fafc", color:"#475569", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:500, cursor:"pointer"}}
          onMouseEnter={e => e.currentTarget.style.background="#e9edf1"}
          onMouseLeave={e => e.currentTarget.style.background="#f8fafc"}>
          Limpiar
        </button>
      </div>

      {/* Equipo 1 */}
      {(!filtroEquipo || equipos.find(e => String(e.id) === filtroEquipo)?.nombre !== "Equipo 2") && (
        <div style={{marginBottom:24}}>
          <h2 style={{fontSize:10, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:"#64748b", marginBottom:10}}>Equipo 1</h2>
          <TablaMovimientos filas={movsEq1} conGR={false} />
        </div>
      )}

      {/* Equipo 2 */}
      {(!filtroEquipo || equipos.find(e => String(e.id) === filtroEquipo)?.nombre === "Equipo 2") && (
        <div style={{marginBottom:24}}>
          <h2 style={{fontSize:10, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:"#64748b", marginBottom:10}}>Equipo 2</h2>
          <TablaMovimientos filas={movsEq2} conGR={true} />
        </div>
      )}

      {/* Modal edición */}
      {editando && (
        <Modal
          open={true}
          onClose={() => setEditando(null)}
          title="Editar movimiento"
          width="560px"
          footer={
            <>
              <KeyboardHint />
              <div style={{display:"flex", gap:8}}>
                {msgEdit && <span style={{fontSize:12, color:"#dc2626", alignSelf:"center"}}>{msgEdit}</span>}
                <BtnSecondary onClick={() => setEditando(null)}>Cancelar</BtnSecondary>
                <BtnPrimary onClick={guardarEdicion} type="submit">Guardar cambios</BtnPrimary>
              </div>
            </>
          }
        >
          <form id="edit-mov-form" onSubmit={guardarEdicion}>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
              <div>
                <FieldLabel required>Equipo</FieldLabel>
                <FieldSelect value={editando.equipo_id}
                  onChange={e => setEditando({ ...editando, equipo_id: e.target.value })} required>
                  <option value="">Seleccionar</option>
                  {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
                </FieldSelect>
              </div>
              <div>
                <FieldLabel required>Fecha</FieldLabel>
                <FieldInput type="date" value={editando.fecha}
                  onChange={e => setEditando({ ...editando, fecha: e.target.value })} required />
              </div>
              <div>
                <FieldLabel>Hora salida</FieldLabel>
                <FieldInput type="time" value={editando.hora_salida || ""}
                  onChange={e => setEditando({ ...editando, hora_salida: e.target.value })} />
              </div>
              <div>
                <FieldLabel>Hora llegada</FieldLabel>
                <FieldInput type="time" value={editando.hora_llegada || ""}
                  onChange={e => setEditando({ ...editando, hora_llegada: e.target.value })} />
              </div>
              <div>
                <FieldLabel>Punto inicio</FieldLabel>
                <FieldSelect value={editando.punto_inicio || ""}
                  onChange={e => setEditando({ ...editando, punto_inicio: e.target.value })}>
                  <option value="">Seleccionar</option>
                  {PUNTOS.map(p => <option key={p} value={p}>{p}</option>)}
                </FieldSelect>
              </div>
              <div>
                <FieldLabel>Punto fin</FieldLabel>
                <FieldSelect value={editando.punto_fin || ""}
                  onChange={e => setEditando({ ...editando, punto_fin: e.target.value })}>
                  <option value="">Seleccionar</option>
                  {PUNTOS.map(p => <option key={p} value={p}>{p}</option>)}
                </FieldSelect>
              </div>
              {equipoEditNom === "Equipo 2" && (
                <>
                  <div>
                    <FieldLabel>Llegada GR/LCH</FieldLabel>
                    <FieldInput type="time" value={editando.llegada_gr_lch || ""}
                      onChange={e => setEditando({ ...editando, llegada_gr_lch: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Salida GR/LCH</FieldLabel>
                    <FieldInput type="time" value={editando.salida_gr_lch || ""}
                      onChange={e => setEditando({ ...editando, salida_gr_lch: e.target.value })} />
                  </div>
                </>
              )}
            </div>
            <div style={{marginTop:14}}>
              <FieldLabel>Observaciones</FieldLabel>
              <FieldInput type="text" value={editando.observaciones || ""}
                onChange={e => setEditando({ ...editando, observaciones: e.target.value })} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
