"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function HorarioTecnicoPage() {
  const { user } = useAuth();
  const [equipos, setEquipos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [filtroFecha, setFiltroFecha] = useState("");

  const [form, setForm] = useState({
    equipo_id: "",
    fecha: new Date().toISOString().split("T")[0],
    hora_salida: "09:00",
    hora_llegada: "",
    punto_inicio: "",
    punto_fin: "",
    observaciones: "",
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get("/equipos/").then(setEquipos).catch(() => {});
    cargarMovimientos();
  }, []);

  const cargarMovimientos = async (fecha = "") => {
    const params = fecha ? { fecha } : {};
    try {
      const data = await api.get("/movimientos-camioneta/", params);
      setMovimientos(data);
    } catch {}
  };

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      await api.post("/movimientos-camioneta/", { ...form, cargado_por: user, tecnicos: [] });
      setMsg("✓ Movimiento guardado");
      setForm({ ...form, hora_salida: "09:00", hora_llegada: "", punto_inicio: "", punto_fin: "", observaciones: "" });
      cargarMovimientos();
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  const buscar = () => {
    cargarMovimientos(filtroFecha);
  };

  const equipoNombre = (eqId) => equipos.find(e => e.id === eqId)?.nombre || "—";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Horario Técnico</h1>

      {/* Formulario */}
      <form onSubmit={guardar} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-2">Cargar movimiento camioneta</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Equipo</label>
            <select value={form.equipo_id} onChange={e => setForm({ ...form, equipo_id: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
              <option value="">Seleccionar</option>
              {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.patente})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha</label>
            <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Hora salida</label>
            <input type="time" value={form.hora_salida} onChange={e => setForm({ ...form, hora_salida: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Hora llegada</label>
            <input type="time" value={form.hora_llegada} onChange={e => setForm({ ...form, hora_llegada: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Punto inicio</label>
            <input type="text" value={form.punto_inicio} onChange={e => setForm({ ...form, punto_inicio: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Punto fin</label>
            <input type="text" value={form.punto_fin} onChange={e => setForm({ ...form, punto_fin: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Observaciones</label>
          <input type="text" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
            Guardar
          </button>
          {msg && <span className={`text-sm font-medium ${msg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{msg}</span>}
        </div>
      </form>

      {/* Historial de movimientos */}
      <div className="space-y-3">
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Filtrar por fecha</label>
            <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={buscar}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
            Buscar
          </button>
          {filtroFecha && (
            <button onClick={() => { setFiltroFecha(""); cargarMovimientos(); }}
              className="text-slate-500 hover:text-slate-700 text-sm">
              Limpiar
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Equipo</th>
                <th className="text-left px-4 py-3">Hora salida</th>
                <th className="text-left px-4 py-3">Hora llegada</th>
                <th className="text-left px-4 py-3">Inicio</th>
                <th className="text-left px-4 py-3">Fin</th>
                <th className="text-left px-4 py-3">Cargado por</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-4 text-slate-400 text-xs">Sin movimientos</td></tr>
              ) : movimientos.map(m => (
                <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-xs">{m.fecha}</td>
                  <td className="px-4 py-2.5 text-xs font-medium">{m.equipos?.nombre || equipoNombre(m.equipo_id)}</td>
                  <td className="px-4 py-2.5 text-xs">{m.hora_salida?.slice(0,5) || "—"}</td>
                  <td className="px-4 py-2.5 text-xs">{m.hora_llegada?.slice(0,5) || "—"}</td>
                  <td className="px-4 py-2.5 text-xs">{m.punto_inicio || "—"}</td>
                  <td className="px-4 py-2.5 text-xs">{m.punto_fin || "—"}</td>
                  <td className="px-4 py-2.5 text-xs">{m.cargado_por || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
