"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function CargaDiaPage() {
  const { user } = useAuth();
  const [equipos, setEquipos] = useState([]);
  const [interior, setInterior] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [responsables, setResponsables] = useState([]);

  const [svcFecha, setSvcFecha] = useState(new Date().toISOString().split("T")[0]);
  const [svcResponsable, setSvcResponsable] = useState("");
  const [svcLocalidad, setSvcLocalidad] = useState("");
  const [svcHora, setSvcHora] = useState("");
  const [svcCliente, setSvcCliente] = useState("");
  const [svcTipo, setSvcTipo] = useState("INSTALACION");
  const [svcDispositivo, setSvcDispositivo] = useState("GPS");
  const [svcPatente, setSvcPatente] = useState("");
  const [svcEstado, setSvcEstado] = useState("PENDIENTE");
  const [svcObs, setSvcObs] = useState("");
  const [svcMsg, setSvcMsg] = useState("");
  const [feriado, setFeriado] = useState(false);

  const toggleFeriado = (checked) => {
    setFeriado(checked);
    if (checked) {
      setSvcTipo("-");
      setSvcDispositivo("-");
      setSvcEstado("-");
    } else {
      setSvcTipo("INSTALACION");
      setSvcDispositivo("GPS");
      setSvcEstado("PENDIENTE");
    }
  };

  const esInterior = interior.some(t => t.nombre === svcResponsable);

  useEffect(() => {
    Promise.all([
      api.get("/equipos/"),
      api.get("/directorio/interior"),
      api.get("/directorio/", { tipo: "cliente" }),
    ]).then(([eqs, int, cls]) => {
      setEquipos(eqs);
      setInterior(int);
      setClientes(cls);
      // Armar lista de responsables: Equipo 1, Equipo 2, + técnicos/talleres interior
      const lista = [
        ...eqs.map(e => e.nombre),
        ...int.map(t => t.nombre),
      ];
      setResponsables(lista);
    }).catch(() => {});
  }, []);

  const guardarServicio = async (e) => {
    e.preventDefault();
    setSvcMsg("");
    try {
      const equipo = equipos.find(eq => eq.nombre === svcResponsable);
      await api.post("/servicios/", {
        fecha: svcFecha,
        equipo_id: equipo?.id || null,
        responsable: svcResponsable,
        localidad: esInterior ? svcLocalidad : null,
        hora_programada: svcHora || null,
        cliente: svcCliente,
        tipo_servicio: svcTipo,
        dispositivo: svcDispositivo,
        patente: svcPatente,
        estado: svcEstado,
        observaciones: svcObs || null,
        cargado_por: user,
      });
      setSvcMsg("✓ Servicio guardado");
      setSvcHora("");
      setSvcPatente("");
      setSvcObs("");
      setSvcLocalidad("");
    } catch (err) {
      setSvcMsg("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Carga del Día</h1>

      <form onSubmit={guardarServicio} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-2">Nuevo Servicio</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha</label>
            <input type="date" value={svcFecha} onChange={e => setSvcFecha(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Responsable</label>
            <select value={svcResponsable} onChange={e => setSvcResponsable(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
              <option value="">Seleccionar</option>
              {equipos.length > 0 && (
                <optgroup label="Equipos">
                  {equipos.map(eq => <option key={eq.id} value={eq.nombre}>{eq.nombre}</option>)}
                </optgroup>
              )}
              {interior.length > 0 && (
                <optgroup label="Interior">
                  {interior.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                </optgroup>
              )}
            </select>
          </div>

          {esInterior && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Localidad</label>
              <input type="text" value={svcLocalidad} onChange={e => setSvcLocalidad(e.target.value)}
                placeholder="Ej: Rosario"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 mb-1">Hora</label>
            <input type="time" value={svcHora} onChange={e => setSvcHora(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Cliente</label>
            <select value={svcCliente} onChange={e => setSvcCliente(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required>
              <option value="">Seleccionar</option>
              {(() => {
                // Agrupar por empresa
                const grupos = {};
                clientes.forEach(c => {
                  const key = c.empresa || c.nombre || "";
                  if (!grupos[key]) grupos[key] = [];
                  grupos[key].push(c);
                });
                return Object.entries(grupos).map(([empresa, lista]) => {
                  const label = (c) => c.base ? `${c.empresa || c.nombre} / ${c.base}` : (c.empresa || c.nombre);
                  const val   = (c) => c.base ? `${c.empresa || c.nombre} / ${c.base}` : (c.empresa || c.nombre);
                  if (lista.length === 1) {
                    const c = lista[0];
                    return <option key={c.id} value={val(c)}>{label(c)}</option>;
                  }
                  return (
                    <optgroup key={empresa} label={empresa}>
                      {lista.map(c => <option key={c.id} value={val(c)}>{label(c)}</option>)}
                    </optgroup>
                  );
                });
              })()}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo</label>
            <select value={svcTipo} onChange={e => setSvcTipo(e.target.value)}
              disabled={feriado}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:opacity-50">
              <option value="-">-</option>
              <option>INSTALACION</option>
              <option>REVISION</option>
              <option>DESINSTALACION</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Dispositivo</label>
            <select value={svcDispositivo} onChange={e => setSvcDispositivo(e.target.value)}
              disabled={feriado}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:opacity-50">
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
            <input type="text" value={svcPatente} onChange={e => setSvcPatente(e.target.value.toUpperCase())}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Estado</label>
            <select value={svcEstado} onChange={e => setSvcEstado(e.target.value)}
              disabled={feriado}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:opacity-50">
              <option value="-">-</option>
              <option>PENDIENTE</option>
              <option>CONFIRMADO</option>
              <option>REALIZADO</option>
              <option>SUSPENDIDO</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Observaciones</label>
          <input type="text" value={svcObs} onChange={e => setSvcObs(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="flex items-center gap-4">
          <button type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
            Guardar servicio
          </button>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={feriado}
              onChange={e => toggleFeriado(e.target.checked)}
              className="w-4 h-4 accent-orange-500 cursor-pointer"
            />
            <span className={`text-sm font-semibold ${feriado ? "text-orange-600" : "text-slate-500"}`}>
              FERIADO
            </span>
          </label>
          {svcMsg && (
            <span className={`text-sm font-medium ${svcMsg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
              {svcMsg}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
