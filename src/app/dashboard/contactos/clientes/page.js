"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Modal, { BtnPrimary, BtnSecondary, KeyboardHint, FieldLabel, FieldInput } from "@/components/Modal";

const IconChevron = ({ open }) => (
  <svg style={{width:16, height:16, color:"#94a3b8", transition:"transform 200ms", transform: open ? "rotate(180deg)" : "rotate(0)"}}
    fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);
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
  background: "#f8fafc", fontSize: 13, outline: "none", fontFamily: "inherit", flex: 1,
};
const inputFocus = (e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; };
const inputBlur  = (e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };
const thStyle = {textAlign:"left", padding:"8px 20px", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9"};
const tdStyle = {padding:"9px 20px", fontSize:12.5, color:"#334155"};

const FORM_VACIO = { empresa: "", base: "", nombre: "", celular: "", direccion: "", localidad: "", email: "" };

export default function ClientesPage() {
  const [clientes,      setClientes]      = useState([]);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editando,      setEditando]      = useState(null);
  const [form,          setForm]          = useState(FORM_VACIO);
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [busqueda,      setBusqueda]      = useState("");
  const [abiertos,      setAbiertos]      = useState({});
  const [msg,           setMsg]           = useState("");

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const data = await api.get("/directorio/", { tipo: "cliente" });
      setClientes(data);
    } catch { setMsg("No se pudieron cargar los clientes."); }
  };

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      if (editando) {
        await api.put(`/directorio/${editando}`, { ...form, tipo: "cliente" });
        setEditando(null);
      } else {
        await api.post("/directorio/", { ...form, tipo: "cliente", nombre: form.empresa || form.nombre });
      }
      setForm(FORM_VACIO);
      setModalOpen(false);
      cargar();
    } catch { setMsg("Error al guardar el cliente."); }
  };

  const editar = (c) => {
    setEditando(c.id);
    setForm({ empresa: c.empresa || c.nombre || "", base: c.base || "", nombre: c.nombre || "", celular: c.celular || "", direccion: c.direccion || "", localidad: c.localidad || "", email: c.email || "" });
    setModalOpen(true);
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar?")) return;
    await api.delete(`/directorio/${id}`);
    cargar();
  };

  const toggleEmpresa = (key) =>
    setAbiertos(prev => ({ ...prev, [key]: !prev[key] }));

  const q = busqueda.toLowerCase();
  const clientesFiltrados = q
    ? clientes.filter(c =>
        [c.empresa, c.nombre, c.base, c.celular, c.localidad, c.email].some(v => v?.toLowerCase().includes(q))
      )
    : clientes;

  const grupos = {};
  clientesFiltrados.forEach(c => {
    const key = c.empresa || c.nombre || "Sin empresa";
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(c);
  });
  const gruposOrdenados = Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b, "es"));

  return (
    <div style={{paddingBottom:32}}>
      {/* Modal agregar/editar */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null); setForm(FORM_VACIO); }}
        title={editando ? "Editar cliente" : "Nuevo cliente"}
        footer={
          <>
            <KeyboardHint />
            <div style={{display:"flex", gap:8}}>
              <BtnSecondary onClick={() => { setModalOpen(false); setEditando(null); setForm(FORM_VACIO); }}>Cancelar</BtnSecondary>
              <BtnPrimary onClick={guardar}>{editando ? "Guardar cambios" : "Guardar"}</BtnPrimary>
            </div>
          </>
        }
      >
        <form onSubmit={guardar}>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
            <div>
              <FieldLabel required>Empresa</FieldLabel>
              <FieldInput type="text" value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} required />
            </div>
            <div>
              <FieldLabel>Base</FieldLabel>
              <FieldInput type="text" value={form.base} onChange={e => setForm({ ...form, base: e.target.value })} placeholder="Ej: CABA, Mendoza..." />
            </div>
            <div>
              <FieldLabel>Responsable</FieldLabel>
              <FieldInput type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <FieldLabel>Celular</FieldLabel>
              <FieldInput type="text" value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })} />
            </div>
            <div>
              <FieldLabel>Dirección</FieldLabel>
              <FieldInput type="text" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
            </div>
            <div>
              <FieldLabel>Localidad</FieldLabel>
              <FieldInput type="text" value={form.localidad} onChange={e => setForm({ ...form, localidad: e.target.value })} />
            </div>
            <div style={{gridColumn:"span 2"}}>
              <FieldLabel>Email</FieldLabel>
              <FieldInput type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
        </form>
      </Modal>

      {/* Page header */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22, fontWeight:700, color:"#0f172a", margin:0}}>Clientes</h1>
          <p style={{fontSize:13, color:"#64748b", marginTop:4}}>Directorio de clientes agrupado por empresa</p>
        </div>
        <button onClick={() => { setModalOpen(true); setEditando(null); setForm(FORM_VACIO); }}
          style={{background:"#2563eb", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer"}}
          onMouseEnter={e => e.currentTarget.style.background="#1d4ed8"}
          onMouseLeave={e => e.currentTarget.style.background="#2563eb"}>
          + Agregar
        </button>
      </div>

      {msg && (
        <div style={{background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"10px 16px", fontSize:13, marginBottom:16}}>
          {msg}
        </div>
      )}

      {/* Barra de búsqueda */}
      <div style={{display:"flex", gap:8, marginBottom:24}}>
        <input
          type="text"
          placeholder="Buscar por empresa, responsable, localidad..."
          value={textoBusqueda}
          onChange={e => setTextoBusqueda(e.target.value)}
          onKeyDown={e => e.key === "Enter" && setBusqueda(textoBusqueda)}
          style={{...inputStyle, padding:"8px 12px"}}
          onFocus={inputFocus} onBlur={inputBlur}
        />
        <button onClick={() => setBusqueda(textoBusqueda)}
          style={{background:"#2563eb", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer"}}
          onMouseEnter={e => e.currentTarget.style.background="#1d4ed8"}
          onMouseLeave={e => e.currentTarget.style.background="#2563eb"}>
          Buscar
        </button>
        {busqueda && (
          <button onClick={() => { setBusqueda(""); setTextoBusqueda(""); }}
            style={{background:"#f8fafc", color:"#475569", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:500, cursor:"pointer"}}
            onMouseEnter={e => e.currentTarget.style.background="#e9edf1"}
            onMouseLeave={e => e.currentTarget.style.background="#f8fafc"}>
            Limpiar
          </button>
        )}
      </div>

      {/* Grupos colapsables */}
      {gruposOrdenados.length === 0 ? (
        <div style={{background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", padding:"40px 20px", textAlign:"center", fontSize:13, color:"#94a3b8"}}>
          Sin resultados
        </div>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {gruposOrdenados.map(([empresa, lista]) => {
            const abierto = !!abiertos[empresa];
            return (
              <div key={empresa} style={{background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", overflow:"hidden"}}>
                <button type="button" onClick={() => toggleEmpresa(empresa)}
                  style={{width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", background:"transparent", border:"none", cursor:"pointer", textAlign:"left"}}
                  onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <div>
                    <span style={{fontSize:13, fontWeight:600, color:"#0f172a"}}>{empresa}</span>
                    <span style={{marginLeft:12, fontSize:11, color:"#94a3b8"}}>
                      {lista.length === 1 ? "1 contacto" : `${lista.length} contactos`}
                    </span>
                  </div>
                  <IconChevron open={abierto} />
                </button>

                {abierto && (
                  <div style={{borderTop:"1px solid #f1f5f9", overflowX:"auto"}}>
                    <table style={{width:"100%", borderCollapse:"collapse"}}>
                      <thead>
                        <tr>
                          {["Base","Responsable","Celular","Dirección","Localidad","Email",""].map((h, i) => (
                            <th key={i} style={{...thStyle, background:"#fafbfc"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lista.map(c => (
                          <tr key={c.id} style={{borderBottom:"1px solid #f1f5f9"}}
                            onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                            onMouseLeave={e => e.currentTarget.style.background=""}>
                            <td style={tdStyle}>{c.base || "—"}</td>
                            <td style={tdStyle}>{c.nombre || "—"}</td>
                            <td style={tdStyle}>{c.celular || "—"}</td>
                            <td style={tdStyle}>{c.direccion || "—"}</td>
                            <td style={tdStyle}>{c.localidad || "—"}</td>
                            <td style={tdStyle}>{c.email || "—"}</td>
                            <td style={{...tdStyle, whiteSpace:"nowrap"}}>
                              <div style={{display:"flex", gap:4, alignItems:"center"}}>
                                <button onClick={() => editar(c)}
                                  style={{color:"#60a5fa", background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:6, display:"inline-flex"}}
                                  onMouseEnter={e => { e.currentTarget.style.color="#2563eb"; e.currentTarget.style.background="#eff6ff"; }}
                                  onMouseLeave={e => { e.currentTarget.style.color="#60a5fa"; e.currentTarget.style.background="none"; }}>
                                  <IconEdit />
                                </button>
                                <button onClick={() => eliminar(c.id)}
                                  style={{color:"#fca5a5", background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:6, display:"inline-flex"}}
                                  onMouseEnter={e => { e.currentTarget.style.color="#dc2626"; e.currentTarget.style.background="#fef2f2"; }}
                                  onMouseLeave={e => { e.currentTarget.style.color="#fca5a5"; e.currentTarget.style.background="none"; }}>
                                  <IconTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
