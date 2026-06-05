"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

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

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-800">
            {esNuevo ? "Nuevo usuario" : `Editar — ${usuario.nombre}`}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className={esNuevo ? "" : "col-span-2"}>
              <label className="block text-xs text-slate-500 mb-1">Usuario</label>
              <input type="text" value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                disabled={!esNuevo}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400" />
            </div>
            {esNuevo && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">Contraseña</label>
                <input type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            )}
          </div>

          {!esNuevo && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Nueva contraseña <span className="text-slate-400">(dejar vacío para no cambiar)</span></label>
              <input type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 mb-1">Rol</label>
            <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="usuario">Usuario</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-500">Módulos habilitados</label>
              <label className="flex items-center gap-1.5 text-xs text-indigo-600 cursor-pointer">
                <input type="checkbox" checked={form.acceso_total}
                  onChange={e => setForm(f => ({ ...f, acceso_total: e.target.checked }))}
                  className="rounded" />
                Acceso total
              </label>
            </div>
            {!form.acceso_total && (
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {TODOS_MODULOS.map(m => {
                  const activo    = form.modulos.includes(m.key);
                  const expandido = expandidos[m.key];
                  const tieneRestricciones = activo && m.subs?.length > 1 && form.submodulos[m.key];
                  return (
                    <div key={m.key}>
                      <div className="flex items-center gap-2">
                        <input type="checkbox"
                          checked={activo}
                          onChange={() => toggleModulo(m.key)}
                          className="rounded border-slate-300 text-indigo-600 shrink-0" />
                        <span
                          className={`text-sm flex-1 ${activo ? "text-slate-700" : "text-slate-400"}`}>
                          {m.label}
                          {tieneRestricciones && (
                            <span className="ml-1.5 text-[10px] text-amber-600 font-medium">
                              ({form.submodulos[m.key].length}/{m.subs.length})
                            </span>
                          )}
                        </span>
                        {activo && m.subs?.length > 1 && (
                          <button type="button"
                            onClick={() => setExpandidos(e => ({ ...e, [m.key]: !e[m.key] }))}
                            className="text-slate-400 hover:text-indigo-500 text-xs px-1">
                            {expandido ? "▲" : "▼"}
                          </button>
                        )}
                      </div>
                      {activo && expandido && m.subs?.length > 1 && (
                        <div className="ml-6 mt-1 space-y-1 border-l-2 border-indigo-100 pl-3 pb-1">
                          {m.subs.map(s => (
                            <label key={s.key} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                              <input type="checkbox"
                                checked={isSubEnabled(m.key, s.key)}
                                onChange={() => toggleSubmodulo(m.key, s.key)}
                                className="rounded border-slate-300 text-indigo-500" />
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
            {form.acceso_total && (
              <p className="text-xs text-slate-400 italic">El usuario podrá ver todos los módulos.</p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando}
            className="px-5 py-2 text-sm bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium rounded-lg transition disabled:opacity-60">
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
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
    if (!u.modulos) return <span className="text-indigo-600 font-medium text-xs">Acceso total</span>;
    if (u.modulos.length === 0) return <span className="text-slate-400 text-xs italic">Sin acceso</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {u.modulos.map(m => {
          const found = TODOS_MODULOS.find(x => x.key === m);
          return (
            <span key={m} className="bg-indigo-50 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded font-medium">
              {found?.label || m}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
          <p className="text-sm text-slate-400 mt-0.5">Gestioná los accesos y permisos de cada usuario</p>
        </div>
        <button onClick={() => setModal("nuevo")}
          className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition shadow-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
              <th className="text-left px-5 py-3">Usuario</th>
              <th className="text-left px-5 py-3">Rol</th>
              <th className="text-left px-5 py-3">Módulos</th>
              <th className="text-left px-5 py-3">Estado</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={5} className="px-5 py-6 text-slate-400 text-xs">Cargando…</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-6 text-slate-400 text-xs">Sin usuarios</td></tr>
            ) : usuarios.map(u => (
              <tr key={u.id} className={`border-b border-slate-100 hover:bg-slate-50 ${!u.activo ? "opacity-50" : ""}`}>
                <td className="px-5 py-3 font-medium text-slate-800">{u.nombre}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    u.rol === "admin"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {u.rol === "admin" ? "Admin" : "Usuario"}
                  </span>
                </td>
                <td className="px-5 py-3 max-w-[260px]">{modulosLabel(u)}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    u.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  }`}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button onClick={() => setModal(u)}
                    className="text-indigo-500 hover:text-indigo-700 p-1.5 rounded hover:bg-indigo-50 transition mr-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => setConfirm(u)}
                    className={`p-1.5 rounded transition ${
                      u.activo
                        ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                        : "text-green-500 hover:text-green-700 hover:bg-green-50"
                    }`}>
                    {u.activo ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
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
      {confirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <p className="text-sm text-slate-700">
              ¿{confirm.activo ? "Desactivar" : "Activar"} al usuario <strong>{confirm.nombre}</strong>?
              {confirm.activo && " No podrá ingresar hasta que lo reactives."}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirm(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
                Cancelar
              </button>
              <button onClick={() => toggleActivo(confirm)}
                className={`px-4 py-2 text-sm text-white font-medium rounded-lg transition ${
                  confirm.activo ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"
                }`}>
                {confirm.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
