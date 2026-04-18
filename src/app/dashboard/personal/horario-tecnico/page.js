"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const PUNTOS = ["Oficina", "Casa Maxi", "Casa Hugo"];

const FORM_VACIO = {
  equipo_id: "",
  fecha: new Date().toISOString().split("T")[0],
  hora_salida: "09:00",
  hora_llegada: "",
  punto_inicio: "",
  punto_fin: "",
  observaciones: "",
};

export default function HorarioTecnicoPage() {
  const { user } = useAuth();
  const [equipos, setEquipos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [filtroDia, setFiltroDia] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroEquipo, setFiltroEquipo] = useState("");
  const [mostrarTabla, setMostrarTabla] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [msg, setMsg] = useState("");
  const [editando, setEditando] = useState(null);
  const [msgEdit, setMsgEdit] = useState("");

  useEffect(() => {
    api.get("/equipos/").then(setEquipos).catch(() => {});
  }, []);

  const cargarMovimientos = async (fecha, equipoId) => {
    const params = {};
    if (fecha) params.fecha = fecha;
    if (equipoId) params.equipo_id = equipoId;
    try {
      let data = await api.get("/movimientos-camioneta/", params);
      // filtro cliente por fecha exacta (la API puede devolver más registros)
      if (fecha) data = data.filter(m => m.fecha === fecha);
      setMovimientos(data);
    } catch {}
  };

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      await api.post("/movimientos-camioneta/", { ...form, cargado_por: user, tecnicos: [] });
      setMsg("✓ Movimiento guardado");
      setForm({ ...FORM_VACIO, fecha: form.fecha });
      if (mostrarTabla) {
        const fecha = filtroDia && filtroMes && filtroAnio
          ? `${filtroAnio}-${filtroMes.padStart(2,"0")}-${filtroDia.padStart(2,"0")}` : "";
        cargarMovimientos(fecha, filtroEquipo);
      }
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  const buscar = () => {
    const fecha = filtroDia && filtroMes && filtroAnio
      ? `${filtroAnio}-${filtroMes.padStart(2,"0")}-${filtroDia.padStart(2,"0")}` : "";
    setMostrarTabla(true);
    cargarMovimientos(fecha, filtroEquipo);
  };

  const limpiar = () => {
    setFiltroDia("");
    setFiltroMes("");
    setFiltroAnio("");
    setFiltroEquipo("");
    setMostrarTabla(false);
    setMovimientos([]);
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este movimiento?")) return;
    try {
      await api.delete(`/movimientos-camioneta/${id}/`);
      cargarMovimientos(filtroFecha, filtroEquipo);
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const abrirEditar = (m) => {
    setEditando({ ...m, equipo_id: m.equipo_id || m.equipos?.id || "" });
    setMsgEdit("");
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    setMsgEdit("");
    try {
      await api.patch(`/movimientos-camioneta/${editando.id}/`, {
        equipo_id: editando.equipo_id,
        fecha: editando.fecha,
        hora_salida: editando.hora_salida,
        hora_llegada: editando.hora_llegada,
        punto_inicio: editando.punto_inicio,
        punto_fin: editando.punto_fin,
        observaciones: editando.observaciones,
      });
      setEditando(null);
      cargarMovimientos(filtroFecha, filtroEquipo);
    } catch (err) {
      setMsgEdit("Error: " + err.message);
    }
  };

  const equipoNombre = (m) => m.equipos?.nombre || equipos.find(e => e.id === m.equipo_id)?.nombre || "—";

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
            <select value={form.punto_inicio} onChange={e => setForm({ ...form, punto_inicio: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Seleccionar</option>
              {PUNTOS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Punto fin</label>
            <select value={form.punto_fin} onChange={e => setForm({ ...form, punto_fin: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Seleccionar</option>
              {PUNTOS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
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

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Día</label>
            <select value={filtroDia} onChange={e => setFiltroDia(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-20">
              <option value="">--</option>
              {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                <option key={d} value={String(d)}>{String(d).padStart(2,"0")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Mes</label>
            <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-32">
              <option value="">--</option>
              {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((m, i) => (
                <option key={i+1} value={String(i+1)}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Año</label>
            <select value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-24">
              <option value="">--</option>
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Filtrar por equipo</label>
            <select value={filtroEquipo} onChange={e => setFiltroEquipo(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
            </select>
          </div>
          <button onClick={buscar}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
            Buscar
          </button>
          {mostrarTabla && (
            <button onClick={limpiar} className="text-slate-500 hover:text-slate-700 text-sm">
              Limpiar
            </button>
          )}
        </div>

        {mostrarTabla && (
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
                  <th className="text-left px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-4 text-slate-400 text-xs">Sin movimientos</td></tr>
                ) : movimientos.map(m => (
                  <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-xs">{m.fecha}</td>
                    <td className="px-4 py-2.5 text-xs font-medium">{equipoNombre(m)}</td>
                    <td className="px-4 py-2.5 text-xs">{m.hora_salida?.slice(0, 5) || "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{m.hora_llegada?.slice(0, 5) || "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{m.punto_inicio || "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{m.punto_fin || "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{m.cargado_por || "—"}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <div className="flex gap-2">
                        <button onClick={() => abrirEditar(m)}
                          className="text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                        <button onClick={() => eliminar(m.id)}
                          className="text-red-500 hover:text-red-700 font-medium">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal edición */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={guardarEdicion} className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 w-full max-w-lg space-y-4">
            <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-2">Editar movimiento</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Equipo</label>
                <select value={editando.equipo_id} onChange={e => setEditando({ ...editando, equipo_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
                  <option value="">Seleccionar</option>
                  {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Fecha</label>
                <input type="date" value={editando.fecha} onChange={e => setEditando({ ...editando, fecha: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Hora salida</label>
                <input type="time" value={editando.hora_salida || ""} onChange={e => setEditando({ ...editando, hora_salida: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Hora llegada</label>
                <input type="time" value={editando.hora_llegada || ""} onChange={e => setEditando({ ...editando, hora_llegada: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Punto inicio</label>
                <select value={editando.punto_inicio || ""} onChange={e => setEditando({ ...editando, punto_inicio: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar</option>
                  {PUNTOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Punto fin</label>
                <select value={editando.punto_fin || ""} onChange={e => setEditando({ ...editando, punto_fin: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar</option>
                  {PUNTOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Observaciones</label>
              <input type="text" value={editando.observaciones || ""} onChange={e => setEditando({ ...editando, observaciones: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
                Guardar cambios
              </button>
              <button type="button" onClick={() => setEditando(null)}
                className="text-slate-500 hover:text-slate-700 text-sm">
                Cancelar
              </button>
              {msgEdit && <span className="text-red-600 text-sm">{msgEdit}</span>}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
