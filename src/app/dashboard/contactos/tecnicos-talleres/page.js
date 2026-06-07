"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import Modal, { BtnPrimary, BtnSecondary, KeyboardHint, FieldLabel, FieldInput } from "@/components/Modal";

// ── Íconos ────────────────────────────────────────────────────────────────
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
const IconUsers = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconMoney = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PRECIOS_LABELS = [
  { key: "precio_inst_basica",    label: "Inst. Básica" },
  { key: "precio_inst_chasis",    label: "Inst. Chasis" },
  { key: "precio_inst_tracto",    label: "Inst. Tracto" },
  { key: "precio_inst_semi",      label: "Inst. Semi" },
  { key: "precio_revision",       label: "Revisión" },
  { key: "precio_desinstalacion", label: "Desinstalación" },
  { key: "precio_camara",         label: "Cámara Retroceso" },
];

const fmt = (n) => n != null ? `$${Number(n).toLocaleString("es-AR")}` : null;

const inputStyle = {
  padding: "7px 11px", borderRadius: 7, border: "1.5px solid #e2e8f0",
  background: "#f8fafc", fontSize: 13, outline: "none", fontFamily: "inherit", flex: 1,
};
const inputFocus = (e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; };
const inputBlur  = (e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };
const thStyle = {textAlign:"left", padding:"8px 16px", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9"};
const tdStyle = {padding:"9px 16px", fontSize:12.5, color:"#334155"};

// ── Popover de precios ──────────────────────────────────────────────────────
function PreciosPopover({ contacto, onClose, anchorRef }) {
  const ref = useRef();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target) && !anchorRef.current?.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const precios = PRECIOS_LABELS.map(p => ({ ...p, valor: contacto[p.key] })).filter(p => p.valor != null);

  return (
    <div ref={ref} style={{position:"absolute", right:0, zIndex:50, marginTop:4, width:224, background:"#fff", borderRadius:10, boxShadow:"0 8px 24px rgba(0,0,0,0.12)", border:"1px solid #e2e8f0", padding:12}}>
      <p style={{fontSize:12, fontWeight:600, color:"#0f172a", marginBottom:8, marginTop:0}}>{contacto.nombre}</p>
      {precios.length === 0 ? (
        <p style={{fontSize:11.5, color:"#94a3b8", margin:0}}>Sin precios cargados</p>
      ) : (
        <div style={{display:"flex", flexDirection:"column", gap:4}}>
          {precios.map(p => (
            <div key={p.key} style={{display:"flex", justifyContent:"space-between", fontSize:11.5}}>
              <span style={{color:"#64748b"}}>{p.label}</span>
              <span style={{fontWeight:500, color:"#0f172a"}}>{fmt(p.valor)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal contactos (subresponsables) ───────────────────────────────────────
function SubresponsablesModal({ contacto, onClose }) {
  const [subs, setSubs] = useState([]);
  const [form, setForm] = useState({ nombre: "", celular: "", email: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try { setSubs(await api.get(`/directorio/${contacto.id}/subresponsables`)); }
    catch { setMsg("Error al cargar contactos."); }
  };

  const agregar = async (e) => {
    e.preventDefault(); setMsg("");
    try {
      await api.post("/directorio/subresponsable", { contacto_id: contacto.id, ...form });
      setForm({ nombre: "", celular: "", email: "" });
      setMsg("✓ Agregado"); cargar();
    } catch { setMsg("Error"); }
  };

  const eliminar = async (id) => { await api.delete(`/directorio/subresponsable/${id}`); cargar(); };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Contactos — ${contacto.nombre}`}
      footer={<div style={{marginLeft:"auto"}}><BtnSecondary onClick={onClose}>Cerrar</BtnSecondary></div>}
    >
      <form onSubmit={agregar} style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:12}}>
        <FieldInput type="text" placeholder="Nombre *" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required style={{flex:1, minWidth:128}} />
        <FieldInput type="text" placeholder="Celular" value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })} style={{width:144}} />
        <FieldInput type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{width:176}} />
        <BtnPrimary type="submit">+</BtnPrimary>
      </form>
      {msg && <p style={{fontSize:11.5, color:"#16a34a", marginBottom:8}}>{msg}</p>}
      <div style={{display:"flex", flexDirection:"column", gap:6, maxHeight:200, overflowY:"auto"}}>
        {subs.length === 0 ? (
          <p style={{fontSize:13, color:"#94a3b8"}}>Sin contactos cargados</p>
        ) : subs.map(s => (
          <div key={s.id} style={{display:"flex", alignItems:"center", justifyContent:"space-between", background:"#f8fafc", borderRadius:8, padding:"8px 12px"}}>
            <div>
              <span style={{fontSize:13, fontWeight:500, color:"#0f172a"}}>{s.nombre}</span>
              {s.celular && <span style={{fontSize:11.5, color:"#64748b", marginLeft:8}}>{s.celular}</span>}
              {s.email   && <span style={{fontSize:11.5, color:"#64748b", marginLeft:8}}>{s.email}</span>}
            </div>
            <button onClick={() => eliminar(s.id)}
              style={{fontSize:12, color:"#fca5a5", background:"none", border:"none", cursor:"pointer"}}
              onMouseEnter={e => e.currentTarget.style.color="#dc2626"}
              onMouseLeave={e => e.currentTarget.style.color="#fca5a5"}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── Modal edición / creación ────────────────────────────────────────────────
const FORM_VACIO = {
  nombre: "", razon_social: "", celular: "", direccion: "", localidad: "", email: "",
  precio_inst_basica: "", precio_inst_chasis: "", precio_inst_tracto: "", precio_inst_semi: "",
  precio_revision: "", precio_desinstalacion: "", precio_camara: "",
};

function EditModal({ contacto, onClose, onSaved }) {
  const [form, setForm] = useState(contacto
    ? {
        nombre:              contacto.nombre              || "",
        razon_social:        contacto.razon_social        || "",
        celular:             contacto.celular             || "",
        direccion:           contacto.direccion           || "",
        localidad:           contacto.localidad           || "",
        email:               contacto.email               || "",
        precio_inst_basica:    contacto.precio_inst_basica    ?? "",
        precio_inst_chasis:    contacto.precio_inst_chasis    ?? "",
        precio_inst_tracto:    contacto.precio_inst_tracto    ?? "",
        precio_inst_semi:      contacto.precio_inst_semi      ?? "",
        precio_revision:       contacto.precio_revision       ?? "",
        precio_desinstalacion: contacto.precio_desinstalacion ?? "",
        precio_camara:         contacto.precio_camara         ?? "",
      }
    : FORM_VACIO
  );
  const [error, setError] = useState("");

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const guardar = async (e) => {
    e.preventDefault(); setError("");
    const payload = { ...form, tipo: "interior" };
    for (const p of PRECIOS_LABELS) {
      payload[p.key] = form[p.key] !== "" && form[p.key] !== null ? parseInt(form[p.key]) : null;
    }
    try {
      if (contacto) await api.put(`/directorio/${contacto.id}`, payload);
      else          await api.post("/directorio/", payload);
      onSaved();
    } catch { setError("Error al guardar."); }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={contacto ? "Editar técnico / taller" : "Nuevo técnico / taller"}
      width="640px"
      footer={
        <>
          <KeyboardHint />
          <div style={{display:"flex", gap:8}}>
            {error && <span style={{fontSize:12, color:"#dc2626", alignSelf:"center"}}>{error}</span>}
            <BtnSecondary onClick={onClose}>Cancelar</BtnSecondary>
            <BtnPrimary onClick={guardar}>{contacto ? "Guardar cambios" : "Guardar"}</BtnPrimary>
          </div>
        </>
      }
    >
      <form onSubmit={guardar}>
        <p style={{fontSize:9.5, fontWeight:600, letterSpacing:"0.07em", textTransform:"uppercase", color:"#94a3b8", marginBottom:10, marginTop:0}}>Datos generales</p>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16}}>
          <div>
            <FieldLabel required>Responsable</FieldLabel>
            <FieldInput type="text" value={form.nombre} onChange={e => setF("nombre", e.target.value)} required />
          </div>
          <div>
            <FieldLabel>Razón Social</FieldLabel>
            <FieldInput type="text" value={form.razon_social} onChange={e => setF("razon_social", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Celular</FieldLabel>
            <FieldInput type="text" value={form.celular} onChange={e => setF("celular", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <FieldInput type="email" value={form.email} onChange={e => setF("email", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Dirección</FieldLabel>
            <FieldInput type="text" value={form.direccion} onChange={e => setF("direccion", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Localidad</FieldLabel>
            <FieldInput type="text" value={form.localidad} onChange={e => setF("localidad", e.target.value)} />
          </div>
        </div>

        <p style={{fontSize:9.5, fontWeight:600, letterSpacing:"0.07em", textTransform:"uppercase", color:"#94a3b8", marginBottom:10, borderTop:"1px solid #f1f5f9", paddingTop:14}}>Precios acordados</p>
        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12}}>
          {PRECIOS_LABELS.map(p => (
            <div key={p.key}>
              <FieldLabel>{p.label}</FieldLabel>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#94a3b8", fontSize:13}}>$</span>
                <FieldInput type="number" min="0" value={form[p.key]}
                  onChange={e => setF(p.key, e.target.value)}
                  placeholder="—"
                  style={{paddingLeft:24}} />
              </div>
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
}

// ── Fila con popover de precios ─────────────────────────────────────────────
function FilaContacto({ c, onEditar, onEliminar, onVerSubs }) {
  const [showPrecios, setShowPrecios] = useState(false);
  const btnRef = useRef();
  const tienePrecios = PRECIOS_LABELS.some(p => c[p.key] != null);

  return (
    <tr style={{borderBottom:"1px solid #f1f5f9"}}
      onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
      onMouseLeave={e => e.currentTarget.style.background=""}>
      <td style={{...tdStyle, fontWeight:500}}>{c.nombre}</td>
      <td style={{...tdStyle, color:"#64748b"}}>{c.razon_social || "—"}</td>
      <td style={tdStyle}>{c.celular || "—"}</td>
      <td style={tdStyle}>{c.direccion || "—"}</td>
      <td style={tdStyle}>{c.localidad || "—"}</td>
      <td style={tdStyle}>{c.email || "—"}</td>
      <td style={{...tdStyle, whiteSpace:"nowrap"}}>
        <div style={{display:"flex", alignItems:"center", gap:4}}>
          {/* Contactos */}
          <button onClick={() => onVerSubs(c)} title="Contactos"
            style={{color:"#2dd4bf", background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:6, display:"inline-flex"}}
            onMouseEnter={e => { e.currentTarget.style.color="#0d9488"; e.currentTarget.style.background="#f0fdfa"; }}
            onMouseLeave={e => { e.currentTarget.style.color="#2dd4bf"; e.currentTarget.style.background="none"; }}>
            <IconUsers />
          </button>

          {/* Precios */}
          <div style={{position:"relative"}}>
            <button ref={btnRef} onClick={() => setShowPrecios(v => !v)} title="Ver precios"
              style={{color: tienePrecios ? "#f59e0b" : "#cbd5e1", background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:6, display:"inline-flex"}}
              onMouseEnter={e => { e.currentTarget.style.color = tienePrecios ? "#d97706" : "#94a3b8"; }}
              onMouseLeave={e => { e.currentTarget.style.color = tienePrecios ? "#f59e0b" : "#cbd5e1"; }}>
              <IconMoney />
            </button>
            {showPrecios && (
              <PreciosPopover contacto={c} anchorRef={btnRef} onClose={() => setShowPrecios(false)} />
            )}
          </div>

          {/* Editar */}
          <button onClick={() => onEditar(c)} title="Editar"
            style={{color:"#60a5fa", background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:6, display:"inline-flex"}}
            onMouseEnter={e => { e.currentTarget.style.color="#2563eb"; e.currentTarget.style.background="#eff6ff"; }}
            onMouseLeave={e => { e.currentTarget.style.color="#60a5fa"; e.currentTarget.style.background="none"; }}>
            <IconEdit />
          </button>

          {/* Eliminar */}
          <button onClick={() => onEliminar(c.id)} title="Eliminar"
            style={{color:"#fca5a5", background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:6, display:"inline-flex"}}
            onMouseEnter={e => { e.currentTarget.style.color="#dc2626"; e.currentTarget.style.background="#fef2f2"; }}
            onMouseLeave={e => { e.currentTarget.style.color="#fca5a5"; e.currentTarget.style.background="none"; }}>
            <IconTrash />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function TecnicosTalleresPage() {
  const [contactos, setContactos] = useState([]);
  const [modalEdit, setModalEdit] = useState(null);
  const [verSubs,   setVerSubs]   = useState(null);
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [busqueda,      setBusqueda]      = useState("");
  const [errorCarga,    setErrorCarga]    = useState("");

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try { setContactos(await api.get("/directorio/interior")); }
    catch { setErrorCarga("No se pudieron cargar los técnicos / talleres."); }
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este técnico / taller?")) return;
    await api.delete(`/directorio/${id}`);
    cargar();
  };

  const q = busqueda.toLowerCase();
  const contactosFiltrados = q
    ? contactos.filter(c =>
        [c.nombre, c.razon_social, c.celular, c.localidad, c.email, c.direccion]
          .some(v => v?.toLowerCase().includes(q))
      )
    : contactos;

  return (
    <div style={{paddingBottom:32}}>
      {verSubs && <SubresponsablesModal contacto={verSubs} onClose={() => setVerSubs(null)} />}
      {modalEdit !== null && (
        <EditModal
          contacto={modalEdit || null}
          onClose={() => setModalEdit(null)}
          onSaved={() => { setModalEdit(null); cargar(); }}
        />
      )}

      {/* Page header */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22, fontWeight:700, color:"#0f172a", margin:0}}>Técnicos / Talleres</h1>
          <p style={{fontSize:13, color:"#64748b", marginTop:4}}>Directorio de técnicos externos y talleres</p>
        </div>
        <button onClick={() => setModalEdit(false)}
          style={{background:"#2563eb", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer"}}
          onMouseEnter={e => e.currentTarget.style.background="#1d4ed8"}
          onMouseLeave={e => e.currentTarget.style.background="#2563eb"}>
          + Agregar
        </button>
      </div>

      {errorCarga && (
        <div style={{background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"10px 16px", fontSize:13, marginBottom:16}}>
          {errorCarga}
        </div>
      )}

      {/* Búsqueda */}
      <div style={{display:"flex", gap:8, marginBottom:24}}>
        <input type="text" placeholder="Buscar por nombre, razón social, localidad, celular..."
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

      <div style={{background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%", borderCollapse:"collapse"}}>
            <thead>
              <tr>
                {["Responsable","Razón Social","Celular","Dirección","Localidad","Email","Acciones"].map((h, i) => (
                  <th key={i} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contactosFiltrados.length === 0 ? (
                <tr><td colSpan={7} style={{...tdStyle, textAlign:"center", color:"#94a3b8", fontStyle:"italic"}}>Sin resultados</td></tr>
              ) : contactosFiltrados.map(c => (
                <FilaContacto key={c.id} c={c}
                  onEditar={setModalEdit}
                  onEliminar={eliminar}
                  onVerSubs={setVerSubs}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
