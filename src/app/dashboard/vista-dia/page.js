"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

function ModalEditar({ servicio, onClose, onSave }) {
  const [form, setForm] = useState({
    fecha: servicio.fecha || "",
    hora_programada: servicio.hora_programada?.slice(0, 5) || "",
    cliente: servicio.cliente || "",
    tipo_servicio: servicio.tipo_servicio || "INSTALACION",
    dispositivo: servicio.dispositivo || "GPS",
    patente: servicio.patente || "",
    observaciones: servicio.observaciones || "",
    estado: servicio.estado || "-",
  });

  const guardar = async () => {
    await onSave(servicio.id, form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-700">Editar Servicio</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha</label>
            <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Hora</label>
            <input type="time" value={form.hora_programada} onChange={e => setForm({ ...form, hora_programada: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Cliente</label>
            <input type="text" value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo</label>
            <select value={form.tipo_servicio} onChange={e => setForm({ ...form, tipo_servicio: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="-">-</option>
              <option>INSTALACION</option>
              <option>REVISION</option>
              <option>DESINSTALACION</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Dispositivo</label>
            <select value={form.dispositivo} onChange={e => setForm({ ...form, dispositivo: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="-">-</option>
              <option>GPS</option>
              <option>LECTORA</option>
              <option>GPS y LECTORA</option>
              <option>CAMARA</option>
              <option>Tractor</option>
              <option>Semi</option>
              <option>Chasis</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Patente</label>
            <input type="text" value={form.patente} onChange={e => setForm({ ...form, patente: e.target.value.toUpperCase() })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Observaciones</label>
            <input type="text" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Estado</label>
            <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="-">-</option>
              <option>PENDIENTE</option>
              <option>CONFIRMADO</option>
              <option>REALIZADO</option>
              <option>SUSPENDIDO</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancelar</button>
          <button onClick={guardar} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">Guardar</button>
        </div>
      </div>
    </div>
  );
}

export default function VistaDiaPage() {
  const [fecha, setFecha] = useState(() => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }));
  const [equipos, setEquipos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [vista, setVista] = useState("interna");
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/equipos/").then(setEquipos).catch(() => setError("No se pudieron cargar los equipos."));
  }, []);

  const buscar = async () => {
    setError("");
    try {
      const [svcs, movs] = await Promise.all([
        api.get("/servicios/", { fecha }),
        api.get("/movimientos-camioneta/", { fecha }),
      ]);
      setServicios(svcs);
      setMovimientos(movs);
    } catch { setError("Error al buscar servicios. Verificá la conexión con el servidor."); }
  };

  const cambiarEstado = async (svcId, nuevoEstado) => {
    try {
      await api.put(`/servicios/${svcId}`, { estado: nuevoEstado });
      setServicios(prev => prev.map(s => s.id === svcId ? { ...s, estado: nuevoEstado } : s));
    } catch { setError("No se pudo actualizar el estado."); }
  };

  const eliminar = async (svcId) => {
    if (!confirm("¿Eliminar este servicio?")) return;
    try {
      await api.delete(`/servicios/${svcId}`);
      setServicios(prev => prev.filter(s => s.id !== svcId));
    } catch { setError("No se pudo eliminar el servicio."); }
  };

  const guardarEdicion = async (id, form) => {
    await api.put(`/servicios/${id}`, form);
    setServicios(prev => prev.map(s => s.id === id ? { ...s, ...form } : s));
  };

  const getMovimiento = (equipoId) => movimientos.find(m => m.equipo_id === equipoId && m.fecha === fecha);
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

  const IconPencil = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
  const IconTrash = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  const TablaServicios = ({ items }) => (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-slate-500 text-xs">
          <th className="text-left py-2 pr-3">Hora</th>
          <th className="text-left py-2 pr-3">Cliente</th>
          <th className="text-left py-2 pr-3">Tipo</th>
          <th className="text-left py-2 pr-3">Dispositivo</th>
          <th className="text-left py-2 pr-3">Patente</th>
          <th className="text-left py-2 pr-3">Estado</th>
          <th className="text-left py-2 pr-3">Observaciones</th>
          {vista === "interna" && <th className="py-2"></th>}
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr><td colSpan={vista === "interna" ? 8 : 7} className="text-slate-400 py-3 text-xs">Sin servicios</td></tr>
        ) : items.map(s => (
          <tr key={s.id} className="border-b border-slate-100">
            <td className="py-2 pr-3">{s.hora_programada?.slice(0,5) || "—"}</td>
            <td className="py-2 pr-3">
              {s.tipo_servicio === "-"
                ? <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 border border-orange-300">FERIADO</span>
                : s.cliente}
            </td>
            <td className="py-2 pr-3 text-xs font-medium text-blue-700">{s.tipo_servicio === "-" ? "—" : s.tipo_servicio}</td>
            <td className="py-2 pr-3">{s.dispositivo || "—"}</td>
            <td className="py-2 pr-3 font-mono text-xs">{s.patente || "—"}</td>
            <td className="py-2 pr-3">
              {vista === "interna" ? (
                <select value={s.estado || "-"} onChange={e => cambiarEstado(s.id, e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-xs">
                  <option value="-">-</option>
                  <option>PENDIENTE</option>
                  <option>CONFIRMADO</option>
                  <option>REALIZADO</option>
                </select>
              ) : estadoBadge(s.estado)}
            </td>
            <td className="py-2 pr-3 text-xs text-slate-500 max-w-[180px] truncate">{s.observaciones || "—"}</td>
            {vista === "interna" && (
              <td className="py-2 text-right whitespace-nowrap">
                <button onClick={() => setEditando(s)}
                  className="text-blue-500 hover:text-blue-700 transition p-1 rounded hover:bg-blue-50 mr-1">
                  <IconPencil />
                </button>
                <button onClick={() => eliminar(s.id)}
                  className="text-red-400 hover:text-red-600 transition p-1 rounded hover:bg-red-50">
                  <IconTrash />
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6">
      {editando && (
        <ModalEditar
          servicio={editando}
          onClose={() => setEditando(null)}
          onSave={guardarEdicion}
        />
      )}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
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
      <div className="space-y-5">
        {equipos.map(eq => {
          const mov = getMovimiento(eq.id);
          return (
            <div key={eq.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-1">
                <h2 className="text-base font-bold text-blue-700">
                  {eq.nombre}
                  {vista === "interna" && (
                    <span className="ml-2 text-xs font-normal text-slate-400">{eq.patente}</span>
                  )}
                </h2>
              </div>
              {vista === "interna" && (
                mov ? (
                  <p className="text-xs text-slate-500 mb-3">
                    Salida: <strong>{mov.hora_salida?.slice(0,5) || "—"}</strong>
                    {" "}— Llegada: <strong>{mov.hora_llegada?.slice(0,5) || "—"}</strong>
                    {mov.punto_inicio && <> | {mov.punto_inicio} → {mov.punto_fin || "—"}</>}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mb-3">Salida: <strong>-</strong> — Llegada: <strong>-</strong></p>
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
