"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { fetchOpciones } from "@/lib/opciones";

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

let nextId = 1;
const filaVacia = (opts) => ({
  _id: nextId++,
  tipo:         opts?.tipos?.[0]        || "INSTALACION",
  dispositivo:  opts?.dispositivos?.[0] || "GPS",
  patente:      "",
  estado:       opts?.estados?.[0]      || "PENDIENTE",
  observaciones:"",
});

export default function CargaDiaPage() {
  const { user } = useAuth();
  const [equipos,       setEquipos]       = useState([]);
  const [interior,      setInterior]      = useState([]);
  const [clientes,      setClientes]      = useState([]);
  const [opciones,      setOpciones]      = useState({ tipos: [], dispositivos: [], estados: [] });

  // Cabecera del bloque
  const [svcFecha,       setSvcFecha]       = useState(new Date().toISOString().split("T")[0]);
  const [svcResponsable, setSvcResponsable] = useState("");
  const [svcLocalidad,   setSvcLocalidad]   = useState("");
  const [svcHora,        setSvcHora]        = useState("");
  const [svcCliente,     setSvcCliente]     = useState("");

  // Filas de servicios
  const [filas,     setFilas]     = useState([]);
  const [feriado,   setFeriado]   = useState(false);
  const [svcMsg,    setSvcMsg]    = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorCarga,setErrorCarga]= useState("");

  const esInterior = interior.some(t => t.nombre === svcResponsable);

  useEffect(() => {
    fetchOpciones().then(opts => {
      setOpciones(opts);
      setFilas([filaVacia(opts)]);
    });

    Promise.all([
      api.get("/equipos/"),
      api.get("/directorio/interior"),
      api.get("/directorio/", { tipo: "cliente" }),
    ]).then(([eqs, int, cls]) => {
      setEquipos(eqs);
      setInterior(int);
      setClientes(cls);
    }).catch(() => setErrorCarga("No se pudieron cargar los datos iniciales. Verificá la conexión con el servidor."));
  }, []);

  // ── Manejo de filas ───────────────────────────────────────────────
  const agregarFila = () => setFilas(prev => [...prev, filaVacia(opciones)]);

  const eliminarFila = (id) =>
    setFilas(prev => prev.length > 1 ? prev.filter(f => f._id !== id) : prev);

  const actualizarFila = (id, campo, valor) =>
    setFilas(prev => prev.map(f => f._id === id ? { ...f, [campo]: valor } : f));

  const onPatenteKeyDown = (e, fila) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nueva = { ...filaVacia(opciones), tipo: fila.tipo, dispositivo: fila.dispositivo, estado: fila.estado };
      setFilas(prev => {
        const idx = prev.findIndex(f => f._id === fila._id);
        const arr = [...prev];
        arr.splice(idx + 1, 0, nueva);
        return arr;
      });
    }
  };

  // ── FERIADO ───────────────────────────────────────────────────────
  const toggleFeriado = (checked) => {
    setFeriado(checked);
    if (checked) {
      setSvcCliente("-");
      setFilas([{ ...filaVacia(opciones), tipo: "-", dispositivo: "-", estado: "-" }]);
    } else {
      setSvcCliente("");
      setFilas([filaVacia(opciones)]);
    }
  };

  // ── Guardar bloque ────────────────────────────────────────────────
  const guardarBloque = async (e) => {
    e.preventDefault();
    setSvcMsg("");

    const filasValidas = feriado ? filas.slice(0, 1) : filas.filter(f => f.patente.trim());

    if (!feriado && filasValidas.length === 0) {
      setSvcMsg("Completá al menos una patente antes de guardar.");
      return;
    }

    setGuardando(true);
    try {
      const equipo = equipos.find(eq => eq.nombre === svcResponsable);
      await Promise.all(filasValidas.map(f =>
        api.post("/servicios/", {
          fecha:          svcFecha,
          equipo_id:      equipo?.id || null,
          responsable:    svcResponsable,
          localidad:      esInterior ? svcLocalidad : null,
          hora_programada:svcHora || null,
          cliente:        svcCliente,
          tipo_servicio:  f.tipo,
          dispositivo:    f.dispositivo,
          patente:        f.patente,
          estado:         f.estado,
          observaciones:  f.observaciones || null,
          cargado_por:    user,
        })
      ));
      const n = filasValidas.length;
      setSvcMsg(`✓ ${n} servicio${n > 1 ? "s" : ""} guardado${n > 1 ? "s" : ""}`);
      setFilas([filaVacia(opciones)]);
      setSvcHora("");
      setSvcLocalidad("");
      setFeriado(false);
      setSvcCliente("");
    } catch (err) {
      setSvcMsg("Error: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Cliente dropdown ──────────────────────────────────────────────
  const ClienteDropdown = () => {
    const grupos = {};
    clientes.forEach(c => {
      const key = c.empresa || c.nombre || "";
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(c);
    });
    const label = (c) => c.base ? `${c.empresa || c.nombre} / ${c.base}` : (c.empresa || c.nombre);
    const val   = (c) => c.base ? `${c.empresa || c.nombre} / ${c.base}` : (c.empresa || c.nombre);
    return (
      <select value={svcCliente} onChange={e => setSvcCliente(e.target.value)}
        disabled={feriado}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:opacity-50" required>
        <option value="">Seleccionar</option>
        <option value="-">-</option>
        {Object.entries(grupos).map(([empresa, lista]) =>
          lista.length === 1
            ? <option key={lista[0].id} value={val(lista[0])}>{label(lista[0])}</option>
            : (
              <optgroup key={empresa} label={empresa}>
                {lista.map(c => <option key={c.id} value={val(c)}>{label(c)}</option>)}
              </optgroup>
            )
        )}
      </select>
    );
  };

  const filasConPatente = filas.filter(f => f.patente.trim()).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Carga del Día</h1>
      {errorCarga && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{errorCarga}</div>
      )}

      <form onSubmit={guardarBloque} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
        <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-2">Nuevo Bloque de Servicios</h2>

        {/* ── Datos comunes ── */}
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
            <ClienteDropdown />
          </div>
        </div>

        {/* ── Tabla de servicios ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Servicios del bloque</p>
            <span className="text-xs text-slate-400">{filas.length} fila{filas.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 font-semibold text-slate-500 w-40">Tipo</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500 w-36">Dispositivo</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500 w-28">Patente</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500 w-36">Estado</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Observaciones</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((fila) => (
                  <tr key={fila._id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <select value={fila.tipo}
                        onChange={e => actualizarFila(fila._id, "tipo", e.target.value)}
                        disabled={feriado}
                        className="border border-slate-300 rounded px-2 py-1.5 text-xs w-full disabled:opacity-50">
                        <option value="-">-</option>
                        {opciones.tipos.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select value={fila.dispositivo}
                        onChange={e => actualizarFila(fila._id, "dispositivo", e.target.value)}
                        disabled={feriado}
                        className="border border-slate-300 rounded px-2 py-1.5 text-xs w-full disabled:opacity-50">
                        <option value="-">-</option>
                        {opciones.dispositivos.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input type="text"
                        value={fila.patente}
                        onChange={e => actualizarFila(fila._id, "patente", e.target.value.toUpperCase())}
                        onKeyDown={e => onPatenteKeyDown(e, fila)}
                        disabled={feriado}
                        placeholder="AB123CD"
                        className="border border-slate-300 rounded px-2 py-1.5 text-xs font-mono w-full disabled:opacity-50" />
                    </td>
                    <td className="px-3 py-2">
                      <select value={fila.estado}
                        onChange={e => actualizarFila(fila._id, "estado", e.target.value)}
                        disabled={feriado}
                        className="border border-slate-300 rounded px-2 py-1.5 text-xs w-full disabled:opacity-50">
                        <option value="-">-</option>
                        {opciones.estados.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input type="text"
                        value={fila.observaciones}
                        onChange={e => actualizarFila(fila._id, "observaciones", e.target.value)}
                        placeholder="Opcional"
                        className="border border-slate-300 rounded px-2 py-1.5 text-xs w-full" />
                    </td>
                    <td className="px-3 py-2">
                      <button type="button"
                        onClick={() => eliminarFila(fila._id)}
                        disabled={filas.length === 1}
                        className="text-red-400 hover:text-red-600 transition disabled:opacity-20 disabled:cursor-not-allowed">
                        <IconTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!feriado && (
              <div className="border-t border-slate-100 px-3 py-2">
                <button type="button" onClick={agregarFila}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition">
                  <span className="text-base leading-none">+</span> Agregar fila
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-1.5">
            Tip: presioná <kbd className="bg-slate-100 border border-slate-300 rounded px-1 text-[10px]">Enter</kbd> en Patente para agregar la siguiente fila automáticamente.
          </p>
        </div>

        {/* ── Acciones ── */}
        <div className="flex items-center gap-4 pt-1">
          <button type="submit" disabled={guardando}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
            {guardando
              ? "Guardando…"
              : `Guardar ${feriado ? 1 : filasConPatente || ""} servicio${(feriado ? 1 : filasConPatente) !== 1 ? "s" : ""}`}
          </button>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={feriado} onChange={e => toggleFeriado(e.target.checked)}
              className="w-4 h-4 accent-orange-500 cursor-pointer" />
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
