"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export default function SerenisimaPage() {
  const searchParams = useSearchParams();
  const cdNombre = decodeURIComponent(searchParams.get("cd") || "");

  const [mapeo, setMapeo] = useState([]);
  const [productos, setProductos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [stockActual, setStockActual] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cdNombre) cargarDatos();
  }, [cdNombre]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [mapeoData, prods, ubics, movs] = await Promise.all([
        api.get("/mapeo-serenisima/").catch(() =>
          api.get("/stock/mapeo-serenisima/").catch(() => [])
        ),
        api.get("/stock/productos/"),
        api.get("/stock/ubicaciones/"),
        api.get("/stock/movimientos/"),
      ]);
      setMapeo(mapeoData);
      setProductos(prods);
      setUbicaciones(ubics);
      setMovimientos(movs);

      const cdUbic = ubics.find(
        (u) => u.nombre.toLowerCase() === cdNombre.toLowerCase()
      );
      if (cdUbic) {
        const stock = await api.get("/stock/actual/", { ubicacion_id: cdUbic.id });
        setStockActual(stock);
      } else {
        setStockActual([]);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const oficina = ubicaciones.find(
    (u) => u.nombre.toLowerCase() === "oficina" || u.tipo === "oficina"
  );
  const cdUbic = ubicaciones.find(
    (u) => u.nombre.toLowerCase() === cdNombre.toLowerCase()
  );

  const resumen = mapeo.map((m) => {
    const prodIds = m.producto_ids || [];

    const entradas = movimientos
      .filter(
        (mov) =>
          prodIds.includes(mov.producto_id) &&
          cdUbic &&
          (mov.ubicacion_destino_id === cdUbic.id || mov.destino_id === cdUbic.id) &&
          oficina &&
          (mov.ubicacion_origen_id === oficina.id || mov.origen_id === oficina.id)
      )
      .reduce((sum, mov) => sum + (mov.cantidad || 0), 0);

    const actual = stockActual
      .filter((s) => prodIds.includes(s.producto_id))
      .reduce((sum, s) => sum + (s.cantidad || 0), 0);

    const salidas = entradas - actual > 0 ? entradas - actual : 0;

    return {
      codigo: m.codigo_serenisima,
      descripcion: m.descripcion,
      entradas,
      salidas,
      actual,
    };
  });

  if (!cdNombre) {
    return <p className="text-slate-500 text-sm">Seleccioná un CD desde el menú.</p>;
  }

  if (loading) {
    return <p className="text-slate-500 text-sm">Cargando stock de {cdNombre}...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Stock — {cdNombre}</h1>
        <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-medium">
          La Serenísima — Códigos Serenísima
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
              <th className="text-left px-4 py-3">Código</th>
              <th className="text-left px-4 py-3">Descripción</th>
              <th className="text-right px-4 py-3">Entradas</th>
              <th className="text-right px-4 py-3">Salidas</th>
              <th className="text-right px-4 py-3">Actual</th>
            </tr>
          </thead>
          <tbody>
            {resumen.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No hay mapeo de códigos Serenísima configurado
                </td>
              </tr>
            ) : (
              resumen.map((r) => (
                <tr key={r.codigo} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                      {r.codigo}
                    </span>
                  </td>
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
                          : r.actual <= 3
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

      {!cdUbic && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          La ubicación &quot;{cdNombre}&quot; no existe en la base de datos. Creala desde
          Configuración &gt; Ubicaciones de Stock con tipo <strong>cd</strong>.
        </div>
      )}
    </div>
  );
}
