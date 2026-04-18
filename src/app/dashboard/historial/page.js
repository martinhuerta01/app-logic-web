"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

function ModalEditar({ servicio, equipos, onClose, onSave }) {
  const [form, setForm] = useState({
    fecha: servicio.fecha || "",
    hora_programada: servicio.hora_programada?.slice(0, 5) || "",
    cliente: servicio.cliente || "",
    tipo_servicio: servicio.tipo_servicio || "INSTALACION",
    dispositivo: servicio.dispositivo || "GPS",
    patente: servicio.patente || "",
    observaciones: servicio.observaciones || "",
    estado: servicio.estado || "PENDIENTE",
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
              <option>INSTALACION</option>
              <option>REVISION</option>
              <option>DESINSTALACION</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Dispositivo</label>
            <select value={form.dispositivo} onChange={e => setForm({ ...form, dispositivo: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option>-</option>
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

export default function HistorialPage() {
  const [equipos, setEquipos] = useState([]);
  const [svcEquipos, setSvcEquipos] = useState([]);
  const [svcInterior, setSvcInterior] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroDia, setFiltroDia] = useState("");
  const [filtroAnio, setFiltroAnio] = useState("2026");
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    api.get("/equipos/").then(setEquipos).catch(() => {});
  }, []);

  const buscar = async () => {
    const params = {};
    if (filtroEstado) params.estado = filtroEstado;
    if (filtroMes) params.mes = filtroMes;
    if (filtroAnio) params.anio = filtroAnio;
    try {
      const [eq, int] = await Promise.all([
        api.get("/servicios/", { ...params, tipo: "equipos" }),
        api.get("/servicios/", { ...params, tipo: "interior" }),
      ]);
      const porDia = (lista) => {
        if (!filtroDia) return lista;
        return lista.filter(s => {
          const d = s.fecha ? new Date(s.fecha).getUTCDate() : null;
          return d === parseInt(filtroDia, 10);
        });
      };
      setSvcEquipos(porDia(eq));
      setSvcInterior(porDia(int));
    } catch {}
  };

  const cambiarEstado = async (id, estado, esInterior = false) => {
    try {
      await api.put(`/servicios/${id}`, { estado });
      if (esInterior) {
        setSvcInterior(prev => prev.map(s => s.id === id ? { ...s, estado } : s));
      } else {
        setSvcEquipos(prev => prev.map(s => s.id === id ? { ...s, estado } : s));
      }
    } catch {}
  };

  const eliminar = async (id, esInterior = false) => {
    if (!confirm("¿Eliminar este servicio?")) return;
    try {
      await api.delete(`/servicios/${id}`);
      if (esInterior) {
        setSvcInterior(prev => prev.filter(s => s.id !== id));
      } else {
        setSvcEquipos(prev => prev.filter(s => s.id !== id));
      }
    } catch {}
  };

  const guardarEdicion = async (id, form) => {
    await api.put(`/servicios/${id}`, form);
    setSvcEquipos(prev => prev.map(s => s.id === id ? { ...s, ...form } : s));
    setSvcInterior(prev => prev.map(s => s.id === id ? { ...s, ...form } : s));
  };

  const equipoNombre = (eqId) => {
    const eq = equipos.find(e => e.id === eqId);
    return eq ? eq.nombre : "—";
  };

  const dispDisplay = (s) => {
    if (s.dispositivo && s.dispositivo !== "—") return s.dispositivo;
    const cl = (s.cliente || "").toUpperCase();
    if (cl.includes("SERENISIMA")) return "-";
    return "—";
  };

  const colorEstado = (estado) => ({
    REALIZADO:   "bg-green-100 text-green-800 border-green-300",
    PENDIENTE:   "bg-yellow-100 text-yellow-800 border-yellow-300",
    CONFIRMADO:  "bg-white text-slate-700 border-slate-300",
    SUSPENDIDO:  "bg-red-100 text-red-800 border-red-300",
  }[estado] || "bg-white text-slate-700 border-slate-300");

  const TablaEquipos = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
            <th className="text-left px-4 py-3">Fecha</th>
            <th className="text-left px-4 py-3">Responsable</th>
            <th className="text-left px-4 py-3">Hora</th>
            <th className="text-left px-4 py-3">Cliente</th>
            <th className="text-left px-4 py-3">Tipo</th>
            <th className="text-left px-4 py-3">Dispositivo</th>
            <th className="text-left px-4 py-3">Patente</th>
            <th className="text-left px-4 py-3">Estado</th>
            <th className="text-left px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {svcEquipos.length === 0 ? (
            <tr><td colSpan={9} className="px-4 py-4 text-slate-400 text-xs">Sin registros</td></tr>
          ) : svcEquipos.map(s => (
            <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-2.5 text-xs">{s.fecha}</td>
              <td className="px-4 py-2.5 text-xs font-medium">{s.responsable || equipoNombre(s.equipo_id)}</td>
              <td className="px-4 py-2.5 text-xs">{s.hora_programada?.slice(0,5) || "—"}</td>
              <td className="px-4 py-2.5 text-xs">{s.cliente}</td>
              <td className="px-4 py-2.5 text-xs">{s.tipo_servicio}</td>
              <td className="px-4 py-2.5 text-xs">{dispDisplay(s)}</td>
              <td className="px-4 py-2.5 text-xs font-mono">{s.patente}</td>
              <td className="px-4 py-2.5">
                <select value={s.estado} onChange={e => cambiarEstado(s.id, e.target.value)}
                  className={`border rounded px-2 py-1 text-xs font-medium ${colorEstado(s.estado)}`}>
                  <option>PENDIENTE</option>
                  <option>CONFIRMADO</option>
                  <option>REALIZADO</option>
                  <option>SUSPENDIDO</option>
                </select>
              </td>
              <td className="px-4 py-2.5 flex gap-2">
                <button onClick={() => setEditando(s)} className="text-blue-600 hover:underline text-xs">Editar</button>
                <button onClick={() => eliminar(s.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const TablaInterior = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
            <th className="text-left px-4 py-3">Fecha</th>
            <th className="text-left px-4 py-3">Técnico / Taller</th>
            <th className="text-left px-4 py-3">Localidad</th>
            <th className="text-left px-4 py-3">Hora</th>
            <th className="text-left px-4 py-3">Cliente</th>
            <th className="text-left px-4 py-3">Tipo</th>
            <th className="text-left px-4 py-3">Dispositivo</th>
            <th className="text-left px-4 py-3">Patente</th>
            <th className="text-left px-4 py-3">Estado</th>
            <th className="text-left px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {svcInterior.length === 0 ? (
            <tr><td colSpan={10} className="px-4 py-4 text-slate-400 text-xs">Sin registros</td></tr>
          ) : svcInterior.map(s => (
            <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-2.5 text-xs">{s.fecha}</td>
              <td className="px-4 py-2.5 text-xs font-medium">{s.responsable || "—"}</td>
              <td className="px-4 py-2.5 text-xs">{s.localidad || "—"}</td>
              <td className="px-4 py-2.5 text-xs">{s.hora_programada?.slice(0,5) || "—"}</td>
              <td className="px-4 py-2.5 text-xs">{s.cliente}</td>
              <td className="px-4 py-2.5 text-xs">{s.tipo_servicio}</td>
              <td className="px-4 py-2.5 text-xs">{dispDisplay(s)}</td>
              <td className="px-4 py-2.5 text-xs font-mono">{s.patente}</td>
              <td className="px-4 py-2.5">
                <select value={s.estado} onChange={e => cambiarEstado(s.id, e.target.value, true)}
                  className={`border rounded px-2 py-1 text-xs font-medium ${colorEstado(s.estado)}`}>
                  <option>PENDIENTE</option>
                  <option>CONFIRMADO</option>
                  <option>REALIZADO</option>
                  <option>SUSPENDIDO</option>
                </select>
              </td>
              <td className="px-4 py-2.5 flex gap-2">
                <button onClick={() => setEditando(s)} className="text-blue-600 hover:underline text-xs">Editar</button>
                <button onClick={() => eliminar(s.id, true)} className="text-red-500 hover:underline text-xs">Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Historial de Servicios</h1>

      {/* Filtros */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Estado</label>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos</option>
            <option>PENDIENTE</option>
            <option>CONFIRMADO</option>
            <option>REALIZADO</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Mes</label>
          <select value={filtroMes} onChange={e => { setFiltroMes(e.target.value); if (!e.target.value) setFiltroDia(""); }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos</option>
            {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Día</label>
          <select value={filtroDia} onChange={e => setFiltroDia(e.target.value)}
            disabled={!filtroMes}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <option value="">Todos</option>
            {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Año</label>
          <select value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option>2025</option><option>2026</option><option>2027</option>
          </select>
        </div>
        <button onClick={buscar}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
          Buscar
        </button>
      </div>

      {editando && (
        <ModalEditar
          servicio={editando}
          equipos={equipos}
          onClose={() => setEditando(null)}
          onSave={guardarEdicion}
        />
      )}

      {/* Tabla Equipos */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Equipo 1 y Equipo 2</h2>
        <TablaEquipos />
      </div>

      {/* Tabla Interior */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Técnicos / Talleres Interior</h2>
        <TablaInterior />
      </div>
    </div>
  );
}
