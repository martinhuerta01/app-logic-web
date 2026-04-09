"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

function StockActual() {
  const [stock, setStock] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [filtroUbicacion, setFiltroUbicacion] = useState("");

  useEffect(() => {
    api.get("/stock/ubicaciones/").then(setUbicaciones).catch(() => {});
  }, []);

  const buscar = async () => {
    const params = {};
    if (filtroUbicacion) {
      const ub = ubicaciones.find((u) => u.nombre === filtroUbicacion);
      if (ub) params.ubicacion_id = ub.id;
    }
    try {
      const data = await api.get("/stock/actual/", params);
      const result = data.map((item) => ({
        ...item,
        prod_codigo: item.productos?.codigo || "",
        prod_desc: item.productos?.descripcion || "",
        prod_cat: item.productos?.categoria || "",
        ubic_nombre: item.ubicaciones?.nombre || "",
      })).filter((item) => item.prod_codigo && item.ubic_nombre);
      setStock(result);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Ubicación</label>
          <select value={filtroUbicacion} onChange={(e) => setFiltroUbicacion(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todas</option>
            {ubicaciones.map((u) => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
          </select>
        </div>
        <button onClick={buscar} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">Buscar</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
              <th className="text-left px-4 py-3">Código</th>
              <th className="text-left px-4 py-3">Descripción</th>
              <th className="text-left px-4 py-3">Categoría</th>
              <th className="text-left px-4 py-3">Ubicación</th>
              <th className="text-left px-4 py-3">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((s, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-4 py-3">{s.prod_codigo}</td>
                <td className="px-4 py-3">{s.prod_desc}</td>
                <td className="px-4 py-3">{s.prod_cat}</td>
                <td className="px-4 py-3">{s.ubic_nombre}</td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${s.cantidad <= 0 ? "text-red-600" : s.cantidad > 5 ? "text-green-600" : "text-orange-500"}`}>
                    {s.cantidad}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Entradas() {
  const [productos, setProductos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [form, setForm] = useState({ producto: "", cantidad: "", proveedor: "", ubicacion: "", fecha: new Date().toISOString().split("T")[0], observaciones: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get("/stock/productos/").then(setProductos).catch(() => {});
    api.get("/stock/ubicaciones/").then(setUbicaciones).catch(() => {});
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    const prod = productos.find((p) => `${p.codigo} - ${p.descripcion}` === form.producto);
    const ubic = ubicaciones.find((u) => u.nombre === form.ubicacion);
    if (!prod || !ubic) { setMsg("Error con producto o ubicación"); return; }
    try {
      await api.post("/stock/entradas/", {
        producto_id: prod.id,
        ubicacion_id: ubic.id,
        cantidad: parseInt(form.cantidad),
        proveedor: form.proveedor || null,
        fecha: form.fecha,
        observaciones: form.observaciones || null,
      });
      setMsg("Entrada registrada");
      setForm({ ...form, cantidad: "", proveedor: "", observaciones: "" });
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  return (
    <form onSubmit={guardar} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4 max-w-xl">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Producto</label>
          <select value={form.producto} onChange={(e) => setForm({ ...form, producto: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
            <option value="">Seleccionar</option>
            {productos.map((p) => <option key={p.id} value={`${p.codigo} - ${p.descripcion}`}>{p.codigo} - {p.descripcion}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Cantidad</label>
          <input type="number" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Ubicación</label>
          <select value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
            <option value="">Seleccionar</option>
            {ubicaciones.map((u) => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Proveedor</label>
          <input type="text" value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Fecha</label>
          <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Observaciones</label>
        <input type="text" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">Registrar entrada</button>
        {msg && <span className={`text-sm ${msg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{msg}</span>}
      </div>
    </form>
  );
}

function Transferencias() {
  const [productos, setProductos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [form, setForm] = useState({ producto: "", cantidad: "", origen: "", destino: "", fecha: new Date().toISOString().split("T")[0] });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get("/stock/productos/").then(setProductos).catch(() => {});
    api.get("/stock/ubicaciones/").then(setUbicaciones).catch(() => {});
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    const prod = productos.find((p) => `${p.codigo} - ${p.descripcion}` === form.producto);
    const origen = ubicaciones.find((u) => u.nombre === form.origen);
    const destino = ubicaciones.find((u) => u.nombre === form.destino);
    if (!prod || !origen || !destino) { setMsg("Error con producto o ubicaciones"); return; }
    try {
      await api.post("/stock/transferencias/", {
        producto_id: prod.id,
        ubicacion_origen_id: origen.id,
        ubicacion_destino_id: destino.id,
        cantidad: parseInt(form.cantidad),
        fecha: form.fecha,
      });
      setMsg("Transferencia registrada");
      setForm({ ...form, cantidad: "" });
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  return (
    <form onSubmit={guardar} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4 max-w-xl">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Producto</label>
          <select value={form.producto} onChange={(e) => setForm({ ...form, producto: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
            <option value="">Seleccionar</option>
            {productos.map((p) => <option key={p.id} value={`${p.codigo} - ${p.descripcion}`}>{p.codigo} - {p.descripcion}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Cantidad</label>
          <input type="number" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Fecha</label>
          <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Origen</label>
          <select value={form.origen} onChange={(e) => setForm({ ...form, origen: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
            <option value="">Seleccionar</option>
            {ubicaciones.map((u) => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Destino</label>
          <select value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
            <option value="">Seleccionar</option>
            {ubicaciones.map((u) => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">Transferir</button>
        {msg && <span className={`text-sm ${msg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{msg}</span>}
      </div>
    </form>
  );
}

export default function StockPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "actual";

  const titulo = tab === "actual" ? "Stock Actual" : tab === "entradas" ? "Entradas" : "Transferencias";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{titulo}</h1>
      {tab === "actual" && <StockActual />}
      {tab === "entradas" && <Entradas />}
      {tab === "transferencias" && <Transferencias />}
    </div>
  );
}
