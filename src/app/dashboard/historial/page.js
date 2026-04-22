"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

const MESES_NOMBRES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_SEMANA   = ["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"];

// ─── Modal detalle de un día ───────────────────────────────────────────────
function ModalDia({ fecha, svcEquipos, svcInterior, equipos, onClose }) {
  const todosDia = [...svcEquipos, ...svcInterior].filter(s => s.fecha === fecha);

  const [anioN, mesN, diaN] = fecha.split("-").map(Number);
  const dateObj = new Date(anioN, mesN - 1, diaN);
  const DIAS_N = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const titulo = `${DIAS_N[dateObj.getDay()]} ${diaN} de ${MESES_NOMBRES[mesN - 1]}`;

  const EQ_COLORS = [
    { header: "bg-blue-700 text-white" },
    { header: "bg-teal-700 text-white" },
  ];
  const ESTADO_COLOR = {
    REALIZADO:  "bg-green-100 text-green-700",
    CONFIRMADO: "bg-blue-100 text-blue-700",
    PENDIENTE:  "bg-yellow-100 text-yellow-700",
    SUSPENDIDO: "bg-red-100 text-red-700",
  };

  const grupos = equipos.map((eq, idx) => ({
    nombre: eq.nombre,
    svcs: todosDia.filter(s => String(s.equipo_id) === String(eq.id) || s.responsable === eq.nombre),
    colorHeader: (EQ_COLORS[idx] || EQ_COLORS[0]).header,
  }));
  const interiorGrupo = {
    nombre: "Interior",
    svcs: todosDia.filter(s => !s.equipo_id),
    colorHeader: "bg-violet-700 text-white",
  };

  const FilasSvc = ({ svcs }) => (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
          <th className="text-left px-4 py-2">Hora</th>
          <th className="text-left px-4 py-2">Cliente</th>
          <th className="text-left px-4 py-2">Tipo</th>
          <th className="text-left px-4 py-2">Patente</th>
          <th className="text-left px-4 py-2">Estado</th>
          <th className="text-left px-4 py-2">Observaciones</th>
        </tr>
      </thead>
      <tbody>
        {svcs.map((s, i) => (
          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
            <td className="px-4 py-2 font-mono">{s.hora_programada?.slice(0,5) || "—"}</td>
            <td className="px-4 py-2 font-medium">
              {s.tipo_servicio === "-"
                ? <span className="px-1.5 py-0.5 rounded font-bold bg-orange-100 text-orange-700 border border-orange-300">FERIADO</span>
                : s.cliente}
            </td>
            <td className="px-4 py-2 text-blue-700 font-medium">{s.tipo_servicio === "-" ? "—" : s.tipo_servicio}</td>
            <td className="px-4 py-2 font-mono">{s.patente || "—"}</td>
            <td className="px-4 py-2">
              <span className={`px-2 py-0.5 rounded font-medium ${ESTADO_COLOR[s.estado] || "bg-slate-100 text-slate-600"}`}>
                {s.estado || "—"}
              </span>
            </td>
            <td className="px-4 py-2 text-slate-500">{s.observaciones || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-800">{titulo}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {[...grupos, interiorGrupo].map(g => (
            <div key={g.nombre} className="rounded-lg border border-slate-200 overflow-hidden">
              <div className={`${g.colorHeader} px-4 py-2 flex items-center justify-between`}>
                <span className="font-semibold text-sm">{g.nombre}</span>
                <span className="text-xs opacity-80">
                  {g.svcs.length} servicio{g.svcs.length !== 1 ? "s" : ""}
                </span>
              </div>
              {g.svcs.length === 0
                ? <div className="px-4 py-3 text-xs text-slate-400 italic">Sin servicios este día</div>
                : <FilasSvc svcs={g.svcs} />
              }
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Grilla de calendario ─────────────────────────────────────────────────
function CalendarioVista({ mes, anio, svcEquipos, svcInterior, equipos, onDayClick }) {
  const mesNum  = parseInt(mes)  || new Date().getMonth() + 1;
  const anioNum = parseInt(anio) || new Date().getFullYear();

  const diasEnMes  = new Date(anioNum, mesNum, 0).getDate();
  const primerDow  = new Date(anioNum, mesNum - 1, 1).getDay(); // 0=Dom
  const offsetLun  = (primerDow + 6) % 7; // convertir a lunes=0

  const hoy = new Date().toISOString().split("T")[0];

  // Agrupar servicios por fecha
  const porFecha = {};
  svcEquipos.forEach(s => {
    if (!porFecha[s.fecha]) porFecha[s.fecha] = { equipos: {}, interior: 0 };
    const nombre = equipos.find(e => String(e.id) === String(s.equipo_id))?.nombre || s.responsable || "?";
    porFecha[s.fecha].equipos[nombre] = (porFecha[s.fecha].equipos[nombre] || 0) + 1;
  });
  svcInterior.forEach(s => {
    if (!porFecha[s.fecha]) porFecha[s.fecha] = { equipos: {}, interior: 0 };
    porFecha[s.fecha].interior++;
  });

  // Celdas: nulls de relleno + días 1..N
  const cells = [...Array(offsetLun).fill(null), ...Array.from({length: diasEnMes}, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const EQ_BADGE = [
    "bg-blue-100 text-blue-700",
    "bg-teal-100 text-teal-700",
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-800 text-white px-5 py-3 text-center">
        <h2 className="text-sm font-bold tracking-widest">
          {mes ? MESES_NOMBRES[mesNum - 1].toUpperCase() : "MES"} {anio}
        </h2>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200">
        {DIAS_SEMANA.map(d => (
          <div key={d}
            className={`text-center text-xs font-semibold py-2 ${d === "SÁB" || d === "DOM" ? "text-slate-400" : "text-slate-500"}`}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
        {cells.map((dia, idx) => {
          if (!dia) return <div key={idx} className="min-h-[88px] bg-slate-50/70" />;

          const isWeekend = idx % 7 >= 5;
          const fechaStr = `${anioNum}-${String(mesNum).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
          const isHoy = fechaStr === hoy;
          const data = porFecha[fechaStr];
          const hasSvcs = data && (Object.keys(data.equipos).length > 0 || data.interior > 0);

          return (
            <div key={idx}
              onClick={() => hasSvcs && onDayClick(fechaStr)}
              className={[
                "min-h-[88px] p-1.5 select-none",
                isWeekend ? "bg-slate-50/70" : "",
                hasSvcs ? "cursor-pointer hover:bg-blue-50 transition" : "",
                isHoy ? "ring-2 ring-inset ring-blue-400" : "",
              ].join(" ")}>
              <div className={`text-xs font-bold mb-1.5 ${isHoy ? "text-blue-600" : hasSvcs ? "text-slate-700" : "text-slate-300"}`}>
                {dia}
                {isHoy && <span className="ml-1 text-[10px] text-blue-400 font-normal">hoy</span>}
              </div>
              {hasSvcs && (
                <div className="space-y-0.5">
                  {equipos.map((eq, eqIdx) => {
                    const count = data.equipos[eq.nombre] || 0;
                    if (!count) return null;
                    return (
                      <div key={eq.id}
                        className={`text-xs rounded px-1.5 py-0.5 font-medium ${EQ_BADGE[eqIdx] || "bg-slate-100 text-slate-700"}`}>
                        {eq.nombre.replace("Equipo ", "Eq ")}: <strong>{count}</strong>
                      </div>
                    );
                  })}
                  {data.interior > 0 && (
                    <div className="text-xs bg-violet-100 text-violet-700 rounded px-1.5 py-0.5 font-medium">
                      Int: <strong>{data.interior}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="border-t border-slate-100 px-4 py-2.5 flex gap-4 flex-wrap">
        {equipos.map((eq, idx) => (
          <span key={eq.id} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`w-3 h-3 rounded ${(EQ_BADGE[idx] || "bg-slate-200").split(" ")[0]}`} />
            {eq.nombre}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-3 rounded bg-violet-100" /> Interior
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-3 rounded border border-slate-200 bg-slate-50" /> Sin servicios
        </span>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────
export default function HistorialPage() {
  const [equipos,      setEquipos]      = useState([]);
  const [svcEquipos,   setSvcEquipos]   = useState([]);
  const [svcInterior,  setSvcInterior]  = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroMes,    setFiltroMes]    = useState("");
  const [filtroDia,    setFiltroDia]    = useState("");
  const [filtroAnio,   setFiltroAnio]   = useState("2026");
  const [vistaCalendario, setVistaCalendario] = useState(false);
  const [diaSeleccionado,  setDiaSeleccionado]  = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/equipos/").then(setEquipos).catch(() => setError("No se pudieron cargar los equipos."));
  }, []);

  const buscar = async () => {
    setError("");
    const params = {};
    if (filtroEstado) params.estado = filtroEstado;
    if (filtroMes)    params.mes    = filtroMes;
    if (filtroAnio)   params.anio   = filtroAnio;
    try {
      const [eq, int] = await Promise.all([
        api.get("/servicios/", { ...params, tipo: "equipos" }),
        api.get("/servicios/", { ...params, tipo: "interior" }),
      ]);
      // En vista tabla aplica filtro de día; en calendario muestra todo el mes
      const porDia = (lista) => {
        if (!filtroDia || vistaCalendario) return lista;
        return lista.filter(s => {
          const d = s.fecha ? new Date(s.fecha).getUTCDate() : null;
          return d === parseInt(filtroDia, 10);
        });
      };
      const ordenar = (lista) =>
        porDia(lista).sort((a, b) =>
          (a.responsable || "").toLowerCase().localeCompare((b.responsable || "").toLowerCase())
        );
      setSvcEquipos(ordenar(eq));
      setSvcInterior(porDia(int));
    } catch { setError("Error al buscar servicios. Verificá la conexión con el servidor."); }
  };

  // Al cambiar a calendario, re-buscar sin filtro de día para tener todos los días del mes
  const toggleVista = (esCalendario) => {
    setVistaCalendario(esCalendario);
    if (esCalendario && filtroDia) {
      // Re-fetch sin filtroDia usando los datos ya cargados (o re-buscamos)
      buscar();
    }
  };

  const cambiarEstado = async (id, estado, esInterior = false) => {
    try {
      await api.put(`/servicios/${id}`, { estado });
      if (esInterior) setSvcInterior(prev => prev.map(s => s.id === id ? { ...s, estado } : s));
      else            setSvcEquipos(prev  => prev.map(s => s.id === id ? { ...s, estado } : s));
    } catch { setError("No se pudo actualizar el estado."); }
  };

  const equipoNombre = (eqId) => equipos.find(e => e.id === eqId)?.nombre || "—";

  const dispDisplay = (s) => {
    if (s.dispositivo && s.dispositivo !== "—") return s.dispositivo;
    if ((s.cliente || "").toUpperCase().includes("SERENISIMA")) return "-";
    return "—";
  };

  const colorEstado = (estado) => ({
    REALIZADO:  "bg-green-100 text-green-800 border-green-300",
    PENDIENTE:  "bg-yellow-100 text-yellow-800 border-yellow-300",
    CONFIRMADO: "bg-white text-slate-700 border-slate-300",
    SUSPENDIDO: "bg-red-100 text-red-800 border-red-300",
  }[estado] || "bg-white text-slate-700 border-slate-300");

  const SelectEstado = ({ s, esInterior }) => (
    <select value={s.estado || "-"} onChange={e => cambiarEstado(s.id, e.target.value, esInterior)}
      className={`border rounded px-2 py-1 text-xs font-medium ${colorEstado(s.estado)}`}>
      <option value="-">-</option>
      <option>PENDIENTE</option>
      <option>CONFIRMADO</option>
      <option>REALIZADO</option>
      <option>SUSPENDIDO</option>
    </select>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Historial de Servicios</h1>
        <div className="flex gap-2">
          <button onClick={() => toggleVista(false)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${!vistaCalendario ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300"}`}>
            📋 Tabla
          </button>
          <button onClick={() => toggleVista(true)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${vistaCalendario ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300"}`}>
            📅 Calendario
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

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
        {/* Filtro Día solo visible en vista tabla */}
        {!vistaCalendario && (
          <div>
            <label className="block text-xs text-slate-500 mb-1">Día</label>
            <select value={filtroDia} onChange={e => setFiltroDia(e.target.value)}
              disabled={!filtroMes}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
              <option value="">Todos</option>
              {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
            </select>
          </div>
        )}
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

      {/* ── VISTA CALENDARIO ── */}
      {vistaCalendario && (
        <>
          <CalendarioVista
            mes={filtroMes}
            anio={filtroAnio}
            svcEquipos={svcEquipos}
            svcInterior={svcInterior}
            equipos={equipos}
            onDayClick={setDiaSeleccionado}
          />
          {diaSeleccionado && (
            <ModalDia
              fecha={diaSeleccionado}
              svcEquipos={svcEquipos}
              svcInterior={svcInterior}
              equipos={equipos}
              onClose={() => setDiaSeleccionado(null)}
            />
          )}
        </>
      )}

      {/* ── VISTA TABLA ── */}
      {!vistaCalendario && (
        <>
          <div>
            <h2 className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Equipo 1 y Equipo 2</h2>
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
                    <th className="text-left px-4 py-3">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {svcEquipos.length === 0
                    ? <tr><td colSpan={9} className="px-4 py-4 text-slate-400 text-xs">Sin registros</td></tr>
                    : svcEquipos.map(s => (
                      <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-xs">{s.fecha}</td>
                        <td className="px-4 py-2.5 text-xs font-medium">{s.responsable || equipoNombre(s.equipo_id)}</td>
                        <td className="px-4 py-2.5 text-xs">{s.hora_programada?.slice(0,5) || "—"}</td>
                        <td className="px-4 py-2.5 text-xs">
                          {s.tipo_servicio === "-"
                            ? <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 border border-orange-300">FERIADO</span>
                            : s.cliente}
                        </td>
                        <td className="px-4 py-2.5 text-xs">{s.tipo_servicio === "-" ? "—" : s.tipo_servicio}</td>
                        <td className="px-4 py-2.5 text-xs">{dispDisplay(s)}</td>
                        <td className="px-4 py-2.5 text-xs font-mono">{s.patente}</td>
                        <td className="px-4 py-2.5"><SelectEstado s={s} esInterior={false} /></td>
                        <td className="px-4 py-2.5 text-xs text-slate-600">{s.observaciones || "—"}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Técnicos / Talleres Interior</h2>
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
                    <th className="text-left px-4 py-3">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {svcInterior.length === 0
                    ? <tr><td colSpan={10} className="px-4 py-4 text-slate-400 text-xs">Sin registros</td></tr>
                    : svcInterior.map(s => (
                      <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-xs">{s.fecha}</td>
                        <td className="px-4 py-2.5 text-xs font-medium">{s.responsable || "—"}</td>
                        <td className="px-4 py-2.5 text-xs">{s.localidad || "—"}</td>
                        <td className="px-4 py-2.5 text-xs">{s.hora_programada?.slice(0,5) || "—"}</td>
                        <td className="px-4 py-2.5 text-xs">
                          {s.tipo_servicio === "-"
                            ? <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 border border-orange-300">FERIADO</span>
                            : s.cliente}
                        </td>
                        <td className="px-4 py-2.5 text-xs">{s.tipo_servicio === "-" ? "—" : s.tipo_servicio}</td>
                        <td className="px-4 py-2.5 text-xs">{dispDisplay(s)}</td>
                        <td className="px-4 py-2.5 text-xs font-mono">{s.patente}</td>
                        <td className="px-4 py-2.5"><SelectEstado s={s} esInterior={true} /></td>
                        <td className="px-4 py-2.5 text-xs text-slate-600">{s.observaciones || "—"}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
