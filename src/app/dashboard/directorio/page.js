"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export default function DirectorioPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "personal";
  const [personas, setPersonas] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ nombre: "", equipo_id: "", ciudad: "", contacto: "", email: "", tipo: "interno" });

  useEffect(() => {
    cargar();
    api.get("/equipos/").then(setEquipos).catch(() => {});
  }, [tab]);

  const cargar = async () => {
    try {
      let data;
      if (tab === "personal") {
        data = await api.get("/directorio/tecnicos");
      } else if (tab === "clientes") {
        data = await api.get("/directorio/", { tipo: "cliente" });
      } else {
        data = await api.get("/directorio/", { tipo: "proveedor" });
      }
      setPersonas(data);
    } catch {}
  };

  const guardar = async (e) => {
    e.preventDefault();
    const tipo = tab === "personal" ? "interno" : tab === "clientes" ? "cliente" : "proveedor";
    try {
      await api.post("/directorio/", { ...form, tipo });
      setAdding(false);
      setForm({ nombre: "", equipo_id: "", ciudad: "", contacto: "", email: "", tipo: "interno" });
      cargar();
    } catch {}
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar?")) return;
    try {
      await api.delete(`/directorio/${id}`);
      cargar();
    } catch {}
  };

  const equipoNombre = (eqId) => {
    const eq = equipos.find((e) => e.id === eqId);
    return eq ? eq.nombre : "—";
  };

  const titulo = tab === "personal" ? "Personal" : tab === "clientes" ? "Clientes" : "Proveedores";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{titulo}</h1>
        <button onClick={() => setAdding(!adding)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
          {adding ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

      {adding && (
        <form onSubmit={guardar} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Nombre</label>
              <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
            </div>
            {tab === "personal" && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">Equipo</label>
                <select value={form.equipo_id} onChange={(e) => setForm({ ...form, equipo_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Sin asignar</option>
                  {equipos.map((eq) => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Ciudad</label>
              <input type="text" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Contacto</label>
              <input type="text" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
            Guardar
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
              <th className="text-left px-4 py-3">Nombre</th>
              {tab === "personal" && <th className="text-left px-4 py-3">Equipo</th>}
              <th className="text-left px-4 py-3">Ciudad</th>
              <th className="text-left px-4 py-3">Contacto</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {personas.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">{p.nombre}</td>
                {tab === "personal" && <td className="px-4 py-3">{equipoNombre(p.equipo_id)}</td>}
                <td className="px-4 py-3">{p.ciudad || "—"}</td>
                <td className="px-4 py-3">{p.contacto || "—"}</td>
                <td className="px-4 py-3">{p.email || "—"}</td>
                <td className="px-4 py-3">
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
