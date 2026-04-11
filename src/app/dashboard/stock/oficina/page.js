"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

/* ───────── OFICINA — ACTUAL ───────── */
function OficinaActual() {
  const [productos, setProductos] = useState([]);
  const [stockActual, setStockActual] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [oficina, setOficina] = useState(null);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [prods, ubics] = await Promise.all([
        api.get("/stock/productos/"),
        api.get("/stock/ubicaciones/"),
      ]);
      setProductos(prods);
      const ofic = ubics.find((u) => u.nombre.toLowerCase() === "oficina" || u.tipo === "oficina");
      setOficina(ofic);
      if (ofic) {
        const [stock, movs] = await Promise.all([
          api.get("/stock/actual/", { ubicacion_id: ofic.id }),
          api.get("/stock/movimientos/"),
        ]);
        setStockActual(stock);
        setMovimientos(movs);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const resumen = productos.map((prod) => {
    const stockItem = stockActual.find((s) => s.producto_id === prod.id);
    const actual = stockItem ? stockItem.cantidad : 0;
    const entradas = movimientos
      .filter((m) => m.producto_id === prod.id && oficina &&
        (m.ubicacion_destino_id === oficina.id || m.destino_id === oficina.id) &&
        (m.tipo === "entrada" || m.tipo === "compra"))
      .reduce((sum, m) => sum + (m.cantidad || 0), 0);
    const salidas = movimientos
      .filter((m) => m.producto_id === prod.id && oficina &&
        (m.ubicacion_origen_id === oficina.id || m.origen_id === oficina.id) &&
        (m.tipo === "transferencia" || m.tipo === "salida"))
      .reduce((sum, m) => sum + (m.cantidad || 0), 0);
    return { codigo: prod.codigo, descripcion: prod.descripcion, cantidadInicial: actual - entradas + salidas, entradas, salidas, actual };
  }).filter((r) => r.actual !== 0 || r.entradas !== 0 || r.salidas !== 0);

  if (loading) return <p className="text-slate-500 text-sm">Cargando stock...</p>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
            <th className="text-left px-4 py-3">Código</th>
            <th className="text-left px-4 py-3">Insumo</th>
            <th className="text-right px-4 py-3">Cant. Inicial</th>
            <th className="text-right px-4 py-3">Entradas</th>
            <th className="text-right px-4 py-3">Salidas</th>
            <th className="text-right px-4 py-3">Stock Actual</th>
          </tr>
        </thead>
        <tbody>
          {resumen.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay stock registrado en Oficina</td></tr>
          ) : (
            resumen.map((r) => (
              <tr key={r.codigo} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-mono text-xs font-medium">{r.codigo}</td>
                <td className="px-4 py-2.5">{r.descripcion}</td>
                <td className="px-4 py-2.5 text-right">{r.cantidadInicial}</td>
                <td className="px-4 py-2.5 text-right text-green-600 font-medium">{r.entradas > 0 ? `+${r.entradas}` : "—"}</td>
                <td className="px-4 py-2.5 text-right text-red-600 font-medium">{r.salidas > 0 ? `-${r.salidas}` : "—"}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className={`font-bold ${r.actual <= 0 ? "text-red-600" : r.actual <= 5 ? "text-orange-500" : "text-green-600"}`}>
                    {r.actual}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ───────── OFICINA — ENTRADAS ───────── */
function OficinaEntradas() {
  const [productos, setProductos] = useState([]);
  const [oficina, setOficina] = useState(null);
  const [form, setForm] = useState({ codigo: "", cantidad: "", fecha: new Date().toISOString().split("T")[0] });
  const [msg, setMsg] = useState("");
  const [historial, setHistorial] = useState([]);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [prods, ubics] = await Promise.all([
        api.get("/stock/productos/"),
        api.get("/stock/ubicaciones/"),
      ]);
      setProductos(prods);
      const ofic = ubics.find((u) => u.nombre.toLowerCase() === "oficina" || u.tipo === "oficina");
      setOficina(ofic);
      if (ofic) {
        const movs = await api.get("/stock/movimientos/");
        setHistorial(movs.filter((m) =>
          (m.ubicacion_destino_id === ofic.id || m.destino_id === ofic.id) &&
          (m.tipo === "entrada" || m.tipo === "compra")
        ));
      }
    } catch {}
  };

  const prodSeleccionado = productos.find((p) => p.codigo === form.codigo);

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!prodSeleccionado || !oficina) { setMsg("Error: seleccione un producto válido"); return; }
    try {
      await api.post("/stock/entradas/", {
        producto_id: prodSeleccionado.id, ubicacion_id: oficina.id,
        cantidad: parseInt(form.cantidad), fecha: form.fecha,
      });
      setMsg("Entrada registrada correctamente");
      setForm({ ...form, codigo: "", cantidad: "" });
      cargarDatos();
    } catch (err) { setMsg("Error: " + err.message); }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={guardar} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4 max-w-3xl">
        <h3 className="font-semibold text-slate-700">Registrar entrada a Oficina</h3>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Código</label>
            <select value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
              <option value="">Seleccionar</option>
              {productos.map((p) => <option key={p.id} value={p.codigo}>{p.codigo}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Insumo</label>
            <input type="text" value={prodSeleccionado ? prodSeleccionado.descripcion : ""} readOnly
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-600" placeholder="(automático)" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Cantidad</label>
            <input type="number" min="1" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha</label>
            <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
            Registrar entrada
          </button>
          {msg && <span className={`text-sm ${msg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{msg}</span>}
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <h3 className="font-semibold text-slate-700 px-4 pt-4 pb-2">
          Planilla de Entradas {historial.length > 0 && <span className="text-slate-400 font-normal text-sm">({historial.length} registros)</span>}
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
              <th className="text-left px-4 py-2">Código</th>
              <th className="text-left px-4 py-2">Insumo</th>
              <th className="text-right px-4 py-2">Cantidad</th>
              <th className="text-left px-4 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {historial.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Sin entradas registradas</td></tr>
            ) : (
              historial.map((m, i) => {
                const prod = productos.find((p) => p.id === m.producto_id);
                return (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-xs">{prod?.codigo || "—"}</td>
                    <td className="px-4 py-2">{prod?.descripcion || "—"}</td>
                    <td className="px-4 py-2 text-right text-green-600 font-medium">+{m.cantidad}</td>
                    <td className="px-4 py-2">{m.fecha || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────── OFICINA — SALIDAS ───────── */
function OficinaSalidas() {
  const [productos, setProductos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [oficina, setOficina] = useState(null);
  const [form, setForm] = useState({ destino: "", codigo: "", cantidad: "", fecha: new Date().toISOString().split("T")[0] });
  const [msg, setMsg] = useState("");
  const [historial, setHistorial] = useState([]);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [prods, ubics] = await Promise.all([
        api.get("/stock/productos/"),
        api.get("/stock/ubicaciones/"),
      ]);
      setProductos(prods);
      setUbicaciones(ubics);
      const ofic = ubics.find((u) => u.nombre.toLowerCase() === "oficina" || u.tipo === "oficina");
      setOficina(ofic);
      if (ofic) {
        const movs = await api.get("/stock/movimientos/");
        setHistorial(movs.filter((m) =>
          (m.ubicacion_origen_id === ofic.id || m.origen_id === ofic.id) &&
          (m.tipo === "transferencia" || m.tipo === "salida")
        ));
      }
    } catch {}
  };

  const prodSeleccionado = productos.find((p) => p.codigo === form.codigo);
  const destinosCDs = ubicaciones.filter((u) => u.tipo === "cd");
  const destinosGenerales = ubicaciones.filter((u) => u.tipo !== "oficina" && u.tipo !== "cd");

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!prodSeleccionado || !oficina) { setMsg("Error: seleccione un producto válido"); return; }
    const destUbic = ubicaciones.find((u) => u.nombre === form.destino);
    if (!destUbic) { setMsg("Error: destino no encontrado en ubicaciones"); return; }
    try {
      await api.post("/stock/transferencias/", {
        producto_id: prodSeleccionado.id, ubicacion_origen_id: oficina.id,
        ubicacion_destino_id: destUbic.id, cantidad: parseInt(form.cantidad), fecha: form.fecha,
      });
      setMsg("Salida registrada correctamente");
      setForm({ ...form, destino: "", codigo: "", cantidad: "" });
      cargarDatos();
    } catch (err) { setMsg("Error: " + err.message); }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={guardar} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4 max-w-4xl">
        <h3 className="font-semibold text-slate-700">Registrar salida de Oficina</h3>
        <div className="grid grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Destino</label>
            <select value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
              <option value="">Seleccionar</option>
              {destinosCDs.length > 0 && (
                <optgroup label="La Serenísima">
                  {destinosCDs.map((u) => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
                </optgroup>
              )}
              {destinosGenerales.length > 0 && (
                <optgroup label="General">
                  {destinosGenerales.map((u) => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
                </optgroup>
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Código</label>
            <select value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
              <option value="">Seleccionar</option>
              {productos.map((p) => <option key={p.id} value={p.codigo}>{p.codigo}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Insumo</label>
            <input type="text" value={prodSeleccionado ? prodSeleccionado.descripcion : ""} readOnly
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-600" placeholder="(automático)" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Cantidad</label>
            <input type="number" min="1" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha</label>
            <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
            Registrar salida
          </button>
          {msg && <span className={`text-sm ${msg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{msg}</span>}
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <h3 className="font-semibold text-slate-700 px-4 pt-4 pb-2">
          Planilla de Salidas {historial.length > 0 && <span className="text-slate-400 font-normal text-sm">({historial.length} registros)</span>}
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
              <th className="text-left px-4 py-2">Destino</th>
              <th className="text-left px-4 py-2">Código</th>
              <th className="text-left px-4 py-2">Insumo</th>
              <th className="text-right px-4 py-2">Cantidad</th>
              <th className="text-left px-4 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {historial.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Sin salidas registradas</td></tr>
            ) : (
              historial.map((m, i) => {
                const prod = productos.find((p) => p.id === m.producto_id);
                const dest = ubicaciones.find((u) => u.id === (m.ubicacion_destino_id || m.destino_id));
                return (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2">{dest?.nombre || "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">{prod?.codigo || "—"}</td>
                    <td className="px-4 py-2">{prod?.descripcion || "—"}</td>
                    <td className="px-4 py-2 text-right text-red-600 font-medium">-{m.cantidad}</td>
                    <td className="px-4 py-2">{m.fecha || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────── PAGE PRINCIPAL ───────── */
export default function OficinaStockPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "actual";

  const tabs = [
    { key: "actual", label: "Actual" },
    { key: "entradas", label: "Entradas" },
    { key: "salidas", label: "Salidas" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Stock — Oficina</h1>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {tabs.map((t) => (
            <a key={t.key} href={`/dashboard/stock/oficina?tab=${t.key}`}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                tab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              {t.label}
            </a>
          ))}
        </div>
      </div>
      {tab === "actual" && <OficinaActual />}
      {tab === "entradas" && <OficinaEntradas />}
      {tab === "salidas" && <OficinaSalidas />}
    </div>
  );
}
