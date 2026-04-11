"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ empresa: "", base: "", nombre: "", celular: "", direccion: "", localidad: "", email: "" });

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const data = await api.get("/directorio/", { tipo: "cliente" });
      setClientes(data);
    } catch {}
  };

  const guardar = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await api.put(`/directorio/${editando}`, { ...form, tipo: "cliente" });
        setEditando(null);
      } else {
        await api.post("/directorio/", { ...form, tipo: "cliente", nombre: form.empresa || form.nombre });
      }
      setForm({ empresa: "", base: "", nombre: "", celular: "", direccion: "", localidad: "", email: "" });
      setAdding(false);
      cargar();
    } catch {}
  };

  const editar = (c) => {
    setEditando(c.id);
    setForm({ empresa: c.empresa || c.nombre || "", base: c.base || "", nombre: c.nombre || "", celular: c.celular || "", direccion: c.direccion || "", localidad: c.localidad || "", email: c.email || "" });
    setAdding(true);
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar?")) return;
    await api.delete(`/directorio/${id}`);
    cargar();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
        <button onClick={() => { setAdding(!adding); setEditando(null); setForm({ empresa: "", base: "", nombre: "", celular: "", direccion: "", localidad: "", email: "" }); }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
          {adding ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

      {adding && (
        <form onSubmit={guardar} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">{editando ? "Editar cliente" : "Nuevo cliente"}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Empresa *</label>
              <input type="text" value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Base</label>
              <input type="text" value={form.base} onChange={e => setForm({ ...form, base: e.target.value })}
                placeholder="Ej: CABA, Mendoza..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Responsable</label>
              <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
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
              <th className="text-left px-4 py-3">Empresa</th>
              <th className="text-left px-4 py-3">Base</th>
              <th className="text-left px-4 py-3">Responsable</th>
              <th className="text-left px-4 py-3">Celular</th>
              <th className="text-left px-4 py-3">Dirección</th>
              <th className="text-left px-4 py-3">Localidad</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(c => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-xs font-medium">{c.empresa || c.nombre}</td>
                <td className="px-4 py-2.5 text-xs">{c.base || "—"}</td>
                <td className="px-4 py-2.5 text-xs">{c.nombre || "—"}</td>
                <td className="px-4 py-2.5 text-xs">{c.celular || "—"}</td>
                <td className="px-4 py-2.5 text-xs">{c.direccion || "—"}</td>
                <td className="px-4 py-2.5 text-xs">{c.localidad || "—"}</td>
                <td className="px-4 py-2.5 text-xs">{c.email || "—"}</td>
                <td className="px-4 py-2.5 flex gap-2">
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
