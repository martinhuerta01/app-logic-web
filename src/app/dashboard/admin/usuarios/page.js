"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Modal, { BtnPrimary, BtnSecondary, KeyboardHint, FieldLabel, FieldInput, FieldSelect } from "@/components/Modal";

const TODOS_MODULOS = [
  { key: "servicios",    label: "Servicios", subs: [
    { key: "carga-dia",  label: "Carga del día" },
    { key: "vista-dia",  label: "Vista del día" },
    { key: "historial",  label: "Historial" },
  ]},
  { key: "personal",     label: "Personal", subs: [
    { key: "horario-tecnico",     label: "Horario Técnico" },
    { key: "historial-camioneta", label: "Historial camioneta" },
  ]},
  { key: "contactos",    label: "Contactos", subs: [
    { key: "clientes",          label: "Clientes" },
    { key: "proveedores",       label: "Proveedores" },
    { key: "tecnicos-talleres", label: "Técnicos / Talleres" },
  ]},
  { key: "estadisticas", label: "Estadísticas", subs: [
    { key: "dashboard",   label: "Dashboard" },
    { key: "horas",       label: "Horas trabajadas" },
    { key: "responsable", label: "Por Responsable" },
    { key: "clientes",    label: "Por Cliente" },
    { key: "cruzado",     label: "Reporte cruzado" },
    { key: "stock-kpi",   label: "Stock KPI" },
    { key: "patentes",    label: "Revisiones frecuentes" },
  ]},
  { key: "stock",        label: "Stock" },
  { key: "tareas",       label: "Tickets", subs: [
    { key: "tickets",   label: "Tickets" },
    { key: "historial", label: "Historial" },
  ]},
  { key: "configuracion",label: "Configuración" },
  { key: "exportar",     label: "Exportar / Importar" },
  { key: "recibos",      label: "Recibos de Sueldo", subs: [
    { key: "recibos", label: "Recibos de Sueldo" },
  ]},
];

const FORM_VACIO = { nombre: "", password: "", rol: "usuario", modulos: [], submodulos: {}, acceso_total: false };

function ModalUsuario({ usuario, onClose, onGuardado }) {
  const esNuevo = !usuario;
  const [form, setForm] = useState(() => {
    if (esNuevo) return FORM_VACIO;
    return {
      nombre:      usuario.nombre,
      password:    "",
      rol:         usuario.rol || "usuario",
      modulos:     usuario.modulos || [],
      submodulos:  usuario.submodulos || {},
      acceso_total: !usuario.modulos,
    };
  });
  const [guardando,       setGuardando]       = useState(false);
  const [error,           setError]           = useState("");
  const [expandidos,      setExpandidos]      = useState({});

  const toggleModulo = (key) => {
    setForm(f => {
      const yaActivo = f.modulos.includes(key);
      const nuevosModulos = yaActivo ? f.modulos.filter(m => m !== key) : [...f.modulos, key];
      // Si se desactiva el módulo, limpiar sus submodulos
      const nuevosSubmodulos = { ...f.submodulos };
      if (yaActivo) delete nuevosSubmodulos[key];
      return { ...f, modulos: nuevosModulos, submodulos: nuevosSubmodulos };
    });
  };

  const isSubEnabled = (moduloKey, subKey) => {
    if (!form.submodulos[moduloKey]) return true;
    return form.submodulos[moduloKey].includes(subKey);
  };

  const toggleSubmodulo = (moduloKey, subKey) => {
    setForm(f => {
      const modDef   = TODOS_MODULOS.find(m => m.key === moduloKey);
      const allSubs  = modDef?.subs?.map(s => s.key) || [];
      const current  = f.submodulos[moduloKey];
      // Si no había restricción, restringir a todos menos este
      const newList  = current
        ? current.includes(subKey) ? current.filter(k => k !== subKey) : [...current, subKey]
        : allSubs.filter(k => k !== subKey);
      const nuevosSubmodulos = { ...f.submodulos };
      // Si quedan todos seleccionados, eliminar restricción
      if (newList.length === allSubs.length) {
        delete nuevosSubmodulos[moduloKey];
      } else {
        nuevosSubmodulos[moduloKey] = newList;
      }
      return { ...f, submodulos: nuevosSubmodulos };
    });
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio."); return; }
    if (esNuevo && !form.password.trim()) { setError("La contraseña es obligatoria."); return; }
    setError("");
    setGuardando(true);
    try {
      const submodulosGuardar = Object.keys(form.submodulos).length > 0 ? form.submodulos : null;
      const payload = {
        nombre:     form.nombre.trim(),
        rol:        form.rol,
        modulos:    form.acceso_total ? null : form.modulos,
        submodulos: form.acceso_total ? null : submodulosGuardar,
      };
      if (form.password.trim()) payload.password = form.password.trim();

      if (esNuevo) {
        await api.post("/usuarios/", payload);
      } else {
        await api.put(`/usuarios/${usuario.id}`, payload);
      }
      onGuardado();
      onClose();
    } catch (e) {
      setError(e.message || "Error al guardar.");
    }
    setGuardando(false);
  };

  const USR_ICON = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={esNuevo ? "Nuevo usuario" : `Editar — ${usuario.nombre}`}
      icon={USR_ICON}
      width="460px"
      footer={
        <>
          <KeyboardHint />
          <div style={{ display:"flex", gap:8 }}>
            <BtnSecondary onClick={onClose}>Cancelar</BtnSecondary>
            <BtnPrimary onClick={guardar} loading={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </BtnPrimary>
          </div>
        </>
      }
    >
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {error && (
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"8px 12px", fontSize:12.5 }}>
            {error}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns: esNuevo ? "1fr 1fr" : "1fr", gap:12 }}>
          <div>
            <FieldLabel required>Usuario</FieldLabel>
            <FieldInput type="text" value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              disabled={!esNuevo}
              style={!esNuevo ? { background:"#f1f5f9", color:"#94a3b8" } : {}}
            />
          </div>
          {esNuevo && (
            <div>
              <FieldLabel required>Contraseña</FieldLabel>
              <FieldInput type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          )}
        </div>

        {!esNuevo && (
          <div>
            <FieldLabel>Nueva contraseña <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, color:"#cbd5e1" }}>(vacío = sin cambio)</span></FieldLabel>
            <FieldInput type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
        )}

        <div>
          <FieldLabel>Rol</FieldLabel>
          <FieldSelect value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
            <option value="usuario">Usuario</option>
            <option value="admin">Admin</option>
          </FieldSelect>
        </div>

        {/* Módulos */}
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <FieldLabel>Módulos habilitados</FieldLabel>
            <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:11.5, color:"#2563eb", cursor:"pointer" }}>
              <input type="checkbox" checked={form.acceso_total}
                onChange={e => setForm(f => ({ ...f, acceso_total: e.target.checked }))}
                style={{ accentColor:"#2563eb" }}
              />
              Acceso total
            </label>
          </div>

          {form.acceso_total ? (
            <p style={{ fontSize:12, color:"#94a3b8", fontStyle:"italic" }}>El usuario podrá ver todos los módulos.</p>
          ) : (
            <div style={{ maxHeight:300, overflowY:"auto", display:"flex", flexDirection:"column", gap:4 }}>
              {TODOS_MODULOS.map(m => {
                const activo    = form.modulos.includes(m.key);
                const expandido = expandidos[m.key];
                const tieneRestricciones = activo && m.subs?.length > 1 && form.submodulos[m.key];
                return (
                  <div key={m.key} style={{ borderRadius:7, border:"1px solid", borderColor: activo ? "#bfdbfe" : "#f1f5f9", background: activo ? "#f0f7ff" : "#f8fafc", overflow:"hidden" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 10px" }}>
                      <input type="checkbox" checked={activo} onChange={() => toggleModulo(m.key)}
                        style={{ accentColor:"#2563eb", width:14, height:14, cursor:"pointer", flexShrink:0 }} />
                      <span style={{ flex:1, fontSize:12.5, color: activo ? "#1e293b" : "#94a3b8", fontWeight: activo ? 500 : 400 }}>
                        {m.label}
                        {tieneRestricciones && (
                          <span style={{ marginLeft:6, fontSize:9.5, color:"#d97706", fontWeight:600 }}>
                            ({form.submodulos[m.key].length}/{m.subs.length})
                          </span>
                        )}
                      </span>
                      {activo && m.subs?.length > 1 && (
                        <button type="button"
                          onClick={() => setExpandidos(e => ({ ...e, [m.key]: !e[m.key] }))}
                          style={{ fontSize:10, color:"#64748b", background:"none", border:"none", cursor:"pointer", padding:"0 4px" }}>
                          {expandido ? "▲" : "▼"}
                        </button>
                      )}
                    </div>
                    {activo && expandido && m.subs?.length > 1 && (
                      <div style={{ paddingLeft:34, paddingRight:10, paddingBottom:8, display:"flex", flexDirection:"column", gap:5, borderTop:"1px solid #dbeafe" }}>
                        {m.subs.map(s => (
                          <label key={s.key} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#475569", cursor:"pointer" }}>
                            <input type="checkbox"
                              checked={isSubEnabled(m.key, s.key)}
                              onChange={() => toggleSubmodulo(m.key, s.key)}
                              style={{ accentColor:"#2563eb", width:13, height:13 }} />
                            {s.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function UsuariosPage() {
  const { rol } = useAuth();
  const router  = useRouter();
  const [usuarios,  setUsuarios]  = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState("");
  const [modal,     setModal]     = useState(null); // null | "nuevo" | {usuario}
  const [confirm,   setConfirm]   = useState(null); // usuario a desactivar/activar

  // Solo admins pueden entrar
  useEffect(() => {
    if (rol && rol !== "admin") router.push("/dashboard");
  }, [rol, router]);

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await api.get("/usuarios/");
      setUsuarios(data);
    } catch { setError("No se pudieron cargar los usuarios."); }
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const toggleActivo = async (u) => {
    try {
      await api.put(`/usuarios/${u.id}`, { activo: !u.activo });
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, activo: !u.activo } : x));
    } catch { setError("No se pudo cambiar el estado."); }
    setConfirm(null);
  };

  const modulosLabel = (u) => {
    if (!u.modulos) return <span style={{ fontSize:11, color:"#2563eb", fontWeight:600 }}>Acceso total</span>;
    if (u.modulos.length === 0) return <span style={{ fontSize:11, color:"#94a3b8", fontStyle:"italic" }}>Sin acceso</span>;
    return (
      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
        {u.modulos.map(m => {
          const found = TODOS_MODULOS.find(x => x.key === m);
          return (
            <span key={m} style={{ fontSize:9.5, padding:"2px 7px", borderRadius:999, background:"#eff6ff", color:"#2563eb", fontWeight:500 }}>
              {found?.label || m}
            </span>
          );
        })}
      </div>
    );
  };

  const TH = { textAlign:"left", padding:"8px 20px", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#0f172a" }}>Usuarios</h1>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"#64748b" }}>Gestioná los accesos y permisos de cada usuario</p>
        </div>
        <button onClick={() => setModal("nuevo")} style={{
          display:"flex", alignItems:"center", gap:7,
          background:"#2563eb", color:"#fff", border:"none",
          borderRadius:9, padding:"9px 18px", fontSize:13, fontWeight:600, cursor:"pointer",
        }}
          onMouseEnter={e=>e.currentTarget.style.background="#1d4ed8"}
          onMouseLeave={e=>e.currentTarget.style.background="#2563eb"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo usuario
        </button>
      </div>

      {error && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:10, padding:"10px 16px", fontSize:13 }}>{error}</div>}

      {/* Tabla */}
      <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr>
              <th style={TH}>Usuario</th>
              <th style={TH}>Rol</th>
              <th style={TH}>Módulos</th>
              <th style={TH}>Estado</th>
              <th style={{ ...TH, textAlign:"right" }}></th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={5} style={{ padding:"20px", fontSize:12, color:"#94a3b8" }}>Cargando…</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={5} style={{ padding:"20px", fontSize:12, color:"#94a3b8" }}>Sin usuarios</td></tr>
            ) : usuarios.map(u => (
              <tr key={u.id} style={{ borderBottom:"1px solid #f8fafc", opacity: u.activo ? 1 : 0.5 }}
                onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                <td style={{ padding:"11px 20px", fontSize:13, fontWeight:600, color:"#1e293b" }}>{u.nombre}</td>
                <td style={{ padding:"11px 20px" }}>
                  <span style={{
                    fontSize:10, padding:"3px 9px", borderRadius:999, fontWeight:600,
                    background: u.rol==="admin" ? "#eff6ff" : "#f1f5f9",
                    color: u.rol==="admin" ? "#2563eb" : "#64748b",
                  }}>
                    {u.rol === "admin" ? "Admin" : "Usuario"}
                  </span>
                </td>
                <td style={{ padding:"11px 20px", maxWidth:260 }}>{modulosLabel(u)}</td>
                <td style={{ padding:"11px 20px" }}>
                  <span style={{
                    fontSize:10, padding:"3px 9px", borderRadius:999, fontWeight:600,
                    background: u.activo ? "#f0fdf4" : "#fef2f2",
                    color: u.activo ? "#16a34a" : "#dc2626",
                  }}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td style={{ padding:"11px 20px", textAlign:"right", whiteSpace:"nowrap" }}>
                  <button onClick={() => setModal(u)} style={{
                    padding:6, borderRadius:7, border:"none", background:"transparent",
                    color:"#64748b", cursor:"pointer", marginRight:4,
                  }}
                    onMouseEnter={e=>{e.currentTarget.style.background="#eff6ff"; e.currentTarget.style.color="#2563eb";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#64748b";}}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button onClick={() => setConfirm(u)} style={{
                    padding:6, borderRadius:7, border:"none", background:"transparent",
                    color: u.activo ? "#ef4444" : "#16a34a", cursor:"pointer",
                  }}
                    onMouseEnter={e=>{e.currentTarget.style.background= u.activo ? "#fef2f2" : "#f0fdf4";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}
                  >
                    {u.activo ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal crear / editar */}
      {modal && (
        <ModalUsuario
          usuario={modal === "nuevo" ? null : modal}
          onClose={() => setModal(null)}
          onGuardado={cargar}
        />
      )}

      {/* Confirm desactivar / activar */}
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.activo ? "Desactivar usuario" : "Activar usuario"}
        width="380px"
        footer={
          <>
            <div />
            <div style={{ display:"flex", gap:8 }}>
              <BtnSecondary onClick={() => setConfirm(null)}>Cancelar</BtnSecondary>
              <button onClick={() => toggleActivo(confirm)} style={{
                padding:"7px 16px", borderRadius:8, border:"none", fontSize:12.5, fontWeight:600, cursor:"pointer",
                background: confirm?.activo ? "#ef4444" : "#16a34a", color:"#fff",
              }}>
                {confirm?.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          </>
        }
      >
        <p style={{ margin:0, fontSize:13.5, color:"#334155", lineHeight:1.6 }}>
          ¿{confirm?.activo ? "Desactivar" : "Activar"} al usuario <strong>{confirm?.nombre}</strong>?
          {confirm?.activo && " No podrá ingresar hasta que lo reactives."}
        </p>
      </Modal>
    </div>
  );
}
