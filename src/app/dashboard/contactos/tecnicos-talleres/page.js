"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

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

// ── Popover de precios ────────────────────────────────────────────────────
function PreciosPopover({ contacto, onClose, anchorRef }) {
  const ref = useRef();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target) && !anchorRef.current?.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const precios = PRECIOS_LABELS.map(p => ({ ...p, valor: contacto[p.key] })).filter(p => p.valor != null);

  return (
    <div ref={ref} className="absolute right-0 z-50 mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-2">{contacto.nombre}</p>
      {precios.length === 0 ? (
        <p className="text-slate-400">Sin precios cargados</p>
      ) : (
        <div className="space-y-1">
          {precios.map(p => (
            <div key={p.key} className="flex justify-between">
              <span className="text-slate-500">{p.label}</span>
              <span className="font-medium text-slate-700">{fmt(p.valor)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal de contactos (subresponsables) ──────────────────────────────────
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-700">Contactos — {contacto.nombre}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <form onSubmit={agregar} className="flex gap-2 flex-wrap">
          <input type="text" placeholder="Nombre *" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-32" required />
          <input type="text" placeholder="Celular" value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-36" />
          <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-44" />
          <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm">+</button>
        </form>
        {msg && <p className="text-xs text-green-600">{msg}</p>}
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {subs.length === 0 ? <p className="text-sm text-slate-400">Sin contactos cargados</p>
            : subs.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-slate-700">{s.nombre}</span>
                  {s.celular && <span className="text-xs text-slate-500 ml-2">{s.celular}</span>}
                  {s.email   && <span className="text-xs text-slate-500 ml-2">{s.email}</span>}
                </div>
                <button onClick={() => eliminar(s.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ── Modal de edición / creación ───────────────────────────────────────────
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
    // Convertir precios vacíos a null, y strings a int
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-800">
            {contacto ? "Editar técnico / taller" : "Nuevo técnico / taller"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={guardar} className="p-6 space-y-5">
          {/* Datos generales */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Datos generales</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Responsable *</label>
                <input type="text" value={form.nombre} onChange={e => setF("nombre", e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Razón Social</label>
                <input type="text" value={form.razon_social} onChange={e => setF("razon_social", e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Celular</label>
                <input type="text" value={form.celular} onChange={e => setF("celular", e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setF("email", e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Dirección</label>
                <input type="text" value={form.direccion} onChange={e => setF("direccion", e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Localidad</label>
                <input type="text" value={form.localidad} onChange={e => setF("localidad", e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          {/* Precios acordados */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Precios acordados</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PRECIOS_LABELS.map(p => (
                <div key={p.key}>
                  <label className="block text-xs text-slate-500 mb-1">{p.label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" min="0" value={form[p.key]}
                      onChange={e => setF(p.key, e.target.value)}
                      className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-sm"
                      placeholder="—" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="submit"
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
              {contacto ? "Guardar cambios" : "Guardar"}
            </button>
            <button type="button" onClick={onClose}
              className="text-slate-500 hover:text-slate-700 text-sm px-4 py-2 rounded-lg border border-slate-300 transition">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Fila con popover de precios ───────────────────────────────────────────
function FilaContacto({ c, onEditar, onEliminar, onVerSubs }) {
  const [showPrecios, setShowPrecios] = useState(false);
  const btnRef = useRef();
  const tienePrecios = PRECIOS_LABELS.some(p => c[p.key] != null);

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-2.5 text-xs font-medium text-slate-800">{c.nombre}</td>
      <td className="px-4 py-2.5 text-xs text-slate-500">{c.razon_social || "—"}</td>
      <td className="px-4 py-2.5 text-xs">{c.celular || "—"}</td>
      <td className="px-4 py-2.5 text-xs">{c.direccion || "—"}</td>
      <td className="px-4 py-2.5 text-xs">{c.localidad || "—"}</td>
      <td className="px-4 py-2.5 text-xs">{c.email || "—"}</td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          {/* Contactos */}
          <button onClick={() => onVerSubs(c)} title="Contactos"
            className="text-teal-500 hover:text-teal-700 transition">
            <IconUsers />
          </button>

          {/* Precios */}
          <div className="relative">
            <button ref={btnRef} onClick={() => setShowPrecios(v => !v)} title="Ver precios"
              className={`transition ${tienePrecios ? "text-amber-500 hover:text-amber-700" : "text-slate-300 hover:text-slate-500"}`}>
              <IconMoney />
            </button>
            {showPrecios && (
              <PreciosPopover contacto={c} anchorRef={btnRef} onClose={() => setShowPrecios(false)} />
            )}
          </div>

          {/* Editar */}
          <button onClick={() => onEditar(c)} title="Editar"
            className="text-blue-500 hover:text-blue-700 transition">
            <IconEdit />
          </button>

          {/* Eliminar */}
          <button onClick={() => onEliminar(c.id)} title="Eliminar"
            className="text-red-400 hover:text-red-600 transition">
            <IconTrash />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function TecnicosTalleresPage() {
  const [contactos, setContactos] = useState([]);
  const [modalEdit, setModalEdit] = useState(null);   // null | false (nuevo) | contacto (editar)
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
    <div className="space-y-6">
      {verSubs  && <SubresponsablesModal contacto={verSubs} onClose={() => setVerSubs(null)} />}
      {modalEdit !== null && (
        <EditModal
          contacto={modalEdit || null}
          onClose={() => setModalEdit(null)}
          onSaved={() => { setModalEdit(null); cargar(); }}
        />
      )}

      {errorCarga && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{errorCarga}</div>}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Técnicos / Talleres</h1>
        <button onClick={() => setModalEdit(false)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
          + Agregar
        </button>
      </div>

      <div className="flex gap-2">
        <input type="text" placeholder="Buscar por nombre, razón social, localidad, celular..."
          value={textoBusqueda}
          onChange={e => setTextoBusqueda(e.target.value)}
          onKeyDown={e => e.key === "Enter" && setBusqueda(textoBusqueda)}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button onClick={() => setBusqueda(textoBusqueda)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
          Buscar
        </button>
        {busqueda && (
          <button onClick={() => { setBusqueda(""); setTextoBusqueda(""); }}
            className="text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg text-sm border border-slate-300 transition">
            Limpiar
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
              <th className="text-left px-4 py-3">Responsable</th>
              <th className="text-left px-4 py-3">Razón Social</th>
              <th className="text-left px-4 py-3">Celular</th>
              <th className="text-left px-4 py-3">Dirección</th>
              <th className="text-left px-4 py-3">Localidad</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contactosFiltrados.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400 text-xs">Sin resultados</td></tr>
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
  );
}
