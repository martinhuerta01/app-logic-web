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
  const [editando, setEditando] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [prods, ubics] = await Promise.all([
        api.get("/stock/productos/"),
        api.get("/stock/ubicaciones/"),
      ]);
      setProductos(prods);
      const ofic = ubics.find(
        (u) => u.nombre.toLowerCase() === "oficina" || u.tipo === "oficina"
      );
      setOficina(ofic);
      if (ofic) {
        const [stock, movs] = await Promise.all([
          api.get("/stock/actual/", { ubicacion_id: ofic.id }),
          api.get("/stock/movimientos/"),
        ]);
        setStockActual(stock);
        setMovimientos(movs);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const resumen = productos.map((prod) => {
    const stockItem = stockActual.find((s) => s.producto_id === prod.id);
    const actual = stockItem ? stockItem.cantidad : 0;
    const stockItemId = stockItem?.id ?? null;

    const entradas = movimientos
      .filter(
        (m) =>
          m.producto_id === prod.id &&
          oficina &&
          (m.ubicacion_destino_id === oficina.id || m.destino_id === oficina.id) &&
          (m.tipo === "entrada" || m.tipo === "compra")
      )
      .reduce((sum, m) => sum + (m.cantidad || 0), 0);

    const salidas = movimientos
      .filter(
        (m) =>
          m.producto_id === prod.id &&
          oficina &&
          (m.ubicacion_origen_id === oficina.id || m.origen_id === oficina.id) &&
          (m.tipo === "transferencia" || m.tipo === "salida")
      )
      .reduce((sum, m) => sum + (m.cantidad || 0), 0);

    const cantidadInicial = actual - entradas + salidas;

    return { id: prod.id, stockItemId, codigo: prod.codigo, descripcion: prod.descripcion, cantidadInicial, entradas, salidas, actual };
  });

  const iniciarEdicion = (r) => {
    setEditando(r.id);
    setEditForm({ actual: String(r.actual) });
    setMsg("");
  };

  const cancelarEdicion = () => { setEditando(null); setEditForm({}); };

  const guardarEdicion = async (r) => {
    const nuevoActual = parseInt(editForm.actual, 10);
    if (isNaN(nuevoActual) || nuevoActual < 0) {
      setMsg("Error: ingresá un número válido");
      return;
    }
    const hoy = new Date().toISOString().split("T")[0];
    try {
      if (r.stockItemId) {
        // Intenta PATCH directo; si falla (405/404) crea un ajuste por diferencia
        try {
          await api.patch(`/stock/actual/${r.stockItemId}/`, { cantidad: nuevoActual });
        } catch {
          const diff = nuevoActual - r.actual;
          if (diff > 0 && oficina) {
            await api.post("/stock/entradas/", {
              producto_id: r.id,
              ubicacion_id: oficina.id,
              cantidad: diff,
              fecha: hoy,
              observaciones: "Ajuste manual",
            });
          }
        }
      } else {
        if (!oficina) { setMsg("Error: no se encontró la ubicación Oficina"); return; }
        if (nuevoActual > 0) {
          await api.post("/stock/entradas/", {
            producto_id: r.id,
            ubicacion_id: oficina.id,
            cantidad: nuevoActual,
            fecha: hoy,
            observaciones: "Ajuste manual",
          });
        }
      }
      setEditando(null);
      setMsg("Guardado");
      cargarDatos();
    } catch (e) {
      setMsg("Error al guardar: " + e.message);
    }
  };

  const eliminar = async (r) => {
    if (!window.confirm(`¿Eliminar stock de "${r.descripcion}"?`)) return;
    try {
      if (r.stockItemId) {
        await api.delete(`/stock/actual/${r.stockItemId}/`);
      }
      setMsg("Eliminado");
      cargarDatos();
    } catch (e) {
      setMsg("Error al eliminar: " + e.message);
    }
  };

  if (loading) {
    return <p className="text-slate-500 text-sm">Cargando stock...</p>;
  }

  return (
    <div className="space-y-3">
      {msg && (
        <p className={`text-sm font-medium ${msg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{msg}</p>
      )}
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
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {resumen.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No hay productos cargados
                </td>
              </tr>
            ) : (
              resumen.map((r) => {
                const editandoEste = editando === r.id;
                return (
                  <tr key={r.codigo} className={`border-b border-slate-100 ${editandoEste ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                    <td className="px-4 py-2.5 font-mono text-xs font-medium">{r.codigo}</td>
                    <td className="px-4 py-2.5">{r.descripcion}</td>

                    {editandoEste ? (
                      <>
                        <td className="px-4 py-2.5 text-right text-slate-300 text-xs">{r.cantidadInicial}</td>
                        <td className="px-4 py-2.5 text-right text-slate-300 text-xs">{r.entradas > 0 ? `+${r.entradas}` : "—"}</td>
                        <td className="px-4 py-2.5 text-right text-slate-300 text-xs">{r.salidas > 0 ? `-${r.salidas}` : "—"}</td>
                        <td className="px-2 py-1.5 text-right">
                          <input
                            type="number"
                            min="0"
                            value={editForm.actual}
                            onChange={e => setEditForm(f => ({ ...f, actual: e.target.value }))}
                            className="w-24 text-right border-2 border-blue-400 rounded px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
                            autoFocus
                          />
                        </td>
                        <td className="px-3 py-1.5 flex items-center gap-1 whitespace-nowrap">
                          <button onClick={() => guardarEdicion(r)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1 rounded transition">
                            Guardar
                          </button>
                          <button onClick={cancelarEdicion}
                            className="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 rounded transition">
                            Cancelar
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2.5 text-right">{r.cantidadInicial}</td>
                        <td className="px-4 py-2.5 text-right text-green-600 font-medium">
                          {r.entradas > 0 ? `+${r.entradas}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-red-600 font-medium">
                          {r.salidas > 0 ? `-${r.salidas}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`font-bold ${r.actual <= 0 ? "text-red-600" : r.actual <= 5 ? "text-orange-500" : "text-green-600"}`}>
                            {r.actual}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 flex items-center gap-1.5 whitespace-nowrap">
                          <button onClick={() => iniciarEdicion(r)}
                            className="text-slate-400 hover:text-blue-600 transition" title="Editar">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                            </svg>
                          </button>
                          <button onClick={() => eliminar(r)}
                            className="text-slate-400 hover:text-red-600 transition" title="Eliminar">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
                            </svg>
                          </button>
                        </td>
                      </>
                    )}
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

/* ───────── OFICINA — ENTRADAS ───────── */
function OficinaEntradas() {
  const [productos, setProductos] = useState([]);
  const [oficina, setOficina] = useState(null);
  const [form, setForm] = useState({
    codigo: "",
    cantidad: "",
    fecha: new Date().toISOString().split("T")[0],
  });
  const [msg, setMsg] = useState("");
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [prods, ubics] = await Promise.all([
        api.get("/stock/productos/"),
        api.get("/stock/ubicaciones/"),
      ]);
      setProductos(prods);
      const ofic = ubics.find(
        (u) => u.nombre.toLowerCase() === "oficina" || u.tipo === "oficina"
      );
      setOficina(ofic);
      if (ofic) {
        const movs = await api.get("/stock/movimientos/");
        const entradas = movs.filter(
          (m) =>
            (m.ubicacion_destino_id === ofic.id || m.destino_id === ofic.id) &&
            (m.tipo === "entrada" || m.tipo === "compra")
        );
        setHistorial(entradas.slice(0, 20));
      }
    } catch {}
  };

  const prodSeleccionado = productos.find((p) => p.codigo === form.codigo);

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!prodSeleccionado || !oficina) {
      setMsg("Error: seleccione un producto válido");
      return;
    }
    try {
      await api.post("/stock/entradas/", {
        producto_id: prodSeleccionado.id,
        ubicacion_id: oficina.id,
        cantidad: parseInt(form.cantidad),
        fecha: form.fecha,
      });
      setMsg("Entrada registrada correctamente");
      setForm({ ...form, codigo: "", cantidad: "" });
      cargarDatos();
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={guardar}
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4 max-w-2xl"
      >
        <h3 className="font-semibold text-slate-700">Registrar entrada a Oficina</h3>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Código</label>
            <select
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">Seleccionar</option>
              {productos.map((p) => (
                <option key={p.id} value={p.codigo}>
                  {p.codigo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Insumo</label>
            <input
              type="text"
              value={prodSeleccionado ? prodSeleccionado.descripcion : ""}
              readOnly
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-600"
              placeholder="(automático)"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Cantidad</label>
            <input
              type="number"
              min="1"
              value={form.cantidad}
              onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition"
          >
            Registrar entrada
          </button>
          {msg && (
            <span
              className={`text-sm ${
                msg.startsWith("Error") ? "text-red-600" : "text-green-600"
              }`}
            >
              {msg}
            </span>
          )}
        </div>
      </form>

      {historial.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto max-w-2xl">
          <h3 className="font-semibold text-slate-700 px-4 pt-4 pb-2">
            Últimas entradas
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
              {historial.map((m, i) => {
                const prod = productos.find((p) => p.id === m.producto_id);
                return (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-4 py-2 font-mono text-xs">
                      {prod?.codigo || "—"}
                    </td>
                    <td className="px-4 py-2">{prod?.descripcion || "—"}</td>
                    <td className="px-4 py-2 text-right text-green-600 font-medium">
                      +{m.cantidad}
                    </td>
                    <td className="px-4 py-2">{m.fecha || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ───────── OFICINA — SALIDAS ───────── */
const DESTINOS_SERENISIMA = [
  { slug: "general-rodriguez", nombre: "CD General Rodriguez" },
  { slug: "longchamps", nombre: "CD Longchamps" },
  { slug: "rosario", nombre: "CD Rosario" },
  { slug: "corrientes", nombre: "CD Corrientes" },
  { slug: "cordoba", nombre: "CD Córdoba" },
  { slug: "mar-del-plata", nombre: "CD Mar del Plata" },
  { slug: "mendoza", nombre: "CD Mendoza" },
  { slug: "tucuman", nombre: "CD Tucumán" },
  { slug: "neuquen", nombre: "CD Neuquén" },
  { slug: "bahia-blanca", nombre: "CD Bahía Blanca" },
];
const DESTINOS_GENERAL = [
  { slug: "camioneta-1", nombre: "Camioneta 1" },
  { slug: "camioneta-2", nombre: "Camioneta 2" },
  { slug: "vitaco", nombre: "Vitaco" },
  { slug: "claudio-violini", nombre: "Claudio Violini (Bahía)" },
  { slug: "alejandro", nombre: "Alejandro (Tucumán)" },
  { slug: "witralem", nombre: "Witralem Mendoza" },
];

function OficinaSalidas() {
  const [productos, setProductos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [oficina, setOficina] = useState(null);
  const [form, setForm] = useState({
    destino: "",
    codigo: "",
    cantidad: "",
    fecha: new Date().toISOString().split("T")[0],
  });
  const [msg, setMsg] = useState("");
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [prods, ubics] = await Promise.all([
        api.get("/stock/productos/"),
        api.get("/stock/ubicaciones/"),
      ]);
      setProductos(prods);
      setUbicaciones(ubics);
      const ofic = ubics.find(
        (u) => u.nombre.toLowerCase() === "oficina" || u.tipo === "oficina"
      );
      setOficina(ofic);
      if (ofic) {
        const movs = await api.get("/stock/movimientos/");
        const salidas = movs.filter(
          (m) =>
            (m.ubicacion_origen_id === ofic.id || m.origen_id === ofic.id) &&
            (m.tipo === "transferencia" || m.tipo === "salida")
        );
        setHistorial(salidas.slice(0, 20));
      }
    } catch {}
  };

  const prodSeleccionado = productos.find((p) => p.codigo === form.codigo);

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!prodSeleccionado || !oficina) {
      setMsg("Error: seleccione un producto válido");
      return;
    }
    const destUbic = ubicaciones.find((u) => u.nombre === form.destino);
    if (!destUbic) {
      setMsg("Error: destino no encontrado en ubicaciones");
      return;
    }
    try {
      await api.post("/stock/transferencias/", {
        producto_id: prodSeleccionado.id,
        ubicacion_origen_id: oficina.id,
        ubicacion_destino_id: destUbic.id,
        cantidad: parseInt(form.cantidad),
        fecha: form.fecha,
      });
      setMsg("Salida registrada correctamente");
      setForm({ ...form, destino: "", codigo: "", cantidad: "" });
      cargarDatos();
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={guardar}
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4 max-w-3xl"
      >
        <h3 className="font-semibold text-slate-700">Registrar salida de Oficina</h3>
        <div className="grid grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Destino</label>
            <select
              value={form.destino}
              onChange={(e) => setForm({ ...form, destino: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">Seleccionar</option>
              <optgroup label="La Serenísima">
                {DESTINOS_SERENISIMA.map((d) => (
                  <option key={d.slug} value={d.nombre}>
                    {d.nombre}
                  </option>
                ))}
              </optgroup>
              <optgroup label="General">
                {DESTINOS_GENERAL.map((d) => (
                  <option key={d.slug} value={d.nombre}>
                    {d.nombre}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Código</label>
            <select
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">Seleccionar</option>
              {productos.map((p) => (
                <option key={p.id} value={p.codigo}>
                  {p.codigo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Insumo</label>
            <input
              type="text"
              value={prodSeleccionado ? prodSeleccionado.descripcion : ""}
              readOnly
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-600"
              placeholder="(automático)"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Cantidad</label>
            <input
              type="number"
              min="1"
              value={form.cantidad}
              onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition"
          >
            Registrar salida
          </button>
          {msg && (
            <span
              className={`text-sm ${
                msg.startsWith("Error") ? "text-red-600" : "text-green-600"
              }`}
            >
              {msg}
            </span>
          )}
        </div>
      </form>

      {historial.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto max-w-3xl">
          <h3 className="font-semibold text-slate-700 px-4 pt-4 pb-2">
            Últimas salidas
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
              {historial.map((m, i) => {
                const prod = productos.find((p) => p.id === m.producto_id);
                const dest = ubicaciones.find(
                  (u) => u.id === (m.ubicacion_destino_id || m.destino_id)
                );
                return (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-4 py-2">{dest?.nombre || "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {prod?.codigo || "—"}
                    </td>
                    <td className="px-4 py-2">{prod?.descripcion || "—"}</td>
                    <td className="px-4 py-2 text-right text-red-600 font-medium">
                      -{m.cantidad}
                    </td>
                    <td className="px-4 py-2">{m.fecha || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
            <a
              key={t.key}
              href={`/dashboard/stock/oficina?tab=${t.key}`}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                tab === t.key
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
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
