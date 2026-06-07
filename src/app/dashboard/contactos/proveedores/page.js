"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Modal, { BtnPrimary, BtnSecondary, KeyboardHint, FieldLabel, FieldInput } from "@/components/Modal";

const inputStyle = {
  padding: "7px 11px", borderRadius: 7, border: "1.5px solid #e2e8f0",
  background: "#f8fafc", fontSize: 13, outline: "none", fontFamily: "inherit", flex: 1,
};
const inputFocus = (e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; };
const inputBlur  = (e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };
const thStyle = {textAlign:"left", padding:"8px 20px", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9"};
const tdStyle = {padding:"9px 20px", fontSize:12.5, color:"#334155"};

const FORM_VACIO = { producto: "", empresa: "", nombre: "", celular: "", direccion: "", localidad: "", email: "" };

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const data = await api.get("/directorio/", { tipo: "proveedor" });
      setProveedores(data);
    } catch { setMsg("No se pudieron cargar los proveedores."); }
  };

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const payload = { ...form, tipo: "proveedor", nombre: form.empresa || form.nombre };
      if (editando) {
        await api.put(`/directorio/${editando}`, payload);
        setEditando(null);
      } else {
        await api.post("/directorio/", payload);
      }
      setForm(FORM_VACIO);
      setModalOpen(false);
      cargar();
    } catch { setMsg("Error al guardar el proveedor."); }
  };

  const editar = (p) => {
    setEditando(p.id);
    setForm({ producto: p.producto || "", empresa: p.empresa || p.nombre || "", nombre: p.nombre || "", celular: p.celular || "", direccion: p.direccion || "", localidad: p.localidad || "", email: p.email || "" });
    setModalOpen(true);
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar?")) return;
    await api.delete(`/directorio/${id}`);
    cargar();
  };

  const q = busqueda.toLowerCase();
  const proveedoresFiltrados = q
    ? proveedores.filter(p =>
        [p.producto, p.empresa, p.nombre, p.celular, p.localidad, p.email].some(v => v?.toLowerCase().includes(q))
      )
    : proveedores;

  return (
    <div style={{paddingBottom:32}}>
      {/* Modal agregar/editar */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null); setForm(FORM_VACIO); }}
        title={editando ? "Editar proveedor" : "Nuevo proveedor"}
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
              <FieldLabel required>Producto</FieldLabel>
              <FieldInput type="text" value={form.producto} onChange={e => setForm({ ...form, producto: e.target.value })} required />
            </div>
            <div>
              <FieldLabel required>Empresa</FieldLabel>
              <FieldInput type="text" value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} required />
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
          <h1 style={{fontSize:22, fontWeight:700, color:"#0f172a", margin:0}}>Proveedores</h1>
          <p style={{fontSize:13, color:"#64748b", marginTop:4}}>Directorio de proveedores por producto</p>
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
          placeholder="Buscar por producto, empresa, responsable, localidad..."
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

      {/* Tabla */}
      <div style={{background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%", borderCollapse:"collapse"}}>
            <thead>
              <tr>
                {["Producto","Empresa","Responsable","Celular","Dirección","Localidad","Email",""].map((h, i) => (
                  <th key={i} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proveedoresFiltrados.length === 0 ? (
                <tr><td colSpan={8} style={{...tdStyle, textAlign:"center", color:"#94a3b8", fontStyle:"italic"}}>Sin resultados</td></tr>
              ) : proveedoresFiltrados.map(p => (
                <tr key={p.id} style={{borderBottom:"1px solid #f1f5f9"}}
                  onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background=""}>
                  <td style={tdStyle}>{p.producto || "—"}</td>
                  <td style={{...tdStyle, fontWeight:500}}>{p.empresa || p.nombre}</td>
                  <td style={tdStyle}>{p.nombre || "—"}</td>
                  <td style={tdStyle}>{p.celular || "—"}</td>
                  <td style={tdStyle}>{p.direccion || "—"}</td>
                  <td style={tdStyle}>{p.localidad || "—"}</td>
                  <td style={tdStyle}>{p.email || "—"}</td>
                  <td style={{...tdStyle, whiteSpace:"nowrap"}}>
                    <div style={{display:"flex", gap:8}}>
                      <button onClick={() => editar(p)}
                        style={{fontSize:12, color:"#2563eb", background:"none", border:"none", cursor:"pointer", fontWeight:500}}
                        onMouseEnter={e => e.currentTarget.style.textDecoration="underline"}
                        onMouseLeave={e => e.currentTarget.style.textDecoration="none"}>
                        Editar
                      </button>
                      <button onClick={() => eliminar(p.id)}
                        style={{fontSize:12, color:"#dc2626", background:"none", border:"none", cursor:"pointer", fontWeight:500}}
                        onMouseEnter={e => e.currentTarget.style.textDecoration="underline"}
                        onMouseLeave={e => e.currentTarget.style.textDecoration="none"}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
