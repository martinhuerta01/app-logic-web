"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

const IconChevron = ({ open }) => (
  <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

/* ───────── OFICINA — ACTUAL ───────── */
function OficinaActual() {
  const [productos, setProductos] = useState([]);
  const [stockActual, setStockActual] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [oficina, setOficina] = useState(null);
  const [editando, setEditando] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [abiertos, setAbiertos] = useState({});
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
          String(m.producto_id) === String(prod.id) &&
          oficina &&
          (m.ubicacion_destino_id === oficina.id || m.destino_id === oficina.id) &&
          (m.tipo?.toLowerCase() === "entrada" || m.tipo?.toLowerCase() === "compra")
      )
      .reduce((sum, m) => sum + (m.cantidad || 0), 0);

    const salidas = movimientos
      .filter(
        (m) =>
          String(m.producto_id) === String(prod.id) &&
          oficina &&
          (m.ubicacion_origen_id === oficina.id || m.origen_id === oficina.id) &&
          (m.tipo?.toLowerCase() === "transferencia" || m.tipo?.toLowerCase() === "salida")
      )
      .reduce((sum, m) => sum + (m.cantidad || 0), 0);

    const cantidadInicial = actual - entradas + salidas;

    return { id: prod.id, stockItemId, codigo: prod.codigo, descripcion: prod.descripcion, categoria: prod.categoria || "Sin categoría", cantidadInicial, entradas, salidas, actual };
  });

  const categorias = {};
  resumen.forEach(r => {
    if (!categorias[r.categoria]) categorias[r.categoria] = [];
    categorias[r.categoria].push(r);
  });
  const categoriasOrdenadas = Object.entries(categorias).sort(([a], [b]) => a.localeCompare(b, "es"));

  const toggleCategoria = (key) =>
    setAbiertos(prev => ({ ...prev, [key]: !prev[key] }));

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
    const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
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
      {categoriasOrdenadas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-8 text-center text-slate-400 text-sm">
          No hay productos cargados
        </div>
      ) : (
        <div className="space-y-2">
          {categoriasOrdenadas.map(([cat, items]) => {
            const abierto = !!abiertos[cat];
            return (
              <div key={cat} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <button type="button" onClick={() => toggleCategoria(cat)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left">
                  <div>
                    <span className="text-sm font-semibold text-slate-800">{cat}</span>
                    <span className="ml-3 text-xs text-slate-400">
                      {items.length === 1 ? "1 producto" : `${items.length} productos`}
                    </span>
                  </div>
                  <IconChevron open={abierto} />
                </button>

                {abierto && (
                  <div className="border-t border-slate-100 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                          <th className="text-left px-4 py-2.5">Código</th>
                          <th className="text-left px-4 py-2.5">Insumo</th>
                          <th className="text-right px-4 py-2.5">Cant. Inicial</th>
                          <th className="text-right px-4 py-2.5">Entradas</th>
                          <th className="text-right px-4 py-2.5">Salidas</th>
                          <th className="text-right px-4 py-2.5">Stock Actual</th>
                          <th className="px-4 py-2.5 w-20"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((r) => {
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
                        })}
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

/* ───────── OFICINA — ENTRADAS ───────── */
function OficinaEntradas() {
  const [productos, setProductos] = useState([]);
  const [oficina, setOficina] = useState(null);
  const [form, setForm] = useState({
    codigo: "",
    cantidad: "",
    fecha: new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }),
  });
  const [msg, setMsg] = useState("");
  const [historial, setHistorial] = useState([]);
  const [editandoMov, setEditandoMov] = useState(null);
  const [editFormMov, setEditFormMov] = useState({});
  const [busqueda, setBusqueda] = useState("");

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
            (m.tipo?.toUpperCase() === "ENTRADA" || m.tipo?.toUpperCase() === "COMPRA")
        );
        setHistorial(entradas.sort((a,b) => (b.fecha||"").localeCompare(a.fecha||"")));
      }
    } catch { setMsg("Error al cargar datos. Verificá la conexión con el servidor."); }
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

  const eliminarMov = async (m) => {
    if (!window.confirm("¿Eliminar este movimiento? Se ajustará el stock automáticamente.")) return;
    try {
      await api.delete(`/stock/movimientos/${m.id}/`);
      setMsg("Movimiento eliminado");
      cargarDatos();
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  const guardarEditMov = async (m) => {
    const cant = parseInt(editFormMov.cantidad);
    if (isNaN(cant) || cant < 1) { setMsg("Error: cantidad inválida"); return; }
    try {
      await api.patch(`/stock/movimientos/${m.id}/`, { cantidad: cant, fecha: editFormMov.fecha });
      setEditandoMov(null);
      setMsg("Movimiento actualizado");
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
            <span className={`text-sm ${msg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
              {msg}
            </span>
          )}
        </div>
      </form>

      {historial.length > 0 && (() => {
        const histFiltrado = busqueda
          ? historial.filter(m => {
              const prod = productos.find(p => p.id === m.producto_id);
              const q = busqueda.toLowerCase();
              return prod?.descripcion?.toLowerCase().includes(q) || prod?.codigo?.toLowerCase().includes(q);
            })
          : historial;
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Historial de entradas</h3>
                <p className="text-xs text-slate-400 mt-0.5">{histFiltrado.length} registro{histFiltrado.length !== 1 ? "s" : ""}</p>
              </div>
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Filtrar por insumo o código…"
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-64"
              />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs">
                  <th className="text-left px-5 py-2.5">Código</th>
                  <th className="text-left px-5 py-2.5">Insumo</th>
                  <th className="text-right px-5 py-2.5">Cantidad</th>
                  <th className="text-left px-5 py-2.5">Fecha</th>
                  <th className="px-5 py-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {histFiltrado.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-4 text-slate-400 text-xs">Sin resultados</td></tr>
                ) : histFiltrado.map((m) => {
                  const prod = productos.find((p) => p.id === m.producto_id);
                  const editando = editandoMov === m.id;
                  return (
                    <tr key={m.id} className={`border-b border-slate-50 ${editando ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                      <td className="px-5 py-2.5 font-mono text-xs text-slate-500">{prod?.codigo || "—"}</td>
                      <td className="px-5 py-2.5 font-medium text-slate-700">{prod?.descripcion || "—"}</td>
                      {editando ? (
                        <>
                          <td className="px-2 py-1.5 text-right">
                            <input type="number" min="1" value={editFormMov.cantidad}
                              onChange={(e) => setEditFormMov(f => ({ ...f, cantidad: e.target.value }))}
                              className="w-20 text-right border-2 border-blue-400 rounded px-2 py-1 text-sm font-bold focus:outline-none" autoFocus />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="date" value={editFormMov.fecha}
                              onChange={(e) => setEditFormMov(f => ({ ...f, fecha: e.target.value }))}
                              className="border-2 border-blue-400 rounded px-2 py-1 text-sm focus:outline-none" />
                          </td>
                          <td className="px-3 py-1.5 flex items-center gap-1 whitespace-nowrap">
                            <button onClick={() => guardarEditMov(m)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1 rounded transition">Guardar</button>
                            <button onClick={() => setEditandoMov(null)} className="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 rounded transition">Cancelar</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-5 py-2.5 text-right text-green-600 font-semibold">+{m.cantidad}</td>
                          <td className="px-5 py-2.5 text-slate-500 text-xs">{m.fecha ? m.fecha.split("-").reverse().join("/") : "—"}</td>
                          <td className="px-4 py-2.5 flex items-center gap-1.5 whitespace-nowrap">
                            <button onClick={() => { setEditandoMov(m.id); setEditFormMov({ cantidad: String(m.cantidad), fecha: m.fecha || "" }); }}
                              className="text-slate-400 hover:text-blue-600 transition" title="Editar">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" /></svg>
                            </button>
                            <button onClick={() => eliminarMov(m)} className="text-slate-400 hover:text-red-600 transition" title="Eliminar">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" /></svg>
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}

/* ───────── OFICINA — SALIDAS ───────── */

function OficinaSalidas() {
  const [productos, setProductos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [oficina, setOficina] = useState(null);
  const [form, setForm] = useState({
    destino: "",
    codigo: "",
    cantidad: "",
    fecha: new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }),
  });
  const [msg, setMsg] = useState("");
  const [historial, setHistorial] = useState([]);
  const [editandoMov, setEditandoMov] = useState(null);
  const [editFormMov, setEditFormMov] = useState({});
  const [busqueda, setBusqueda] = useState("");

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
            (m.tipo?.toUpperCase() === "TRANSFERENCIA" || m.tipo?.toUpperCase() === "SALIDA")
        );
        setHistorial(salidas.sort((a,b) => (b.fecha||"").localeCompare(a.fecha||"")));
      }
    } catch { setMsg("Error al cargar datos. Verificá la conexión con el servidor."); }
  };

  const eliminarMov = async (m) => {
    if (!window.confirm("¿Eliminar este movimiento? Se ajustará el stock automáticamente.")) return;
    try {
      await api.delete(`/stock/movimientos/${m.id}/`);
      setMsg("Movimiento eliminado");
      cargarDatos();
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  const guardarEditMov = async (m) => {
    const cant = parseInt(editFormMov.cantidad);
    if (isNaN(cant) || cant < 1) { setMsg("Error: cantidad inválida"); return; }
    try {
      await api.patch(`/stock/movimientos/${m.id}/`, { cantidad: cant, fecha: editFormMov.fecha });
      setEditandoMov(null);
      setMsg("Movimiento actualizado");
      cargarDatos();
    } catch (err) {
      setMsg("Error: " + err.message);
    }
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
              {ubicaciones.filter(u => u.tipo === "cd").length > 0 && (
                <optgroup label="La Serenísima">
                  {ubicaciones.filter(u => u.tipo === "cd").map(u => (
                    <option key={u.id} value={u.nombre}>{u.nombre}</option>
                  ))}
                </optgroup>
              )}
              {ubicaciones.filter(u => u.tipo !== "oficina" && u.tipo !== "cd").length > 0 && (
                <optgroup label="General">
                  {ubicaciones.filter(u => u.tipo !== "oficina" && u.tipo !== "cd").map(u => (
                    <option key={u.id} value={u.nombre}>{u.nombre}</option>
                  ))}
                </optgroup>
              )}
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

      {historial.length > 0 && (() => {
        const histFiltrado = busqueda
          ? historial.filter(m => {
              const prod = productos.find(p => p.id === m.producto_id);
              const dest = ubicaciones.find(u => u.id === (m.ubicacion_destino_id || m.destino_id));
              const q = busqueda.toLowerCase();
              return prod?.descripcion?.toLowerCase().includes(q)
                || prod?.codigo?.toLowerCase().includes(q)
                || dest?.nombre?.toLowerCase().includes(q);
            })
          : historial;
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Historial de salidas</h3>
                <p className="text-xs text-slate-400 mt-0.5">{histFiltrado.length} registro{histFiltrado.length !== 1 ? "s" : ""}</p>
              </div>
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Filtrar por insumo, código o destino…"
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-72"
              />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs">
                  <th className="text-left px-5 py-2.5">Destino</th>
                  <th className="text-left px-5 py-2.5">Código</th>
                  <th className="text-left px-5 py-2.5">Insumo</th>
                  <th className="text-right px-5 py-2.5">Cantidad</th>
                  <th className="text-left px-5 py-2.5">Fecha</th>
                  <th className="px-5 py-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {histFiltrado.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-4 text-slate-400 text-xs">Sin resultados</td></tr>
                ) : histFiltrado.map((m) => {
                  const prod = productos.find((p) => p.id === m.producto_id);
                  const dest = ubicaciones.find((u) => u.id === (m.ubicacion_destino_id || m.destino_id));
                  const editando = editandoMov === m.id;
                  return (
                    <tr key={m.id} className={`border-b border-slate-50 ${editando ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                      <td className="px-5 py-2.5 font-medium text-slate-700">{dest?.nombre || "—"}</td>
                      <td className="px-5 py-2.5 font-mono text-xs text-slate-500">{prod?.codigo || "—"}</td>
                      <td className="px-5 py-2.5 text-slate-700">{prod?.descripcion || "—"}</td>
                      {editando ? (
                        <>
                          <td className="px-2 py-1.5 text-right">
                            <input type="number" min="1" value={editFormMov.cantidad}
                              onChange={(e) => setEditFormMov(f => ({ ...f, cantidad: e.target.value }))}
                              className="w-20 text-right border-2 border-blue-400 rounded px-2 py-1 text-sm font-bold focus:outline-none" autoFocus />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="date" value={editFormMov.fecha}
                              onChange={(e) => setEditFormMov(f => ({ ...f, fecha: e.target.value }))}
                              className="border-2 border-blue-400 rounded px-2 py-1 text-sm focus:outline-none" />
                          </td>
                          <td className="px-3 py-1.5 flex items-center gap-1 whitespace-nowrap">
                            <button onClick={() => guardarEditMov(m)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1 rounded transition">Guardar</button>
                            <button onClick={() => setEditandoMov(null)} className="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 rounded transition">Cancelar</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-5 py-2.5 text-right text-red-600 font-semibold">-{m.cantidad}</td>
                          <td className="px-5 py-2.5 text-slate-500 text-xs">{m.fecha ? m.fecha.split("-").reverse().join("/") : "—"}</td>
                          <td className="px-4 py-2.5 flex items-center gap-1.5 whitespace-nowrap">
                            <button onClick={() => { setEditandoMov(m.id); setEditFormMov({ cantidad: String(m.cantidad), fecha: m.fecha || "" }); }}
                              className="text-slate-400 hover:text-blue-600 transition" title="Editar">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" /></svg>
                            </button>
                            <button onClick={() => eliminarMov(m)} className="text-slate-400 hover:text-red-600 transition" title="Eliminar">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" /></svg>
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}
      {msg && (
        <p className={`text-sm font-medium ${msg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{msg}</p>
      )}
    </div>
  );
}

/* ───────── OFICINA — BÚSQUEDA ───────── */
function OficinasBusqueda() {
  const [productos,   setProductos]   = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [query,       setQuery]       = useState("");
  const [tipoFiltro,  setTipoFiltro]  = useState("todos");
  const [destFiltro,  setDestFiltro]  = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        const [prods, ubics, movs] = await Promise.all([
          api.get("/stock/productos/"),
          api.get("/stock/ubicaciones/"),
          api.get("/stock/movimientos/"),
        ]);
        setProductos(prods);
        setUbicaciones(ubics);
        const ofic = ubics.find(u => u.nombre.toLowerCase() === "oficina" || u.tipo === "oficina");
        if (ofic) {
          const relacionados = movs.filter(m =>
            m.ubicacion_origen_id === ofic.id || m.origen_id === ofic.id ||
            m.ubicacion_destino_id === ofic.id || m.destino_id === ofic.id
          );
          setMovimientos(relacionados.sort((a,b) => (b.fecha||"").localeCompare(a.fecha||"")));
        }
      } catch {}
      setLoading(false);
    };
    cargar();
  }, []);

  const enriched = movimientos.map(m => {
    const prod    = productos.find(p => p.id === m.producto_id);
    const origen  = ubicaciones.find(u => u.id === (m.ubicacion_origen_id  || m.origen_id));
    const destino = ubicaciones.find(u => u.id === (m.ubicacion_destino_id || m.destino_id));
    const esEntrada = m.tipo?.toUpperCase() === "ENTRADA" || m.tipo?.toUpperCase() === "COMPRA";
    return { ...m, prod, origen, destino, esEntrada, contraparte: esEntrada ? origen?.nombre : destino?.nombre };
  });

  const destinos = [...new Set(enriched.filter(m => !m.esEntrada).map(m => m.destino?.nombre).filter(Boolean))].sort();

  const filtrados = enriched.filter(m => {
    if (tipoFiltro === "entradas" && !m.esEntrada)  return false;
    if (tipoFiltro === "salidas"  &&  m.esEntrada)  return false;
    if (destFiltro && m.contraparte !== destFiltro) return false;
    if (query) {
      const q = query.toLowerCase();
      return m.prod?.descripcion?.toLowerCase().includes(q)
          || m.prod?.codigo?.toLowerCase().includes(q)
          || m.contraparte?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-52">
            <label className="block text-xs text-slate-500 mb-1">Buscar por insumo o código</label>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Ej: batería, A03, cinta…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo</label>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {[["todos","Todos"],["entradas","Entradas"],["salidas","Salidas"]].map(([k,l]) => (
                <button key={k} onClick={() => setTipoFiltro(k)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${tipoFiltro === k ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Destino</label>
            <select value={destFiltro} onChange={e => setDestFiltro(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              {destinos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {(query || destFiltro || tipoFiltro !== "todos") && (
            <button onClick={() => { setQuery(""); setDestFiltro(""); setTipoFiltro("todos"); }}
              className="text-xs text-slate-500 hover:text-red-500 px-3 py-2 border border-slate-200 rounded-lg transition">
              Limpiar
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        {loading ? "Cargando…" : `${filtrados.length} movimiento${filtrados.length !== 1 ? "s" : ""}`}
      </p>

      {/* Tabla unificada */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs">
              <th className="text-left px-5 py-2.5">Tipo</th>
              <th className="text-left px-5 py-2.5">Código</th>
              <th className="text-left px-5 py-2.5">Insumo</th>
              <th className="text-right px-5 py-2.5">Cantidad</th>
              <th className="text-left px-5 py-2.5">Destino / Origen</th>
              <th className="text-left px-5 py-2.5">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-6 text-slate-400 text-xs">Cargando…</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-6 text-slate-400 text-xs">Sin resultados para los filtros aplicados.</td></tr>
            ) : filtrados.map((m, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-5 py-2.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.esEntrada ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${m.esEntrada ? "bg-green-500" : "bg-red-500"}`} />
                    {m.esEntrada ? "ENTRADA" : "SALIDA"}
                  </span>
                </td>
                <td className="px-5 py-2.5 font-mono text-xs text-slate-500">{m.prod?.codigo || "—"}</td>
                <td className="px-5 py-2.5 font-medium text-slate-700">{m.prod?.descripcion || "—"}</td>
                <td className={`px-5 py-2.5 text-right font-semibold ${m.esEntrada ? "text-green-600" : "text-red-600"}`}>
                  {m.esEntrada ? "+" : "-"}{m.cantidad}
                </td>
                <td className="px-5 py-2.5 text-slate-500 text-xs">{m.contraparte || "—"}</td>
                <td className="px-5 py-2.5 text-slate-500 text-xs">{m.fecha ? m.fecha.split("-").reverse().join("/") : "—"}</td>
              </tr>
            ))}
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
    { key: "actual",   label: "Actual"    },
    { key: "entradas", label: "Entradas"  },
    { key: "salidas",  label: "Salidas"   },
    { key: "busqueda", label: "Búsqueda"  },
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
      {tab === "actual"   && <OficinaActual />}
      {tab === "entradas" && <OficinaEntradas />}
      {tab === "salidas"  && <OficinaSalidas />}
      {tab === "busqueda" && <OficinasBusqueda />}
    </div>
  );
}
