"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function HistorialPage() {
  const [servicios, setServicios] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroAnio, setFiltroAnio] = useState("2026");

  // Edit modal
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    api.get("/equipos/").then(setEquipos).catch(() => {});
  }, []);

  const buscar = async () => {
    const params = {};
    if (filtroEstado) params.estado = filtroEstado;
    if (filtroMes) params.mes = filtroMes;
    if (filtroAnio) params.anio = filtroAnio;
    try {
      const data = await api.get("/servicios/", params);
      setServicios(data);
    } catch {}
  };

  const equipoNombre = (equipoId) => {
    const eq = equipos.find((e) => e.id === equipoId);
    return eq ? eq.nombre : "—";
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await api.put(`/servicios/${id}`, { estado });
      setServicios((prev) => prev.map((s) => (s.id === id ? { ...s, estado } : s)));
    } catch {}
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este servicio?")) return;
    try {
      await api.delete(`/servicios/${id}`);
      setServicios((prev) => prev.filter((s) => s.id !== id));
    } catch {}
  };

  const abrirEditar = (s) => {
    setEditing(s.id);
    setEditForm({
      fecha: s.fecha,
      hora_programada: s.hora_programada || "",
      cliente: s.cliente,
      tipo_servicio: s.tipo_servicio,
      dispositivo: s.dispositivo || "",
      patente: s.patente,
      observaciones: s.observaciones || "",
    });
  };

  const guardarEdicion = async () => {
    try {
      await api.put(`/servicios/${editing}`, editForm);
      setServicios((prev) =>
        prev.map((s) => (s.id === editing ? { ...s, ...editForm } : s))
      );
      setEditing(null);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Historial de Servicios</h1>

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Estado</label>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos</option>
            <option>PENDIENTE</option>
            <option>CONFIRMADO</option>
            <option>REALIZADO</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Mes</label>
          <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos</option>
            {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Año</label>
          <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option>2025</option>
            <option>2026</option>
            <option>2027</option>
          </select>
        </div>
        <button onClick={buscar} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
          Buscar
        </button>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-semibold text-slate-700">Editar Servicio</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Fecha</label>
                <input type="date" value={editForm.fecha} onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Hora</label>
                <input type="time" value={editForm.hora_programada} onChange={(e) => setEditForm({ ...editForm, hora_programada: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Cliente</label>
                <input type="text" value={editForm.cliente} onChange={(e) => setEditForm({ ...editForm, cliente: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Tipo</label>
                <select value={editForm.tipo_servicio} onChange={(e) => setEditForm({ ...editForm, tipo_servicio: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option>INSTALACION</option>
                  <option>REVISION</option>
                  <option>DESINSTALACION</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Dispositivo</label>
                <select value={editForm.dispositivo} onChange={(e) => setEditForm({ ...editForm, dispositivo: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option>GPS</option>
                  <option>LECTORA</option>
                  <option>GPS y LECTORA</option>
                  <option>CAMARA</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Patente</label>
                <input type="text" value={editForm.patente} onChange={(e) => setEditForm({ ...editForm, patente: e.target.value.toUpperCase() })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Observaciones</label>
              <input type="text" value={editForm.observaciones} onChange={(e) => setEditForm({ ...editForm, observaciones: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancelar</button>
              <button onClick={guardarEdicion} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Dispositivo</th>
              <th className="text-left px-4 py-3">Patente</th>
              <th className="text-left px-4 py-3">Equipo</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {servicios.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">{s.fecha}</td>
                <td className="px-4 py-3">{s.cliente}</td>
                <td className="px-4 py-3">{s.tipo_servicio}</td>
                <td className="px-4 py-3">{s.dispositivo || "—"}</td>
                <td className="px-4 py-3">{s.patente}</td>
                <td className="px-4 py-3">{equipoNombre(s.equipo_id)}</td>
                <td className="px-4 py-3">
                  <select value={s.estado} onChange={(e) => cambiarEstado(s.id, e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1 text-xs">
                    <option>PENDIENTE</option>
                    <option>CONFIRMADO</option>
                    <option>REALIZADO</option>
                  </select>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => abrirEditar(s)} className="text-blue-600 hover:underline text-xs">Editar</button>
                  <button onClick={() => eliminar(s.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
