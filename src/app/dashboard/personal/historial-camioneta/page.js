"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

const PUNTOS = ["Oficina", "Casa Maxi", "Casa Hugo"];
const MESES  = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export default function HistorialCamionetaPage() {
  const [equipos,     setEquipos]     = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [filtroMes,   setFiltroMes]   = useState("");
  const [filtroAnio,  setFiltroAnio]  = useState("");
  const [filtroEquipo,setFiltroEquipo]= useState("");
  const [editando,    setEditando]    = useState(null);
  const [msgEdit,     setMsgEdit]     = useState("");
  const [error,       setError]       = useState("");

  useEffect(() => {
    api.get("/equipos/").then(eqs => {
      setEquipos(eqs);
      fetchMovimientos("", "");
    }).catch(() => {
      setError("No se pudieron cargar los equipos.");
      fetchMovimientos("", "");
    });
  }, []);

  const fetchMovimientos = async (equipoId, mes, anio) => {
    const params = {};
    if (equipoId) params.equipo_id = equipoId;
    try {
      let data = await api.get("/movimientos-camioneta/", params);
      // Filtro por mes y año en el cliente
      if (mes || anio) {
        data = data.filter(m => {
          if (!m.fecha) return false;
          const [y, mo] = m.fecha.split("-");
          if (anio && y !== anio) return false;
          if (mes  && parseInt(mo) !== parseInt(mes)) return false;
          return true;
        });
      }
      setMovimientos(data);
    } catch { setError("Error al cargar movimientos. Verificá la conexión con el servidor."); }
  };

  const buscar = () => fetchMovimientos(filtroEquipo, filtroMes, filtroAnio);

  const limpiar = () => {
    setFiltroMes(""); setFiltroAnio(""); setFiltroEquipo("");
    fetchMovimientos("", "", "");
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este movimiento?")) return;
    try {
      await api.delete(`/movimientos-camioneta/${id}/`);
      setMovimientos(prev => prev.filter(m => m.id !== id));
    } catch (err) { alert("Error al eliminar: " + err.message); }
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    setMsgEdit("");
    try {
      await api.patch(`/movimientos-camioneta/${editando.id}/`, {
        equipo_id:      editando.equipo_id,
        fecha:          editando.fecha,
        hora_salida:    editando.hora_salida,
        hora_llegada:   editando.hora_llegada,
        punto_inicio:   editando.punto_inicio,
        punto_fin:      editando.punto_fin,
        llegada_gr_lch: editando.llegada_gr_lch || "",
        salida_gr_lch:  editando.salida_gr_lch  || "",
        observaciones:  editando.observaciones,
      });
      setMovimientos(prev => prev.map(m => m.id === editando.id ? { ...m, ...editando } : m));
      setEditando(null);
    } catch (err) { setMsgEdit("Error: " + err.message); }
  };

  const equipoNombre  = (m) => m.equipos?.nombre || equipos.find(e => String(e.id) === String(m.equipo_id))?.nombre || "—";
  const esEquipo2     = (m) => equipoNombre(m) === "Equipo 2";
  const equipoEditNom = equipos.find(e => String(e.id) === String(editando?.equipo_id))?.nombre;

  const movsEq1 = movimientos.filter(m => !esEquipo2(m));
  const movsEq2 = movimientos.filter(m =>  esEquipo2(m));

  // ─── Tabla genérica ───────────────────────────────────────────────────
  const TablaMovimientos = ({ filas, conGR }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
            <th className="text-left px-4 py-3">Fecha</th>
            <th className="text-left px-4 py-3">Hora salida</th>
            <th className="text-left px-4 py-3">Hora llegada</th>
            <th className="text-left px-4 py-3">Inicio</th>
            <th className="text-left px-4 py-3">Fin</th>
            {conGR && <th className="text-left px-4 py-3">Llegada GR/LCH</th>}
            {conGR && <th className="text-left px-4 py-3">Salida GR/LCH</th>}
            <th className="text-left px-4 py-3">Observaciones</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td colSpan={conGR ? 9 : 7} className="px-4 py-4 text-slate-400 text-xs">
                Sin movimientos
              </td>
            </tr>
          ) : filas.map(m => (
            <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-2.5 text-xs">{m.fecha}</td>
              <td className="px-4 py-2.5 text-xs">{m.hora_salida?.slice(0,5)  || "—"}</td>
              <td className="px-4 py-2.5 text-xs">{m.hora_llegada?.slice(0,5) || "—"}</td>
              <td className="px-4 py-2.5 text-xs">{m.punto_inicio || "—"}</td>
              <td className="px-4 py-2.5 text-xs">{m.punto_fin    || "—"}</td>
              {conGR && <td className="px-4 py-2.5 text-xs">{m.llegada_gr_lch?.slice(0,5) || "—"}</td>}
              {conGR && <td className="px-4 py-2.5 text-xs">{m.salida_gr_lch?.slice(0,5)  || "—"}</td>}
              <td className="px-4 py-2.5 text-xs text-slate-600">{m.observaciones || "—"}</td>
              <td className="px-4 py-2.5">
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setEditando({ ...m, equipo_id: m.equipo_id || m.equipos?.id || "" })}
                    className="text-blue-500 hover:text-blue-700 transition"
                    title="Editar">
                    <IconEdit />
                  </button>
                  <button
                    onClick={() => eliminar(m.id)}
                    className="text-red-400 hover:text-red-600 transition"
                    title="Eliminar">
                    <IconTrash />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Historial Camioneta</h1>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      {/* Filtros */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Mes</label>
          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-32">
            <option value="">Todos</option>
            {MESES.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Año</label>
          <select value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-24">
            <option value="">Todos</option>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Equipo</label>
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
        <button onClick={limpiar} className="text-slate-500 hover:text-slate-700 text-sm">
          Limpiar
        </button>
      </div>

      {/* ── Equipo 1 ── */}
      {(!filtroEquipo || equipos.find(e => String(e.id) === filtroEquipo)?.nombre !== "Equipo 2") && (
        <div>
          <h2 className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Equipo 1</h2>
          <TablaMovimientos filas={movsEq1} conGR={false} />
        </div>
      )}

      {/* ── Equipo 2 ── */}
      {(!filtroEquipo || equipos.find(e => String(e.id) === filtroEquipo)?.nombre === "Equipo 2") && (
        <div>
          <h2 className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Equipo 2</h2>
          <TablaMovimientos filas={movsEq2} conGR={true} />
        </div>
      )}

      {/* ── Modal edición ── */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={guardarEdicion}
            className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 w-full max-w-lg space-y-4">
            <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-2">
              Editar movimiento
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Equipo</label>
                <select value={editando.equipo_id}
                  onChange={e => setEditando({ ...editando, equipo_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
                  <option value="">Seleccionar</option>
                  {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Fecha</label>
                <input type="date" value={editando.fecha}
                  onChange={e => setEditando({ ...editando, fecha: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Hora salida</label>
                <input type="time" value={editando.hora_salida || ""}
                  onChange={e => setEditando({ ...editando, hora_salida: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Hora llegada</label>
                <input type="time" value={editando.hora_llegada || ""}
                  onChange={e => setEditando({ ...editando, hora_llegada: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Punto inicio</label>
                <select value={editando.punto_inicio || ""}
                  onChange={e => setEditando({ ...editando, punto_inicio: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar</option>
                  {PUNTOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Punto fin</label>
                <select value={editando.punto_fin || ""}
                  onChange={e => setEditando({ ...editando, punto_fin: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar</option>
                  {PUNTOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {equipoEditNom === "Equipo 2" && (
                <>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Llegada GR/LCH</label>
                    <input type="time" value={editando.llegada_gr_lch || ""}
                      onChange={e => setEditando({ ...editando, llegada_gr_lch: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Salida GR/LCH</label>
                    <input type="time" value={editando.salida_gr_lch || ""}
                      onChange={e => setEditando({ ...editando, salida_gr_lch: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </>
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Observaciones</label>
              <input type="text" value={editando.observaciones || ""}
                onChange={e => setEditando({ ...editando, observaciones: e.target.value })}
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
