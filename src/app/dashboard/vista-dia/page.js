"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function VistaDiaPage() {
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [equipos, setEquipos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [vista, setVista] = useState("interna"); // interna | tecnicos

  useEffect(() => {
    api.get("/equipos/").then(setEquipos).catch(() => {});
  }, []);

  const buscar = async () => {
    try {
      const [svcs, movs] = await Promise.all([
        api.get("/servicios/", { fecha }),
        api.get("/movimientos-camioneta/", { fecha }),
      ]);
      setServicios(svcs);
      setMovimientos(movs);
    } catch {}
  };

  const cambiarEstado = async (svcId, nuevoEstado) => {
    try {
      await api.put(`/servicios/${svcId}`, { estado: nuevoEstado });
      setServicios((prev) =>
        prev.map((s) => (s.id === svcId ? { ...s, estado: nuevoEstado } : s))
      );
    } catch {}
  };

  const getMovimiento = (equipoId) => movimientos.find((m) => m.equipo_id === equipoId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Vista del Día</h1>
        <div className="flex gap-2">
          <button onClick={() => setVista("interna")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${vista === "interna" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
            Vista interna
          </button>
          <button onClick={() => setVista("tecnicos")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${vista === "tecnicos" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
            Vista técnicos
          </button>
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={buscar} className="bg-red-500 hover:bg-red-600 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
          Buscar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {equipos.map((eq) => {
          const mov = getMovimiento(eq.id);
          const eqServs = servicios.filter((s) => s.equipo_id === eq.id);

          return (
            <div key={eq.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-lg font-bold text-blue-700 mb-2">{eq.nombre}</h2>

              {mov ? (
                <p className="text-xs text-slate-500 mb-3">
                  Salida: {mov.hora_salida || "—"} — Llegada: {mov.hora_llegada || "—"}
                  {vista === "interna" && <> | {mov.punto_inicio} → {mov.punto_fin}</>}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mb-3">Sin movimiento cargado</p>
              )}

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="text-left py-2">Hora</th>
                    <th className="text-left py-2">Cliente</th>
                    <th className="text-left py-2">Tipo</th>
                    <th className="text-left py-2">Dispositivo</th>
                    <th className="text-left py-2">Patente</th>
                    <th className="text-left py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {eqServs.length === 0 ? (
                    <tr><td colSpan={6} className="text-slate-400 py-3">Sin servicios</td></tr>
                  ) : (
                    eqServs.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100">
                        <td className="py-2">{s.hora_programada || "—"}</td>
                        <td className="py-2">{s.cliente}</td>
                        <td className="py-2">{s.tipo_servicio}</td>
                        <td className="py-2">{s.dispositivo}</td>
                        <td className="py-2">{s.patente}</td>
                        <td className="py-2">
                          {vista === "interna" ? (
                            <select value={s.estado} onChange={(e) => cambiarEstado(s.id, e.target.value)}
                              className="border border-slate-300 rounded px-2 py-1 text-xs">
                              <option>PENDIENTE</option>
                              <option>CONFIRMADO</option>
                              <option>REALIZADO</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              s.estado === "REALIZADO" ? "bg-green-100 text-green-700" :
                              s.estado === "CONFIRMADO" ? "bg-blue-100 text-blue-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>{s.estado}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
