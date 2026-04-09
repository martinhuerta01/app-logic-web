"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function CargaDiaPage() {
  const { user } = useAuth();
  const [equipos, setEquipos] = useState([]);
  const [clientes, setClientes] = useState([]);

  // Servicio form
  const [svcFecha, setSvcFecha] = useState(new Date().toISOString().split("T")[0]);
  const [svcEquipo, setSvcEquipo] = useState("");
  const [svcHora, setSvcHora] = useState("");
  const [svcCliente, setSvcCliente] = useState("");
  const [svcTipo, setSvcTipo] = useState("INSTALACION");
  const [svcDispositivo, setSvcDispositivo] = useState("GPS");
  const [svcPatente, setSvcPatente] = useState("");
  const [svcEstado, setSvcEstado] = useState("PENDIENTE");
  const [svcObs, setSvcObs] = useState("");
  const [svcMsg, setSvcMsg] = useState("");

  // Camioneta form
  const [camEquipo, setCamEquipo] = useState("");
  const [camFecha, setCamFecha] = useState(new Date().toISOString().split("T")[0]);
  const [camSalida, setCamSalida] = useState("09:00");
  const [camLlegada, setCamLlegada] = useState("");
  const [camInicio, setCamInicio] = useState("");
  const [camFin, setCamFin] = useState("");
  const [camMsg, setCamMsg] = useState("");

  useEffect(() => {
    api.get("/equipos/").then(setEquipos).catch(() => {});
    api.get("/directorio/").then((data) => {
      const nombres = [...new Set(data.map((d) => d.nombre))];
      setClientes(nombres);
    }).catch(() => {});
  }, []);

  const guardarServicio = async (e) => {
    e.preventDefault();
    setSvcMsg("");
    try {
      const equipo = equipos.find((eq) => eq.nombre === svcEquipo);
      await api.post("/servicios/", {
        fecha: svcFecha,
        equipo_id: equipo?.id || null,
        hora_programada: svcHora || null,
        cliente: svcCliente,
        tipo_servicio: svcTipo,
        dispositivo: svcDispositivo,
        patente: svcPatente,
        estado: svcEstado,
        observaciones: svcObs || null,
        cargado_por: user,
      });
      setSvcMsg("Servicio guardado");
      setSvcHora("");
      setSvcPatente("");
      setSvcObs("");
    } catch (err) {
      setSvcMsg("Error: " + err.message);
    }
  };

  const guardarCamioneta = async (e) => {
    e.preventDefault();
    setCamMsg("");
    try {
      const equipo = equipos.find((eq) => eq.nombre === camEquipo);
      await api.post("/movimientos-camioneta/", {
        equipo_id: equipo?.id,
        fecha: camFecha,
        hora_salida: camSalida || null,
        hora_llegada: camLlegada || null,
        punto_inicio: camInicio || null,
        punto_fin: camFin || null,
        cargado_por: user,
        tecnicos: [],
      });
      setCamMsg("Movimiento guardado");
    } catch (err) {
      setCamMsg("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Carga del Día</h1>

      {/* Servicio */}
      <form onSubmit={guardarServicio} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-700">Nuevo Servicio</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha</label>
            <input type="date" value={svcFecha} onChange={(e) => setSvcFecha(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Equipo</label>
            <select value={svcEquipo} onChange={(e) => setSvcEquipo(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
              <option value="">Seleccionar</option>
              {equipos.map((eq) => <option key={eq.id} value={eq.nombre}>{eq.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Hora</label>
            <input type="time" value={svcHora} onChange={(e) => setSvcHora(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Cliente</label>
            <select value={svcCliente} onChange={(e) => setSvcCliente(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
              <option value="">Seleccionar</option>
              {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo</label>
            <select value={svcTipo} onChange={(e) => setSvcTipo(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option>INSTALACION</option>
              <option>REVISION</option>
              <option>DESINSTALACION</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Dispositivo</label>
            <select value={svcDispositivo} onChange={(e) => setSvcDispositivo(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option>GPS</option>
              <option>LECTORA</option>
              <option>GPS y LECTORA</option>
              <option>CAMARA</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Patente</label>
            <input type="text" value={svcPatente} onChange={(e) => setSvcPatente(e.target.value.toUpperCase())}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Estado</label>
            <select value={svcEstado} onChange={(e) => setSvcEstado(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option>PENDIENTE</option>
              <option>CONFIRMADO</option>
              <option>REALIZADO</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Observaciones</label>
          <input type="text" value={svcObs} onChange={(e) => setSvcObs(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
            Guardar servicio
          </button>
          {svcMsg && <span className={`text-sm ${svcMsg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{svcMsg}</span>}
        </div>
      </form>

      {/* Camioneta */}
      <form onSubmit={guardarCamioneta} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-700">Movimiento Camioneta</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Equipo</label>
            <select value={camEquipo} onChange={(e) => setCamEquipo(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
              <option value="">Seleccionar</option>
              {equipos.map((eq) => <option key={eq.id} value={eq.nombre}>{eq.nombre} ({eq.patente})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha</label>
            <input type="date" value={camFecha} onChange={(e) => setCamFecha(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Hora salida</label>
            <input type="time" value={camSalida} onChange={(e) => setCamSalida(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Hora llegada</label>
            <input type="time" value={camLlegada} onChange={(e) => setCamLlegada(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Punto inicio</label>
            <input type="text" value={camInicio} onChange={(e) => setCamInicio(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Punto fin</label>
            <input type="text" value={camFin} onChange={(e) => setCamFin(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
            Guardar camioneta
          </button>
          {camMsg && <span className={`text-sm ${camMsg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{camMsg}</span>}
        </div>
      </form>
    </div>
  );
}
