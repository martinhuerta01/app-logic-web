"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function VistaDiaPage() {
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [equipos, setEquipos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [vista, setVista] = useState("interna");

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
      setServicios(prev => prev.map(s => s.id === svcId ? { ...s, estado: nuevoEstado } : s));
    } catch {}
  };

  const getMovimiento = (equipoId) => movimientos.find(m => m.equipo_id === equipoId);
  const svcEquipo = (eqId) => servicios.filter(s => s.equipo_id === eqId);
  const svcInterior = servicios.filter(s => !s.equipo_id);

  const estadoBadge = (estado) => {
    const colors = {
      REALIZADO: "bg-green-100 text-green-700",
      CONFIRMADO: "bg-blue-100 text-blue-700",
      PENDIENTE: "bg-yellow-100 text-yellow-700",
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[estado] || "bg-slate-100 text-slate-600"}`}>{estado}</span>;
  };

  const TablaServicios = ({ items }) => (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-slate-500 text-xs">
          <th className="text-left py-2">Hora</th>
          <th className="text-left py-2">Cliente</th>
          <th className="text-left py-2">Tipo</th>
          <th className="text-left py-2">Dispositivo</th>
          <th className="text-left py-2">Patente</th>
          <th className="text-left py-2">Estado</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr><td colSpan={6} className="text-slate-400 py-3 text-xs">Sin servicios</td></tr>
        ) : items.map(s => (
          <tr key={s.id} className="border-b border-slate-100">
            <td className="py-2">{s.hora_programada?.slice(0,5) || "—"}</td>
            <td className="py-2">
              {s.tipo_servicio === "-"
                ? <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 border border-orange-300">FERIADO</span>
                : s.cliente}
            </td>
            <td className="py-2 text-xs font-medium text-blue-700">{s.tipo_servicio === "-" ? "—" : s.tipo_servicio}</td>
            <td className="py-2">{s.dispositivo || "—"}</td>
            <td className="py-2 font-mono text-xs">{s.patente}</td>
            <td className="py-2">
              {vista === "interna" ? (
                <select value={s.estado} onChange={e => cambiarEstado(s.id, e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-xs">
                  <option>PENDIENTE</option>
                  <option>CONFIRMADO</option>
                  <option>REALIZADO</option>
                </select>
              ) : estadoBadge(s.estado)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Vista del Día</h1>
        <div className="flex gap-2">
          {["interna", "tecnicos"].map(v => (
            <button key={v} onClick={() => setVista(v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                vista === v ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              }`}>
              {v === "interna" ? "Vista interna" : "Vista técnicos"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Fecha</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={buscar}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
          Buscar
        </button>
      </div>

      {/* Equipos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {equipos.map(eq => {
          const mov = getMovimiento(eq.id);
          return (
            <div key={eq.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-base font-bold text-blue-700 mb-1">
                {eq.nombre}
                {vista === "interna" && (
                  <span className="ml-2 text-xs font-normal text-slate-400">{eq.patente}</span>
                )}
              </h2>
              {vista === "interna" && (
                mov ? (
                  <p className="text-xs text-slate-500 mb-3">
                    Salida: <strong>{mov.hora_salida?.slice(0,5) || "—"}</strong>
                    {" "}— Llegada: <strong>{mov.hora_llegada?.slice(0,5) || "—"}</strong>
                    {mov.punto_inicio && <> | {mov.punto_inicio} → {mov.punto_fin || "—"}</>}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mb-3">Sin movimiento cargado</p>
                )
              )}
              <TablaServicios items={svcEquipo(eq.id)} />
            </div>
          );
        })}
      </div>

      {/* Interior */}
      {svcInterior.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-base font-bold text-teal-700 mb-3">Interior</h2>
          <TablaServicios items={svcInterior} />
        </div>
      )}
    </div>
  );
}
