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
  llegada_gr_lch: "",
  salida_gr_lch: "",
  observaciones: "",
};

export default function HorarioTecnicoPage() {
  const { user } = useAuth();
  const [equipos, setEquipos] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get("/equipos/").then(setEquipos).catch(() => {});
  }, []);

  const equipoSeleccionado = equipos.find(e => String(e.id) === String(form.equipo_id));
  const esEquipo2 = equipoSeleccionado?.nombre === "Equipo 2";

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    const body = { ...form, cargado_por: user, tecnicos: [] };
    if (!esEquipo2) {
      body.llegada_gr_lch = "";
      body.salida_gr_lch = "";
    }
    try {
      await api.post("/movimientos-camioneta/", body);
      setMsg("✓ Movimiento guardado");
      setForm({ ...FORM_VACIO, fecha: form.fecha });
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Horario Técnico</h1>

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

        {esEquipo2 && (
          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Llegada GR/LCH</label>
              <input type="time" value={form.llegada_gr_lch} onChange={e => setForm({ ...form, llegada_gr_lch: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Salida GR/LCH</label>
              <input type="time" value={form.salida_gr_lch} onChange={e => setForm({ ...form, salida_gr_lch: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
            Guardar
          </button>
          {msg && <span className={`text-sm font-medium ${msg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{msg}</span>}
        </div>
      </form>
    </div>
  );
}
