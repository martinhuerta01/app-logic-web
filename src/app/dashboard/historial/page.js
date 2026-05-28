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
    { header: "bg-blue-600 text-white" },
    { header: "bg-orange-500 text-white" },
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
    colorHeader: "bg-violet-600 text-white",
  };

  const FilasSvc = ({ svcs }) => (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
          <th className="text-left px-4 py-2">Hora</th>
          <th className="text-left px-4 py-2">Cliente</th>
          <th className="text-left px-4 py-2">Tipo</th>
          <th className="text-left px-4 py-2">Dispositivo</th>
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
            <td className="px-4 py-2 text-slate-600">{s.dispositivo || "—"}</td>
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
  const _ar = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
  const mesNum  = parseInt(mes)  || parseInt(_ar.split("-")[1]);
  const anioNum = parseInt(anio) || parseInt(_ar.split("-")[0]);

  const diasEnMes  = new Date(anioNum, mesNum, 0).getDate();
  const primerDow  = new Date(anioNum, mesNum - 1, 1).getDay(); // 0=Dom
  const offsetLun  = (primerDow + 6) % 7; // convertir a lunes=0

  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });

  // Agrupar servicios por fecha
  const ESTADOS_ABIERTOS = new Set(["PENDIENTE", "CONFIRMADO"]);
  const porFecha = {};
  svcEquipos.forEach(s => {
    if (!porFecha[s.fecha]) porFecha[s.fecha] = { equipos: {}, interior: 0, sinCerrar: 0 };
    const nombre = equipos.find(e => String(e.id) === String(s.equipo_id))?.nombre || s.responsable || "?";
    porFecha[s.fecha].equipos[nombre] = (porFecha[s.fecha].equipos[nombre] || 0) + 1;
    if (ESTADOS_ABIERTOS.has(s.estado)) porFecha[s.fecha].sinCerrar++;
  });
  svcInterior.forEach(s => {
    if (!porFecha[s.fecha]) porFecha[s.fecha] = { equipos: {}, interior: 0, sinCerrar: 0 };
    porFecha[s.fecha].interior++;
    if (ESTADOS_ABIERTOS.has(s.estado)) porFecha[s.fecha].sinCerrar++;
  });

  // Celdas: nulls de relleno + días 1..N
  const cells = [...Array(offsetLun).fill(null), ...Array.from({length: diasEnMes}, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const EQ_BADGE = [
    "bg-blue-600 text-white",
    "bg-orange-500 text-white",
  ];
  const INT_BADGE = "bg-violet-600 text-white";

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
          if (!dia) return <div key={idx} className="min-h-[96px] bg-slate-50/70" />;

          const isWeekend = idx % 7 >= 5;
          const fechaStr = `${anioNum}-${String(mesNum).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
          const isHoy = fechaStr === hoy;
          const data = porFecha[fechaStr];
          const hasSvcs = data && (Object.keys(data.equipos).length > 0 || data.interior > 0);

          return (
            <div key={idx}
              onClick={() => hasSvcs && onDayClick(fechaStr)}
              className={[
                "min-h-[96px] p-1.5 select-none",
                isWeekend ? "bg-slate-50/70" : "",
                hasSvcs ? "cursor-pointer hover:bg-slate-50 transition" : "",
                isHoy ? "ring-2 ring-inset ring-blue-400" : "",
              ].join(" ")}>
              <div className="flex items-start justify-between mb-1.5">
                <span className={`text-xs font-bold ${isHoy ? "text-blue-600" : hasSvcs ? "text-slate-700" : "text-slate-300"}`}>
                  {dia}
                  {isHoy && <span className="ml-1 text-[10px] text-blue-400 font-normal">hoy</span>}
                </span>
                {data?.sinCerrar > 0 && (
                  <span className="flex items-center gap-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    ⚠ {data.sinCerrar}
                  </span>
                )}
              </div>
              {hasSvcs && (
                <div className="space-y-0.5">
                  {equipos.map((eq, eqIdx) => {
                    const count = data.equipos[eq.nombre] || 0;
                    if (!count) return null;
                    return (
                      <div key={eq.id}
                        className={`text-xs rounded px-1.5 py-0.5 font-medium ${EQ_BADGE[eqIdx] || "bg-slate-500 text-white"}`}>
                        {eq.nombre}: <strong>{count}</strong>
                      </div>
                    );
                  })}
                  {data.interior > 0 && (
                    <div className={`text-xs rounded px-1.5 py-0.5 font-medium ${INT_BADGE}`}>
                      Interior: <strong>{data.interior}</strong>
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
            <span className={`w-3 h-3 rounded ${(EQ_BADGE[idx] || "bg-slate-500").split(" ")[0]}`} />
            {eq.nombre}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-3 rounded bg-violet-600" /> Interior
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-3 rounded border border-slate-200 bg-slate-50" /> Sin servicios
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">⚠ N</span> Pendientes / Confirmados
        </span>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────
export default function HistorialPage() {
  const hoyDate = new Date(new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }) + "T00:00:00");
  const [equipos,     setEquipos]     = useState([]);
  const [svcEquipos,  setSvcEquipos]  = useState([]);
  const [svcInterior, setSvcInterior] = useState([]);
  const [filtroMes,   setFiltroMes]   = useState(String(hoyDate.getMonth() + 1));
  const [filtroAnio,  setFiltroAnio]  = useState(String(hoyDate.getFullYear()));
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [busquedaActiva, setBusquedaActiva] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [error,    setError]    = useState("");

  const buscar = async (mes = filtroMes, anio = filtroAnio) => {
    setError("");
    setCargando(true);
    const params = {};
    if (mes)  params.mes  = mes;
    if (anio) params.anio = anio;
    try {
      const [eq, int] = await Promise.all([
        api.get("/servicios/", { ...params, tipo: "equipos" }),
        api.get("/servicios/", { ...params, tipo: "interior" }),
      ]);
      setSvcEquipos(eq);
      setSvcInterior(int);
    } catch { setError("Error al buscar servicios. Verificá la conexión con el servidor."); }
    finally  { setCargando(false); }
  };

  const buscarTexto = async (texto) => {
    if (!texto.trim()) return;
    setBusquedaActiva(texto);
    setCargandoBusqueda(true);
    setError("");
    try {
      // Busca en todo el año seleccionado (sin filtro de mes)
      const params = { anio: filtroAnio };
      const [eq, int] = await Promise.all([
        api.get("/servicios/", { ...params, tipo: "equipos" }),
        api.get("/servicios/", { ...params, tipo: "interior" }),
      ]);
      const todos = [...(eq || []), ...(int || [])];
      const q = texto.toLowerCase();
      const filtrados = todos.filter(s =>
        [s.patente, s.cliente, s.responsable, s.tipo_servicio, s.dispositivo, s.observaciones, s.estado]
          .some(v => v?.toLowerCase().includes(q))
      ).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
      setResultadosBusqueda(filtrados);
    } catch { setError("Error al buscar. Verificá la conexión con el servidor."); }
    finally  { setCargandoBusqueda(false); }
  };

  const limpiarBusqueda = () => {
    setBusquedaActiva("");
    setTextoBusqueda("");
    setResultadosBusqueda([]);
  };

  useEffect(() => {
    api.get("/equipos/").then(eqs => {
      setEquipos(eqs);
      buscar();
    }).catch(() => {
      setError("No se pudieron cargar los equipos.");
      buscar();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold text-slate-800">Historial de Servicios</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      {/* Filtros */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Mes</label>
          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            {MESES_NOMBRES.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Año</label>
          <select value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option>2025</option><option>2026</option><option>2027</option>
          </select>
        </div>
        <button onClick={() => { buscar(filtroMes, filtroAnio); setBusquedaActiva(""); setTextoBusqueda(""); }} disabled={cargando}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
          {cargando ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {/* Buscador */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar por patente, cliente, responsable, tipo..."
          value={textoBusqueda}
          onChange={e => setTextoBusqueda(e.target.value)}
          onKeyDown={e => e.key === "Enter" && buscarTexto(textoBusqueda)}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button onClick={() => buscarTexto(textoBusqueda)} disabled={cargandoBusqueda}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
          {cargandoBusqueda ? "Buscando…" : "Buscar"}
        </button>
        {busquedaActiva && (
          <button onClick={limpiarBusqueda}
            className="text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg text-sm border border-slate-300 transition">
            Limpiar
          </button>
        )}
      </div>

      {/* Resultados de búsqueda o Calendario */}
      {busquedaActiva ? (() => {
        const ESTADO_COLOR = {
          REALIZADO:  "bg-green-100 text-green-700",
          CONFIRMADO: "bg-blue-100 text-blue-700",
          PENDIENTE:  "bg-yellow-100 text-yellow-700",
          SUSPENDIDO: "bg-red-100 text-red-700",
        };

        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                Resultados para &quot;{busquedaActiva}&quot;
                {!cargandoBusqueda && (
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {resultadosBusqueda.length} encontrado{resultadosBusqueda.length !== 1 ? "s" : ""}
                    <span className="ml-1 text-slate-300">— año {filtroAnio}</span>
                  </span>
                )}
              </h2>
            </div>
            {cargandoBusqueda ? (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">Buscando en todos los meses…</div>
            ) : resultadosBusqueda.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">Sin resultados</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                      <th className="text-left px-4 py-2.5">Fecha</th>
                      <th className="text-left px-4 py-2.5">Responsable</th>
                      <th className="text-left px-4 py-2.5">Cliente</th>
                      <th className="text-left px-4 py-2.5">Tipo</th>
                      <th className="text-left px-4 py-2.5">Dispositivo</th>
                      <th className="text-left px-4 py-2.5">Patente</th>
                      <th className="text-left px-4 py-2.5">Estado</th>
                      <th className="text-left px-4 py-2.5">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadosBusqueda.map((s, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono">{s.fecha?.split("-").reverse().join("/")}</td>
                        <td className="px-4 py-2.5 font-medium">{s.equipos?.nombre || s.responsable || "Interior"}</td>
                        <td className="px-4 py-2.5">{s.tipo_servicio === "-" ? "FERIADO" : (s.cliente || "—")}</td>
                        <td className="px-4 py-2.5 text-blue-700 font-medium">{s.tipo_servicio === "-" ? "—" : (s.tipo_servicio || "—")}</td>
                        <td className="px-4 py-2.5">{s.dispositivo || "—"}</td>
                        <td className="px-4 py-2.5 font-mono font-medium">{s.patente || "—"}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded font-medium ${ESTADO_COLOR[s.estado] || "bg-slate-100 text-slate-600"}`}>
                            {s.estado || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 max-w-[180px] truncate">{s.observaciones || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })() : (
        <CalendarioVista
          mes={filtroMes}
          anio={filtroAnio}
          svcEquipos={svcEquipos}
          svcInterior={svcInterior}
          equipos={equipos}
          onDayClick={setDiaSeleccionado}
        />
      )}

      {diaSeleccionado && (
        <ModalDia
          fecha={diaSeleccionado}
          svcEquipos={svcEquipos}
          svcInterior={svcInterior}
          equipos={equipos}
          onClose={() => setDiaSeleccionado(null)}
        />
      )}
    </div>
  );
}
