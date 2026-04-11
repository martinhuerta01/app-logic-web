"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export default function GeneralStockPage() {
  const searchParams = useSearchParams();
  const ubNombre = decodeURIComponent(searchParams.get("ub") || "");

  const [productos, setProductos] = useState([]);
  const [ubicacionesDB, setUbicacionesDB] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [stockActual, setStockActual] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ubNombre) cargarDatos();
  }, [ubNombre]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [prods, ubics, movs] = await Promise.all([
        api.get("/stock/productos/"),
        api.get("/stock/ubicaciones/"),
        api.get("/stock/movimientos/"),
      ]);
      setProductos(prods);
      setUbicacionesDB(ubics);
      setMovimientos(movs);

      const ubic = ubics.find(
        (u) => u.nombre.toLowerCase() === ubNombre.toLowerCase()
      );
      if (ubic) {
        const stock = await api.get("/stock/actual/", { ubicacion_id: ubic.id });
        setStockActual(stock);
      } else {
        setStockActual([]);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const oficina = ubicacionesDB.find(
    (u) => u.nombre.toLowerCase() === "oficina" || u.tipo === "oficina"
  );
  const ubic = ubicacionesDB.find(
    (u) => u.nombre.toLowerCase() === ubNombre.toLowerCase()
  );

  const resumen = productos
    .map((prod) => {
      const stockItem = stockActual.find((s) => s.producto_id === prod.id);
      const actual = stockItem ? stockItem.cantidad : 0;

      const entradas = movimientos
        .filter(
          (m) =>
            m.producto_id === prod.id &&
            ubic &&
            (m.ubicacion_destino_id === ubic.id || m.destino_id === ubic.id) &&
            oficina &&
            (m.ubicacion_origen_id === oficina.id || m.origen_id === oficina.id)
        )
        .reduce((sum, m) => sum + (m.cantidad || 0), 0);

      const salidas = entradas - actual > 0 ? entradas - actual : 0;

      return { codigo: prod.codigo, descripcion: prod.descripcion, entradas, salidas, actual };
    })
    .filter((r) => r.actual !== 0 || r.entradas !== 0 || r.salidas !== 0);

  if (!ubNombre) {
    return <p className="text-slate-500 text-sm">Seleccioná una ubicación desde el menú.</p>;
  }

  if (loading) {
    return <p className="text-slate-500 text-sm">Cargando stock de {ubNombre}...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Stock — {ubNombre}</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
              <th className="text-left px-4 py-3">Código</th>
              <th className="text-left px-4 py-3">Insumo</th>
              <th className="text-right px-4 py-3">Entradas</th>
              <th className="text-right px-4 py-3">Salidas</th>
              <th className="text-right px-4 py-3">Actual</th>
            </tr>
          </thead>
          <tbody>
            {resumen.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No hay stock registrado en {ubNombre}
                </td>
              </tr>
            ) : (
              resumen.map((r) => (
                <tr key={r.codigo} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium">{r.codigo}</td>
                  <td className="px-4 py-2.5">{r.descripcion}</td>
                  <td className="px-4 py-2.5 text-right text-green-600 font-medium">
                    {r.entradas > 0 ? `+${r.entradas}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-red-600 font-medium">
                    {r.salidas > 0 ? `-${r.salidas}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`font-bold ${
                        r.actual <= 0
                          ? "text-red-600"
                          : r.actual <= 5
                          ? "text-orange-500"
                          : "text-green-600"
                      }`}
                    >
                      {r.actual}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!ubic && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          La ubicación &quot;{ubNombre}&quot; no existe en la base de datos. Creala desde
          Configuración &gt; Ubicaciones de Stock con tipo <strong>camioneta</strong> o{" "}
          <strong>tecnico</strong>.
        </div>
      )}
    </div>
  );
}
