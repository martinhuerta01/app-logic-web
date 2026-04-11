"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

function SubresponsablesModal({ contacto, onClose }) {
  const [subs, setSubs] = useState([]);
  const [form, setForm] = useState({ nombre: "", celular: "", email: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const data = await api.get(`/directorio/${contacto.id}/subresponsables`);
      setSubs(data);
    } catch {}
  };

  const agregar = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      await api.post("/directorio/subresponsable", { contacto_id: contacto.id, ...form });
      setForm({ nombre: "", celular: "", email: "" });
      setMsg("✓ Agregado");
      cargar();
    } catch { setMsg("Error"); }
  };

  const eliminar = async (id) => {
    await api.delete(`/directorio/subresponsable/${id}`);
    cargar();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-700">Contactos — {contacto.nombre}</h3>
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
          {subs.length === 0 ? (
            <p className="text-sm text-slate-400">Sin contactos cargados</p>
          ) : subs.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
              <div>
                <span className="text-sm font-medium text-slate-700">{s.nombre}</span>
                {s.celular && <span className="text-xs text-slate-500 ml-2">{s.celular}</span>}
                {s.email && <span className="text-xs text-slate-500 ml-2">{s.email}</span>}
              </div>
              <button onClick={() => eliminar(s.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TecnicosTalleresPage() {
  const [contactos, setContactos] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editando, setEditando] = useState(null);
  const [verSubs, setVerSubs] = useState(null);
  const [form, setForm] = useState({ nombre: "", celular: "", direccion: "", localidad: "", email: "" });

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const data = await api.get("/directorio/interior");
      setContactos(data);
    } catch {}
  };

  const guardar = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await api.put(`/directorio/${editando}`, { ...form, tipo: "interior" });
        setEditando(null);
      } else {
        await api.post("/directorio/", { ...form, tipo: "interior" });
      }
      setForm({ nombre: "", celular: "", direccion: "", localidad: "", email: "" });
      setAdding(false);
      cargar();
    } catch {}
  };

  const editar = (c) => {
    setEditando(c.id);
    setForm({ nombre: c.nombre || "", celular: c.celular || "", direccion: c.direccion || "", localidad: c.localidad || "", email: c.email || "" });
    setAdding(true);
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar?")) return;
    await api.delete(`/directorio/${id}`);
    cargar();
  };

  return (
    <div className="space-y-6">
      {verSubs && <SubresponsablesModal contacto={verSubs} onClose={() => setVerSubs(null)} />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Técnicos / Talleres</h1>
        <button onClick={() => { setAdding(!adding); setEditando(null); setForm({ nombre: "", celular: "", direccion: "", localidad: "", email: "" }); }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
          {adding ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

      {adding && (
        <form onSubmit={guardar} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">{editando ? "Editar" : "Nuevo técnico / taller"}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Responsable *</label>
              <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Celular</label>
              <input type="text" value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Dirección</label>
              <input type="text" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Localidad</label>
              <input type="text" value={form.localidad} onChange={e => setForm({ ...form, localidad: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
            {editando ? "Guardar cambios" : "Guardar"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
              <th className="text-left px-4 py-3">Responsable</th>
              <th className="text-left px-4 py-3">Celular</th>
              <th className="text-left px-4 py-3">Dirección</th>
              <th className="text-left px-4 py-3">Localidad</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contactos.map(c => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-xs font-medium">{c.nombre}</td>
                <td className="px-4 py-2.5 text-xs">{c.celular || "—"}</td>
                <td className="px-4 py-2.5 text-xs">{c.direccion || "—"}</td>
                <td className="px-4 py-2.5 text-xs">{c.localidad || "—"}</td>
                <td className="px-4 py-2.5 text-xs">{c.email || "—"}</td>
                <td className="px-4 py-2.5 flex gap-2 items-center">
                  <button onClick={() => setVerSubs(c)} className="text-teal-600 hover:underline text-xs">Contactos</button>
                  <button onClick={() => editar(c)} className="text-blue-600 hover:underline text-xs">Editar</button>
                  <button onClick={() => eliminar(c.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
