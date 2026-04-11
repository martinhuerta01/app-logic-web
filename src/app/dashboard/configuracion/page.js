"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

// ─── COMPONENTE GENÉRICO DE TABLA CRUD ────────────────────────────

function CrudSection({ titulo, items, columnas, onAdd, onDelete, onEdit, FormComponent, EditFormComponent }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700">{titulo}</h2>
        <button onClick={() => { setAdding(!adding); setEditingId(null); }}
          className="text-sm text-blue-600 hover:underline">
          {adding ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

      {adding && <FormComponent onDone={() => { setAdding(false); onAdd(); }} />}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500 text-xs">
            {columnas.map(c => <th key={c.key} className="text-left py-2 px-2">{c.label}</th>)}
            <th className="text-left py-2 px-2 w-32">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={columnas.length + 1} className="py-3 text-slate-400 text-xs px-2">Sin registros</td></tr>
          ) : items.map(item => (
            editingId === item.id ? (
              <tr key={item.id} className="border-b border-slate-100 bg-blue-50">
                <td colSpan={columnas.length + 1} className="py-2 px-2">
                  {EditFormComponent && (
                    <EditFormComponent
                      item={item}
                      onDone={() => { setEditingId(null); onEdit(); }}
                      onCancel={() => setEditingId(null)}
                    />
                  )}
                </td>
              </tr>
            ) : (
              <tr key={item.id} className="border-b border-slate-100">
                {columnas.map(c => (
                  <td key={c.key} className="py-2 px-2 text-xs">{c.render ? c.render(item) : (item[c.key] || "—")}</td>
                ))}
                <td className="py-2 px-2 space-x-2">
                  {EditFormComponent && (
                    <button onClick={() => { setEditingId(item.id); setAdding(false); }}
                      className="text-blue-500 hover:underline text-xs">Editar</button>
                  )}
                  <button onClick={() => onDelete(item.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                </td>
              </tr>
            )
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

function EditFormEquipo({ item, onDone, onCancel }) {
  const [nombre, setNombre] = useState(item.nombre || "");
  const [patente, setPatente] = useState(item.patente || "");

  const guardar = async (e) => {
    e.preventDefault();
    await api.put(`/equipos/${item.id}`, { nombre, patente });
    onDone();
  };

  return (
    <form onSubmit={guardar} className="flex gap-2 items-end flex-wrap">
      <div>
        <label className="block text-xs text-slate-500 mb-1">Nombre</label>
        <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" required />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Patente</label>
        <input type="text" value={patente} onChange={e => setPatente(e.target.value.toUpperCase())}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
      </div>
      <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">Guardar</button>
      <button type="button" onClick={onCancel} className="text-slate-500 hover:underline text-sm">Cancelar</button>
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

function EditFormUbicacion({ item, onDone, onCancel }) {
  const [nombre, setNombre] = useState(item.nombre || "");
  const [tipo, setTipo] = useState(item.tipo || "");

  const guardar = async (e) => {
    e.preventDefault();
    await api.put(`/stock/ubicaciones/${item.id}`, { nombre, tipo: tipo || null });
    onDone();
  };

  return (
    <form onSubmit={guardar} className="flex gap-2 items-end flex-wrap">
      <div>
        <label className="block text-xs text-slate-500 mb-1">Nombre</label>
        <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" required />
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
      <button type="button" onClick={onCancel} className="text-slate-500 hover:underline text-sm">Cancelar</button>
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
          placeholder="Ej: D03" className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-28" required />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Descripción</label>
        <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
          placeholder="Ej: TRAX S40 (NUEVOS)" className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-48" required />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Categoría</label>
        <input type="text" value={categoria} onChange={e => setCategoria(e.target.value)}
          placeholder="Ej: DISPOSITIVOS" className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-36" required />
      </div>
      <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">Guardar</button>
    </form>
  );
}

function EditFormProducto({ item, onDone, onCancel }) {
  const [codigo, setCodigo] = useState(item.codigo || "");
  const [descripcion, setDescripcion] = useState(item.descripcion || "");
  const [categoria, setCategoria] = useState(item.categoria || "");

  const guardar = async (e) => {
    e.preventDefault();
    await api.put(`/stock/productos/${item.id}`, { codigo, descripcion, categoria });
    onDone();
  };

  return (
    <form onSubmit={guardar} className="flex gap-2 items-end flex-wrap">
      <div>
        <label className="block text-xs text-slate-500 mb-1">Código</label>
        <input type="text" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-28" required />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Descripción</label>
        <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-48" required />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Categoría</label>
        <input type="text" value={categoria} onChange={e => setCategoria(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-36" required />
      </div>
      <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">Guardar</button>
      <button type="button" onClick={onCancel} className="text-slate-500 hover:underline text-sm">Cancelar</button>
    </form>
  );
}

// ─── MAPEO SERENÍSIMA ─────────────────────────────────────────────

function MapeoSerenisima({ productos }) {
  const [mapeos, setMapeos] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const cargar = () => api.get("/stock/mapeo-serenisima/").then(setMapeos).catch(() => {});
  useEffect(() => { cargar(); }, []);

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar mapeo?")) return;
    await api.delete(`/stock/mapeo-serenisima/${id}`);
    cargar();
  };

  const getNombresProductos = (ids) => {
    if (!ids || !ids.length) return "—";
    return ids.map(id => {
      const p = productos.find(pr => pr.id === id);
      return p ? `${p.codigo} - ${p.descripcion}` : id;
    }).join(", ");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-700">Mapeo Códigos La Serenísima</h2>
          <p className="text-xs text-slate-400 mt-0.5">Relaciona tus productos internos con los códigos de La Serenísima (1-9)</p>
        </div>
        <button onClick={() => { setAdding(!adding); setEditingId(null); }}
          className="text-sm text-blue-600 hover:underline">
          {adding ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

      {adding && <FormMapeo productos={productos} onDone={() => { setAdding(false); cargar(); }} />}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500 text-xs">
            <th className="text-left py-2 px-2 w-16">Código</th>
            <th className="text-left py-2 px-2">Descripción Serenísima</th>
            <th className="text-left py-2 px-2">Productos internos asociados</th>
            <th className="text-left py-2 px-2 w-32">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {mapeos.length === 0 ? (
            <tr><td colSpan={4} className="py-3 text-slate-400 text-xs px-2">Sin mapeos configurados</td></tr>
          ) : mapeos.map(m => (
            editingId === m.id ? (
              <tr key={m.id} className="border-b border-slate-100 bg-blue-50">
                <td colSpan={4} className="py-2 px-2">
                  <FormMapeo productos={productos} item={m} onDone={() => { setEditingId(null); cargar(); }} onCancel={() => setEditingId(null)} />
                </td>
              </tr>
            ) : (
              <tr key={m.id} className="border-b border-slate-100">
                <td className="py-2 px-2 text-xs font-bold text-center">{m.codigo_serenisima}</td>
                <td className="py-2 px-2 text-xs">{m.descripcion}</td>
                <td className="py-2 px-2 text-xs">{getNombresProductos(m.producto_ids)}</td>
                <td className="py-2 px-2 space-x-2">
                  <button onClick={() => { setEditingId(m.id); setAdding(false); }} className="text-blue-500 hover:underline text-xs">Editar</button>
                  <button onClick={() => eliminar(m.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormMapeo({ productos, item, onDone, onCancel }) {
  const [codigo, setCodigo] = useState(item?.codigo_serenisima || "");
  const [descripcion, setDescripcion] = useState(item?.descripcion || "");
  const [selectedIds, setSelectedIds] = useState(item?.producto_ids || []);

  const toggleProducto = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const guardar = async (e) => {
    e.preventDefault();
    const payload = { codigo_serenisima: parseInt(codigo), descripcion, producto_ids: selectedIds };
    if (item) {
      await api.put(`/stock/mapeo-serenisima/${item.id}`, payload);
    } else {
      await api.post("/stock/mapeo-serenisima/", payload);
    }
    onDone();
  };

  // Agrupar productos por categoría
  const categorias = {};
  productos.forEach(p => {
    if (!categorias[p.categoria]) categorias[p.categoria] = [];
    categorias[p.categoria].push(p);
  });

  return (
    <form onSubmit={guardar} className="space-y-3 bg-slate-50 p-3 rounded-lg">
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Código Serenísima</label>
          <input type="number" min="1" max="99" value={codigo} onChange={e => setCodigo(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-20" required />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Descripción</label>
          <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
            placeholder="Ej: GPS Comodato" className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-64" required />
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Productos internos asociados</label>
        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-white space-y-2">
          {Object.entries(categorias).map(([cat, prods]) => (
            <div key={cat}>
              <div className="text-xs font-semibold text-slate-500 mb-1">{cat}</div>
              <div className="flex flex-wrap gap-1">
                {prods.map(p => (
                  <label key={p.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs cursor-pointer border ${selectedIds.includes(p.id) ? "bg-blue-100 border-blue-400 text-blue-700" : "bg-white border-slate-200 text-slate-600"}`}>
                    <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleProducto(p.id)} className="hidden" />
                    {p.codigo}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {selectedIds.length > 0 && (
          <div className="text-xs text-slate-500 mt-1">
            Seleccionados: {selectedIds.map(id => productos.find(p => p.id === id)?.codigo).filter(Boolean).join(", ")}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">Guardar</button>
        {onCancel && <button type="button" onClick={onCancel} className="text-slate-500 hover:underline text-sm">Cancelar</button>}
      </div>
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
        onEdit={cargarEquipos}
        FormComponent={FormEquipo}
        EditFormComponent={EditFormEquipo}
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
        onEdit={cargarUbicaciones}
        FormComponent={FormUbicacion}
        EditFormComponent={EditFormUbicacion}
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
        onEdit={cargarProductos}
        FormComponent={FormProducto}
        EditFormComponent={EditFormProducto}
      />

      <MapeoSerenisima productos={productos} />
    </div>
  );
}
