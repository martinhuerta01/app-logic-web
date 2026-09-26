"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { CrudSection, IconChevron } from "./CrudSection";

function useEquipos() {
  const [equipos, setEquipos] = useState([]);
  useEffect(() => { api.get("/equipos/").then(setEquipos).catch(() => {}); }, []);
  return equipos;
}

function useUbicaciones() {
  const [ubicaciones, setUbicaciones] = useState([]);
  useEffect(() => { api.get("/stock/ubicaciones/").then(setUbicaciones).catch(() => {}); }, []);
  return ubicaciones;
}

function FormUbicacion({ onDone }) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [equipoId, setEquipoId] = useState("");
  const [materialesId, setMaterialesId] = useState("");
  const todasUbicaciones = useUbicaciones();
  const equipos = useEquipos();

  const guardar = async (e) => {
    e.preventDefault();
    await api.post("/stock/ubicaciones/", { nombre, tipo: tipo || null, equipo_id: equipoId || null, ubicacion_materiales_id: materialesId || null });
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
          <option value="general">General</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Equipo (opcional)</label>
        <select value={equipoId} onChange={e => setEquipoId(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">Sin equipo</option>
          {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Materiales de instalación salen de</label>
        <select value={materialesId} onChange={e => setMaterialesId(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">La misma ubicación</option>
          {todasUbicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
      </div>
      <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">Guardar</button>
    </form>
  );
}

function EditFormUbicacion({ item, onDone, onCancel }) {
  const [nombre, setNombre] = useState(item.nombre || "");
  const [tipo, setTipo] = useState(item.tipo || "");
  const [equipoId, setEquipoId] = useState(item.equipo_id || "");
  const [materialesId, setMaterialesId] = useState(item.ubicacion_materiales_id || "");
  const todasUbicaciones = useUbicaciones().filter(u => u.id !== item.id);
  const equipos = useEquipos();

  const guardar = async (e) => {
    e.preventDefault();
    await api.put(`/stock/ubicaciones/${item.id}`, { nombre, tipo: tipo || null, equipo_id: equipoId || null, ubicacion_materiales_id: materialesId || null });
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
          <option value="general">General</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Equipo (opcional)</label>
        <select value={equipoId} onChange={e => setEquipoId(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">Sin equipo</option>
          {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Materiales de instalación salen de</label>
        <select value={materialesId} onChange={e => setMaterialesId(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">La misma ubicación</option>
          {todasUbicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
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
  const [plazo, setPlazo] = useState("");

  const guardar = async (e) => {
    e.preventDefault();
    await api.post("/stock/productos/", { codigo, descripcion, categoria, plazo_entrega_dias: plazo === "" ? null : parseInt(plazo, 10) });
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
      <div>
        <label className="block text-xs text-slate-500 mb-1">Plazo de entrega (días)</label>
        <input type="number" min="0" value={plazo} onChange={e => setPlazo(e.target.value)}
          placeholder="Ej: 15" className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-28" />
      </div>
      <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">Guardar</button>
    </form>
  );
}

function ToggleActivo({ item, onChange }) {
  const [guardando, setGuardando] = useState(false);
  const activo = item.activo !== false;

  const cambiar = async () => {
    setGuardando(true);
    try {
      await api.put(`/stock/productos/${item.id}`, { activo: !activo });
      onChange();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <label className={`inline-flex items-center gap-1.5 cursor-pointer ${guardando ? "opacity-50" : ""}`}>
      <input type="checkbox" checked={activo} disabled={guardando} onChange={cambiar} className="accent-green-600" />
      <span className={activo ? "text-slate-600" : "text-slate-400"}>{activo ? "Activo" : "Inactivo"}</span>
    </label>
  );
}

function EditFormProducto({ item, onDone, onCancel }) {
  const [codigo, setCodigo] = useState(item.codigo || "");
  const [descripcion, setDescripcion] = useState(item.descripcion || "");
  const [categoria, setCategoria] = useState(item.categoria || "");
  const [plazo, setPlazo] = useState(item.plazo_entrega_dias ?? "");

  const guardar = async (e) => {
    e.preventDefault();
    await api.put(`/stock/productos/${item.id}`, { codigo, descripcion, categoria, plazo_entrega_dias: plazo === "" ? null : parseInt(plazo, 10) });
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
      <div>
        <label className="block text-xs text-slate-500 mb-1">Plazo de entrega (días)</label>
        <input type="number" min="0" value={plazo} onChange={e => setPlazo(e.target.value)}
          placeholder="Ej: 15" className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-28" />
      </div>
      <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">Guardar</button>
      <button type="button" onClick={onCancel} className="text-slate-500 hover:underline text-sm">Cancelar</button>
    </form>
  );
}

// ─── MAPEO SERENÍSIMA ─────────────────────────────────────────────

function MapeoSerenisima({ productos }) {
  const [abierto,   setAbierto]   = useState(false);
  const [mapeos,    setMapeos]    = useState([]);
  const [adding,    setAdding]    = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMapeo, setErrorMapeo] = useState("");

  const cargar = () => api.get("/stock/mapeo-serenisima/").then(setMapeos).catch(() => setErrorMapeo("No se pudo cargar el mapeo de Serenísima."));
  useEffect(() => { cargar(); }, []);

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar mapeo?")) return;
    await api.delete(`/stock/mapeo-serenisima/${id}`);
    cargar();
  };

  const getNombresProductos = (ids) => {
    if (!ids || !ids.length) return "—";
    return ids.map(id => {
      const p = productos.find(pr => String(pr.id) === String(id));
      return p ? `${p.codigo} - ${p.descripcion}` : String(id);
    }).join(", ");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <button type="button"
        onClick={() => { setAbierto(v => !v); if (!abierto) { setAdding(false); setEditingId(null); } }}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition">
        <div className="text-left">
          <h2 className="text-base font-semibold text-slate-700">Mapeo Códigos La Serenísima</h2>
          <p className="text-xs text-slate-400 mt-0.5">Relaciona tus productos internos con los códigos de La Serenísima (1-9)</p>
        </div>
        <IconChevron open={abierto} />
      </button>

      {abierto && (
      <div className="border-t border-slate-100 p-5 space-y-3">
      <div className="flex justify-end">
        <button onClick={() => { setAdding(!adding); setEditingId(null); }}
          className="text-sm text-blue-600 hover:underline">
          {adding ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

      {errorMapeo && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{errorMapeo}</div>}
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
      )}
    </div>
  );
}

function FormMapeo({ productos, item, onDone, onCancel }) {
  const [codigo, setCodigo] = useState(item?.codigo_serenisima || "");
  const [descripcion, setDescripcion] = useState(item?.descripcion || "");
  const [selectedIds, setSelectedIds] = useState(
    (item?.producto_ids || []).filter(id => productos.some(p => String(p.id) === String(id)))
  );

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
                  <label key={p.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs cursor-pointer border ${selectedIds.map(String).includes(String(p.id)) ? "bg-blue-100 border-blue-400 text-blue-700" : "bg-white border-slate-200 text-slate-600"}`}>
                    <input type="checkbox" checked={selectedIds.map(String).includes(String(p.id))} onChange={() => toggleProducto(p.id)} className="hidden" />
                    {p.codigo}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {selectedIds.length > 0 && (
          <div className="text-xs text-slate-500 mt-1">
            Seleccionados: {selectedIds.map(id => productos.find(p => String(p.id) === String(id))?.codigo).filter(Boolean).join(", ")}
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

export default function CatalogosStock() {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [productos, setProductos] = useState([]);
  const [errorCarga, setErrorCarga] = useState("");
  const equiposCatalogo = useEquipos();

  const cargarUbicaciones = () => api.get("/stock/ubicaciones/").then(setUbicaciones).catch(() => setErrorCarga("No se pudieron cargar las ubicaciones."));
  const cargarProductos = () => api.get("/stock/productos/").then(setProductos).catch(() => setErrorCarga("No se pudieron cargar los productos."));

  useEffect(() => {
    cargarUbicaciones();
    cargarProductos();
  }, []);

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
    <>
      {errorCarga && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:10, padding:"10px 16px", fontSize:13 }}>{errorCarga}</div>}

      <CrudSection
        titulo="Ubicaciones de Stock"
        items={ubicaciones}
        columnas={[
          { key: "nombre", label: "Nombre" },
          { key: "tipo", label: "Tipo" },
          { key: "equipo_id", label: "Equipo", render: (item) => equiposCatalogo.find(e => e.id === item.equipo_id)?.nombre || "—" },
          { key: "ubicacion_materiales_id", label: "Materiales desde", render: (item) => ubicaciones.find(u => u.id === item.ubicacion_materiales_id)?.nombre || "—" },
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
          { key: "plazo_entrega_dias", label: "Plazo de entrega", render: (item) => item.plazo_entrega_dias != null ? `${item.plazo_entrega_dias} días` : "—" },
          { key: "activo", label: "Estado", render: (item) => <ToggleActivo item={item} onChange={cargarProductos} /> },
        ]}
        onAdd={cargarProductos}
        onDelete={eliminarProducto}
        onEdit={cargarProductos}
        FormComponent={FormProducto}
        EditFormComponent={EditFormProducto}
      />

      <MapeoSerenisima productos={productos} />
    </>
  );
}
