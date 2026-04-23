"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

const IconChevron = ({ open }) => (
  <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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

export default function ClientesPage() {
  const [clientes,      setClientes]      = useState([]);
  const [adding,        setAdding]        = useState(false);
  const [editando,      setEditando]      = useState(null);
  const [form,          setForm]          = useState({ empresa: "", base: "", nombre: "", celular: "", direccion: "", localidad: "", email: "" });
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
      setForm({ empresa: "", base: "", nombre: "", celular: "", direccion: "", localidad: "", email: "" });
      setAdding(false);
      cargar();
    } catch { setMsg("Error al guardar el cliente."); }
  };

  const editar = (c) => {
    setEditando(c.id);
    setForm({ empresa: c.empresa || c.nombre || "", base: c.base || "", nombre: c.nombre || "", celular: c.celular || "", direccion: c.direccion || "", localidad: c.localidad || "", email: c.email || "" });
    setAdding(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  // Agrupar por empresa
  const grupos = {};
  clientesFiltrados.forEach(c => {
    const key = c.empresa || c.nombre || "Sin empresa";
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(c);
  });
  const gruposOrdenados = Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b, "es"));

  return (
    <div className="space-y-6">
      {msg && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{msg}</div>}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
        <button onClick={() => { setAdding(!adding); setEditando(null); setForm({ empresa: "", base: "", nombre: "", celular: "", direccion: "", localidad: "", email: "" }); }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
          {adding ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

      {/* Formulario agregar/editar */}
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

      {/* Barra de búsqueda */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar por empresa, responsable, localidad..."
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

      {/* Grupos colapsables */}
      {gruposOrdenados.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-8 text-center text-slate-400 text-sm">
          Sin resultados
        </div>
      ) : (
        <div className="space-y-2">
          {gruposOrdenados.map(([empresa, lista]) => {
            const abierto = !!abiertos[empresa];
            return (
              <div key={empresa} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

                {/* Header clickeable */}
                <button type="button" onClick={() => toggleEmpresa(empresa)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left">
                  <div>
                    <span className="text-sm font-semibold text-slate-800">{empresa}</span>
                    <span className="ml-3 text-xs text-slate-400">
                      {lista.length === 1 ? "1 contacto" : `${lista.length} contactos`}
                    </span>
                  </div>
                  <IconChevron open={abierto} />
                </button>

                {/* Contenido expandido */}
                {abierto && (
                  <div className="border-t border-slate-100 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                          <th className="text-left px-5 py-2.5">Base</th>
                          <th className="text-left px-5 py-2.5">Responsable</th>
                          <th className="text-left px-5 py-2.5">Celular</th>
                          <th className="text-left px-5 py-2.5">Dirección</th>
                          <th className="text-left px-5 py-2.5">Localidad</th>
                          <th className="text-left px-5 py-2.5">Email</th>
                          <th className="px-5 py-2.5 w-20"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lista.map(c => (
                          <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="px-5 py-2.5 text-xs">{c.base || "—"}</td>
                            <td className="px-5 py-2.5 text-xs">{c.nombre || "—"}</td>
                            <td className="px-5 py-2.5 text-xs">{c.celular || "—"}</td>
                            <td className="px-5 py-2.5 text-xs">{c.direccion || "—"}</td>
                            <td className="px-5 py-2.5 text-xs">{c.localidad || "—"}</td>
                            <td className="px-5 py-2.5 text-xs">{c.email || "—"}</td>
                            <td className="px-5 py-2.5">
                              <div className="flex gap-2 items-center">
                                <button onClick={() => editar(c)}
                                  className="text-blue-500 hover:text-blue-700 transition" title="Editar">
                                  <IconEdit />
                                </button>
                                <button onClick={() => eliminar(c.id)}
                                  className="text-red-400 hover:text-red-600 transition" title="Eliminar">
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
