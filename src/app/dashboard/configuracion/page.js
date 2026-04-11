"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

// ─── COMPONENTE GENÉRICO DE TABLA CRUD ────────────────────────────

function CrudSection({ titulo, items, columnas, onAdd, onDelete, FormComponent }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700">{titulo}</h2>
        <button onClick={() => setAdding(!adding)}
          className="text-sm text-blue-600 hover:underline">
          {adding ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

      {adding && <FormComponent onDone={() => { setAdding(false); onAdd(); }} />}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500 text-xs">
            {columnas.map(c => <th key={c.key} className="text-left py-2 px-2">{c.label}</th>)}
            <th className="text-left py-2 px-2 w-16">Acción</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={columnas.length + 1} className="py-3 text-slate-400 text-xs px-2">Sin registros</td></tr>
          ) : items.map(item => (
            <tr key={item.id} className="border-b border-slate-100">
              {columnas.map(c => (
                <td key={c.key} className="py-2 px-2 text-xs">{c.render ? c.render(item) : (item[c.key] || "—")}</td>
              ))}
              <td className="py-2 px-2">
                <button onClick={() => onDelete(item.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── EQUIPOS ──────────────────────────────────────────────────────

function FormEquipo({ onDone }) {
  const [nombre, setNombre] = useState("");
  const [patente, setPatente] = useState("");

  const guardar = async (e) => {
    e.preventDefault();
    await api.post("/equipos/", { nombre, patente });
    onDone();
  };

  return (
    <form onSubmit={guardar} className="flex gap-2 items-end flex-wrap bg-slate-50 p-3 rounded-lg">
      <div>
        <label className="block text-xs text-slate-500 mb-1">Nombre</label>
        <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Equipo 3" className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" required />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Patente</label>
        <input type="text" value={patente} onChange={e => setPatente(e.target.value.toUpperCase())}
          placeholder="Ej: AB123CD" className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
      </div>
      <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">Guardar</button>
    </form>
  );
}

// ─── UBICACIONES DE STOCK ─────────────────────────────────────────

function FormUbicacion({ onDone }) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");

  const guardar = async (e) => {
    e.preventDefault();
    await api.post("/stock/ubicaciones/", { nombre, tipo: tipo || null });
    onDone();
  };

  return (
    <form onSubmit={guardar} className="flex gap-2 items-end flex-wrap bg-slate-50 p-3 rounded-lg">
      <div>
        <label className="block text-xs text-slate-500 mb-1">Nombre</label>
        <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
          placeholder="Ej: CD Mendoza" className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" required />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Tipo</label>
        <select value={tipo} onChange={e => setTipo(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">Sin tipo</option>
          <option value="oficina">Oficina</option>
          <option value="cd">CD (Centro Distribución)</option>
          <option value="camioneta">Camioneta</option>
          <option value="tecnico">Técnico</option>
        </select>
      </div>
      <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">Guardar</button>
    </form>
  );
}

// ─── PRODUCTOS DE STOCK ───────────────────────────────────────────

function FormProducto({ onDone }) {
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");

  const guardar = async (e) => {
    e.preventDefault();
    await api.post("/stock/productos/", { codigo, descripcion, categoria });
    onDone();
  };

  return (
    <form onSubmit={guardar} className="flex gap-2 items-end flex-wrap bg-slate-50 p-3 rounded-lg">
      <div>
        <label className="block text-xs text-slate-500 mb-1">Código</label>
        <input type="text" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())}
          placeholder="Ej: GPS-001" className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-28" required />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Descripción</label>
        <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
          placeholder="Ej: GPS Queclink" className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-48" required />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Categoría</label>
        <input type="text" value={categoria} onChange={e => setCategoria(e.target.value)}
          placeholder="Ej: GPS, Lectora, Cable..." className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-36" required />
      </div>
      <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">Guardar</button>
    </form>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────

export default function ConfiguracionPage() {
  const [equipos, setEquipos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [productos, setProductos] = useState([]);

  const cargarEquipos = () => api.get("/equipos/").then(setEquipos).catch(() => {});
  const cargarUbicaciones = () => api.get("/stock/ubicaciones/").then(setUbicaciones).catch(() => {});
  const cargarProductos = () => api.get("/stock/productos/").then(setProductos).catch(() => {});

  useEffect(() => {
    cargarEquipos();
    cargarUbicaciones();
    cargarProductos();
  }, []);

  const eliminarEquipo = async (id) => {
    if (!confirm("¿Eliminar?")) return;
    await api.put(`/equipos/${id}`, { activo: false });
    cargarEquipos();
  };

  const eliminarUbicacion = async (id) => {
    if (!confirm("¿Eliminar ubicación?")) return;
    await api.delete(`/stock/ubicaciones/${id}`);
    cargarUbicaciones();
  };

  const eliminarProducto = async (id) => {
    if (!confirm("¿Eliminar producto?")) return;
    await api.delete(`/stock/productos/${id}`);
    cargarProductos();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
      <p className="text-sm text-slate-500">Administrá equipos, ubicaciones de stock y productos.</p>

      <CrudSection
        titulo="Equipos"
        items={equipos}
        columnas={[
          { key: "nombre", label: "Nombre" },
          { key: "patente", label: "Patente" },
        ]}
        onAdd={cargarEquipos}
        onDelete={eliminarEquipo}
        FormComponent={FormEquipo}
      />

      <CrudSection
        titulo="Ubicaciones de Stock"
        items={ubicaciones}
        columnas={[
          { key: "nombre", label: "Nombre" },
          { key: "tipo", label: "Tipo" },
        ]}
        onAdd={cargarUbicaciones}
        onDelete={eliminarUbicacion}
        FormComponent={FormUbicacion}
      />

      <CrudSection
        titulo="Productos de Stock"
        items={productos}
        columnas={[
          { key: "codigo", label: "Código" },
          { key: "descripcion", label: "Descripción" },
          { key: "categoria", label: "Categoría" },
        ]}
        onAdd={cargarProductos}
        onDelete={eliminarProducto}
        FormComponent={FormProducto}
      />
    </div>
  );
}
