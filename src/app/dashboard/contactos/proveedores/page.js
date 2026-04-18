"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ producto: "", empresa: "", nombre: "", celular: "", direccion: "", localidad: "", email: "" });
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const data = await api.get("/directorio/", { tipo: "proveedor" });
      setProveedores(data);
    } catch {}
  };

  const guardar = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, tipo: "proveedor", nombre: form.empresa || form.nombre };
      if (editando) {
        await api.put(`/directorio/${editando}`, payload);
        setEditando(null);
      } else {
        await api.post("/directorio/", payload);
      }
      setForm({ producto: "", empresa: "", nombre: "", celular: "", direccion: "", localidad: "", email: "" });
      setAdding(false);
      cargar();
    } catch {}
  };

  const editar = (p) => {
    setEditando(p.id);
    setForm({ producto: p.producto || "", empresa: p.empresa || p.nombre || "", nombre: p.nombre || "", celular: p.celular || "", direccion: p.direccion || "", localidad: p.localidad || "", email: p.email || "" });
    setAdding(true);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Proveedores</h1>
        <button onClick={() => { setAdding(!adding); setEditando(null); setForm({ producto: "", empresa: "", nombre: "", celular: "", direccion: "", localidad: "", email: "" }); }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
          {adding ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar por producto, empresa, responsable, localidad..."
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

      {adding && (
        <form onSubmit={guardar} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">{editando ? "Editar proveedor" : "Nuevo proveedor"}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Producto *</label>
              <input type="text" value={form.producto} onChange={e => setForm({ ...form, producto: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Empresa *</label>
              <input type="text" value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
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
              <th className="text-left px-4 py-3">Producto</th>
              <th className="text-left px-4 py-3">Empresa</th>
              <th className="text-left px-4 py-3">Responsable</th>
              <th className="text-left px-4 py-3">Celular</th>
              <th className="text-left px-4 py-3">Dirección</th>
              <th className="text-left px-4 py-3">Localidad</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proveedoresFiltrados.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400 text-xs">Sin resultados</td></tr>
            ) : proveedoresFiltrados.map(p => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-xs">{p.producto || "—"}</td>
                <td className="px-4 py-2.5 text-xs font-medium">{p.empresa || p.nombre}</td>
                <td className="px-4 py-2.5 text-xs">{p.nombre || "—"}</td>
                <td className="px-4 py-2.5 text-xs">{p.celular || "—"}</td>
                <td className="px-4 py-2.5 text-xs">{p.direccion || "—"}</td>
                <td className="px-4 py-2.5 text-xs">{p.localidad || "—"}</td>
                <td className="px-4 py-2.5 text-xs">{p.email || "—"}</td>
                <td className="px-4 py-2.5 flex gap-2">
                  <button onClick={() => editar(p)} className="text-blue-600 hover:underline text-xs">Editar</button>
                  <button onClick={() => eliminar(p.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
