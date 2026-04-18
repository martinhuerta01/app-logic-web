"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORES = ["#1e3a8a", "#0f766e", "#b45309", "#7c3aed", "#dc2626", "#059669", "#d97706", "#4f46e5"];

function calcHoras(inicio, fin) {
  if (!inicio || !fin) return null;
  const parse = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const diff = parse(fin) - parse(inicio);
  return diff > 0 ? +(diff / 60).toFixed(2) : null;
}

function fechaMatch(fecha, mes, anio) {
  if (!fecha) return false;
  const [y, m] = fecha.split("-");
  if (anio && y !== String(anio)) return false;
  if (mes && m !== String(mes).padStart(2, "0")) return false;
  return true;
}

// Normaliza para agrupar (case-insensitive, sin espacios extra)
const normKey = s => (s || "Sin cliente").trim().toLowerCase();
// Muestra la primera letra de cada palabra en mayúscula
const titleCase = s => s.replace(/\b\w/g, c => c.toUpperCase());

const MESES_NOMBRES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const FiltrosMesAnio = ({ mes, setMes, anio, setAnio, onCalcular, label = "Calcular" }) => (
  <div className="flex items-end gap-3">
    <div>
      <label className="block text-xs text-slate-500 mb-1">Mes</label>
      <select value={mes} onChange={e => setMes(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
        <option value="">Todos</option>
        {MESES_NOMBRES.map((nombre, i) => <option key={i+1} value={i+1}>{nombre}</option>)}
      </select>
    </div>
    <div>
      <label className="block text-xs text-slate-500 mb-1">Año</label>
      <select value={anio} onChange={e => setAnio(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
        <option>2025</option><option>2026</option><option>2027</option>
      </select>
    </div>
    <button onClick={onCalcular} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
      {label}
    </button>
  </div>
);

// ─── HORAS TRABAJADAS ─────────────────────────────────────────────

function TablaEquipoHoras({ nombre, filas }) {
  const totalHoras = +filas.reduce((a, f) => a + (f.horas ?? 0), 0).toFixed(1);
  const totalBase = filas.length * 8;
  const totalBalance = +(totalHoras - totalBase).toFixed(1);

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">{nombre}</h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
              <th className="text-left px-4 py-3">Día</th>
              <th className="text-left px-4 py-3">Hora salida</th>
              <th className="text-left px-4 py-3">Hora llegada</th>
              <th className="text-left px-4 py-3">Horas trabajadas</th>
              <th className="text-left px-4 py-3">Horas base (8h)</th>
              <th className="text-left px-4 py-3">Balance</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-4 text-slate-400 text-xs">Sin movimientos registrados</td></tr>
            ) : (
              <>
                {filas.map((f, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-xs font-medium">{f.dia}</td>
                    <td className="px-4 py-2.5 text-xs">{f.hora_salida || "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{f.hora_llegada || "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{f.horas !== null ? `${f.horas}h` : "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">8h</td>
                    <td className="px-4 py-2.5 text-xs">
                      {f.balance !== null
                        ? <span className={`font-semibold ${f.balance >= 0 ? "text-green-600" : "text-red-600"}`}>{f.balance >= 0 ? "+" : ""}{f.balance}h</span>
                        : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-xs">
                  <td className="px-4 py-3 text-slate-700">TOTAL ({filas.length} días)</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-blue-700">{totalHoras}h</td>
                  <td className="px-4 py-3 text-slate-500">{totalBase}h</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${totalBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {totalBalance >= 0 ? "+" : ""}{totalBalance}h
                    </span>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HorasTrabajadas() {
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("2026");
  const [porEquipo, setPorEquipo] = useState({});

  const calcular = async () => {
    try {
      const [movs, eqs] = await Promise.all([
        api.get("/movimientos-camioneta/"),
        api.get("/equipos/"),
      ]);
      const filtrados = movs.filter(m => fechaMatch(m.fecha, mes, anio));
      const agrupado = {};
      for (const eq of eqs) agrupado[eq.nombre] = [];

      for (const m of filtrados) {
        const eq = eqs.find(e => String(e.id) === String(m.equipo_id)) || m.equipos;
        const nombre = eq?.nombre || "—";
        if (!agrupado[nombre]) agrupado[nombre] = [];
        const h = calcHoras(m.hora_salida?.slice(0, 5), m.hora_llegada?.slice(0, 5));
        agrupado[nombre].push({
          fecha: m.fecha,
          dia: m.fecha,
          hora_salida: m.hora_salida?.slice(0, 5) || null,
          hora_llegada: m.hora_llegada?.slice(0, 5) || null,
          horas: h !== null ? +h.toFixed(1) : null,
          balance: h !== null ? +(h - 8).toFixed(1) : null,
        });
      }
      for (const nombre of Object.keys(agrupado)) {
        agrupado[nombre].sort((a, b) => a.fecha.localeCompare(b.fecha));
      }
      setPorEquipo(agrupado);
    } catch {}
  };

  const equipos = Object.keys(porEquipo);

  return (
    <div className="space-y-6">
      <FiltrosMesAnio mes={mes} setMes={setMes} anio={anio} setAnio={setAnio} onCalcular={calcular} />
      {equipos.length === 0
        ? <p className="text-slate-400 text-sm">Sin datos — cargá movimientos en Personal &gt; Horario Técnico</p>
        : equipos.map(nombre => (
            <TablaEquipoHoras key={nombre} nombre={nombre} filas={porEquipo[nombre]} />
          ))
      }
    </div>
  );
}

// ─── SERVICIOS POR RESPONSABLE ────────────────────────────────────

function ServiciosResponsable() {
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("2026");
  const [responsables, setResponsables] = useState([]);
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [equipos, setEquipos] = useState([]);

  useEffect(() => { api.get("/equipos/").then(setEquipos).catch(() => {}); }, []);

  const buscar = async () => {
    const params = {};
    if (mes) params.mes = mes;
    if (anio) params.anio = anio;
    try {
      const [eq, int] = await Promise.all([
        api.get("/servicios/", { ...params, tipo: "equipos" }),
        api.get("/servicios/", { ...params, tipo: "interior" }),
      ]);
      const todos = [...(eq || []), ...(int || [])];
      const mapa = {};
      for (const s of todos) {
        const resp = s.responsable || equipos.find(e => e.id === s.equipo_id)?.nombre || "Sin asignar";
        if (!mapa[resp]) mapa[resp] = { responsable: resp, total: 0, instalaciones: 0, revisiones: 0, desinstalaciones: 0 };
        mapa[resp].total++;
        if (s.tipo_servicio === "INSTALACION") mapa[resp].instalaciones++;
        else if (s.tipo_servicio === "REVISION") mapa[resp].revisiones++;
        else if (s.tipo_servicio === "DESINSTALACION") mapa[resp].desinstalaciones++;
      }
      setResponsables(Object.values(mapa).sort((a, b) => b.total - a.total));
      setTotalGeneral(todos.length);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <FiltrosMesAnio mes={mes} setMes={setMes} anio={anio} setAnio={setAnio} onCalcular={buscar} label="Buscar" />
      {totalGeneral > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 inline-block">
          <span className="text-xs text-slate-500">Total servicios: </span>
          <span className="text-xl font-bold text-blue-700">{totalGeneral}</span>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
              <th className="text-left px-4 py-3">Responsable</th>
              <th className="text-left px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Instalaciones</th>
              <th className="text-left px-4 py-3">Revisiones</th>
              <th className="text-left px-4 py-3">Desinstalaciones</th>
            </tr>
          </thead>
          <tbody>
            {responsables.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-4 text-slate-400 text-xs">Sin datos</td></tr>
            ) : responsables.map((r, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-4 py-3 font-medium">{r.responsable}</td>
                <td className="px-4 py-3 font-bold text-blue-700">{r.total}</td>
                <td className="px-4 py-3 text-teal-700">{r.instalaciones}</td>
                <td className="px-4 py-3 text-amber-700">{r.revisiones}</td>
                <td className="px-4 py-3 text-violet-700">{r.desinstalaciones}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {responsables.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Servicios por Responsable</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={responsables}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="responsable" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="instalaciones" name="Instalaciones" fill="#0f766e" />
              <Bar dataKey="revisiones" name="Revisiones" fill="#b45309" />
              <Bar dataKey="desinstalaciones" name="Desinstalaciones" fill="#7c3aed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── SERVICIOS POR CLIENTE ────────────────────────────────────────

function ServiciosCliente() {
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("2026");
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [resumen, setResumen] = useState(null);
  const [clientes, setClientes] = useState([]);

  const buscar = async () => {
    const params = {};
    if (mes) params.mes = mes;
    if (anio) params.anio = anio;
    try {
      const [eq, int] = await Promise.all([
        api.get("/servicios/", { ...params, tipo: "equipos" }),
        api.get("/servicios/", { ...params, tipo: "interior" }),
      ]);
      const todos = [...(eq || []), ...(int || [])];
      const filtrados = clienteFiltro
        ? todos.filter(s => s.cliente?.toLowerCase().includes(clienteFiltro.toLowerCase()))
        : todos;

      // Agrupar case-insensitive
      const mapa = {};
      const display = {};
      for (const s of filtrados) {
        const key = normKey(s.cliente);
        if (!display[key]) display[key] = titleCase((s.cliente || "Sin cliente").trim());
        if (!mapa[key]) mapa[key] = { total: 0, instalaciones: 0, revisiones: 0, desinstalaciones: 0 };
        mapa[key].total++;
        if (s.tipo_servicio === "INSTALACION") mapa[key].instalaciones++;
        else if (s.tipo_servicio === "REVISION") mapa[key].revisiones++;
        else if (s.tipo_servicio === "DESINSTALACION") mapa[key].desinstalaciones++;
      }
      const lista = Object.entries(mapa)
        .map(([key, v]) => ({ cliente: display[key], ...v }))
        .sort((a, b) => b.total - a.total);
      setClientes(lista);
      setResumen({
        total: filtrados.length,
        instalaciones: filtrados.filter(s => s.tipo_servicio === "INSTALACION").length,
        revisiones: filtrados.filter(s => s.tipo_servicio === "REVISION").length,
        desinstalaciones: filtrados.filter(s => s.tipo_servicio === "DESINSTALACION").length,
      });
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Cliente (buscar)</label>
          <input type="text" value={clienteFiltro} onChange={e => setClienteFiltro(e.target.value)}
            placeholder="Ej: Serenisima"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-48" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Mes</label>
          <select value={mes} onChange={e => setMes(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos</option>
            {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Año</label>
          <select value={anio} onChange={e => setAnio(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option>2025</option><option>2026</option><option>2027</option>
          </select>
        </div>
        <button onClick={buscar} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
          Buscar
        </button>
      </div>

      {resumen && (
        <div className="flex gap-4 flex-wrap">
          {[
            { label: "Total", value: resumen.total, color: "text-blue-700" },
            { label: "Instalaciones", value: resumen.instalaciones, color: "text-teal-700" },
            { label: "Revisiones", value: resumen.revisiones, color: "text-amber-700" },
            { label: "Desinstalaciones", value: resumen.desinstalaciones, color: "text-violet-700" },
          ].map(card => (
            <div key={card.label} className="bg-white border border-slate-200 rounded-xl px-5 py-4 text-center min-w-24">
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Instalaciones</th>
              <th className="text-left px-4 py-3">Revisiones</th>
              <th className="text-left px-4 py-3">Desinstalaciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-4 text-slate-400 text-xs">Sin datos</td></tr>
            ) : clientes.map((c, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-4 py-3 font-medium">{c.cliente}</td>
                <td className="px-4 py-3 font-bold text-blue-700">{c.total}</td>
                <td className="px-4 py-3 text-teal-700">{c.instalaciones}</td>
                <td className="px-4 py-3 text-amber-700">{c.revisiones}</td>
                <td className="px-4 py-3 text-violet-700">{c.desinstalaciones}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {clientes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-600 mb-3">Servicios por Cliente</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clientes.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="cliente" type="category" width={140} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="total" name="Total" fill="#1e3a8a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-600 mb-3">Distribución por tipo</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Instalaciones", value: resumen?.instalaciones || 0 },
                    { name: "Revisiones", value: resumen?.revisiones || 0 },
                    { name: "Desinstalaciones", value: resumen?.desinstalaciones || 0 },
                  ].filter(d => d.value > 0)}
                  cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                >
                  {[0, 1, 2].map(i => <Cell key={i} fill={["#0f766e", "#b45309", "#7c3aed"][i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── REPORTE CRUZADO ──────────────────────────────────────────────

function ReporteCruzado() {
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("2026");
  const [subTab, setSubTab] = useState("productividad");
  const [tecnicos, setTecnicos] = useState([]);
  const [cruces, setCruces] = useState([]);
  const [horasGR, setHorasGR] = useState([]);
  const [equipos, setEquipos] = useState([]);

  useEffect(() => { api.get("/equipos/").then(setEquipos).catch(() => {}); }, []);

  const calcular = async () => {
    const params = {};
    if (mes) params.mes = mes;
    if (anio) params.anio = anio;
    try {
      if (subTab === "productividad") {
        const [movs, eqs, svcsEq, svcsInt] = await Promise.all([
          api.get("/movimientos-camioneta/"),
          api.get("/equipos/"),
          api.get("/servicios/", { ...params, tipo: "equipos" }),
          api.get("/servicios/", { ...params, tipo: "interior" }),
        ]);
        const filtMovs = movs.filter(m => fechaMatch(m.fecha, mes, anio));
        const todosSvcs = [...(svcsEq || []), ...(svcsInt || [])];

        const horasPorEq = {};
        for (const m of filtMovs) {
          const eq = eqs.find(e => String(e.id) === String(m.equipo_id)) || m.equipos;
          const nombre = eq?.nombre || "—";
          if (!horasPorEq[nombre]) horasPorEq[nombre] = { dias: 0, horas: 0 };
          horasPorEq[nombre].dias++;
          const h = calcHoras(m.hora_salida?.slice(0, 5), m.hora_llegada?.slice(0, 5));
          if (h) horasPorEq[nombre].horas += h;
        }

        const svcPorResp = {};
        for (const s of todosSvcs) {
          const resp = s.responsable || eqs.find(e => e.id === s.equipo_id)?.nombre || "Sin asignar";
          svcPorResp[resp] = (svcPorResp[resp] || 0) + 1;
        }

        const lista = Object.keys(horasPorEq).map(nombre => {
          const h = horasPorEq[nombre];
          const svcs = svcPorResp[nombre] || 0;
          return {
            nombre,
            dias_presentes: h.dias,
            horas_trabajadas: +h.horas.toFixed(1),
            horas_base: h.dias * 8,
            balance: +(h.horas - h.dias * 8).toFixed(1),
            servicios_realizados: svcs,
            servicios_por_dia: h.dias > 0 ? +(svcs / h.dias).toFixed(1) : 0,
          };
        });
        setTecnicos(lista);

      } else if (subTab === "cliente-responsable") {
        const [eq, int] = await Promise.all([
          api.get("/servicios/", { ...params, tipo: "equipos" }),
          api.get("/servicios/", { ...params, tipo: "interior" }),
        ]);
        const todos = [...(eq || []), ...(int || [])];
        const mapa = {};
        const displayCl = {};
        for (const s of todos) {
          const resp = s.responsable || equipos.find(e => e.id === s.equipo_id)?.nombre || "Sin asignar";
          const clKey = normKey(s.cliente);
          if (!displayCl[clKey]) displayCl[clKey] = titleCase((s.cliente || "Sin cliente").trim());
          const key = `${clKey}|${resp}`;
          if (!mapa[key]) mapa[key] = { clienteKey: clKey, responsable: resp, total: 0, INSTALACION: 0, REVISION: 0, DESINSTALACION: 0 };
          mapa[key].total++;
          if (s.tipo_servicio) mapa[key][s.tipo_servicio] = (mapa[key][s.tipo_servicio] || 0) + 1;
        }
        setCruces(Object.values(mapa)
          .map(c => ({ ...c, cliente: displayCl[c.clienteKey] }))
          .sort((a, b) => b.total - a.total));

      } else if (subTab === "horas-gr") {
        const eqs = await api.get("/equipos/");
        const eq2 = eqs.find(e => e.nombre === "Equipo 2");
        if (!eq2) { setHorasGR([]); return; }
        const movs = await api.get("/movimientos-camioneta/", { equipo_id: eq2.id });
        const filtrados = movs.filter(m => fechaMatch(m.fecha, mes, anio));
        const filas = filtrados.map(m => ({
          fecha: m.fecha,
          horas_trabajadas: calcHoras(m.hora_salida?.slice(0, 5), m.hora_llegada?.slice(0, 5)),
          horas_gr: calcHoras(m.llegada_gr_lch?.slice(0, 5), m.salida_gr_lch?.slice(0, 5)),
        })).filter(f => f.horas_trabajadas !== null);
        setHorasGR(filas);
      }
    } catch {}
  };

  const totalHT = horasGR.reduce((a, f) => a + (f.horas_trabajadas || 0), 0);
  const totalGR = horasGR.reduce((a, f) => a + (f.horas_gr || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-2 flex-wrap">
        {[
          { key: "productividad", label: "Productividad" },
          { key: "cliente-responsable", label: "Cliente vs Responsable" },
          { key: "horas-gr", label: "Equipo 2 vs Horas GR/LCH" },
        ].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              subTab === t.key ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <FiltrosMesAnio mes={mes} setMes={setMes} anio={anio} setAnio={setAnio} onCalcular={calcular} />

      {/* Productividad */}
      {subTab === "productividad" && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
                  <th className="text-left px-4 py-3">Equipo</th>
                  <th className="text-left px-4 py-3">Días</th>
                  <th className="text-left px-4 py-3">Servicios</th>
                  <th className="text-left px-4 py-3">Svc/día</th>
                  <th className="text-left px-4 py-3">Horas</th>
                  <th className="text-left px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody>
                {tecnicos.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-4 text-slate-400 text-xs">Sin datos</td></tr>
                ) : tecnicos.map((t, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium">{t.nombre}</td>
                    <td className="px-4 py-3">{t.dias_presentes}</td>
                    <td className="px-4 py-3 font-semibold text-blue-700">{t.servicios_realizados}</td>
                    <td className="px-4 py-3">{t.servicios_por_dia}</td>
                    <td className="px-4 py-3">{t.horas_trabajadas}h</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${t.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {t.balance >= 0 ? "+" : ""}{t.balance}h
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tecnicos.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-600 mb-3">Servicios vs Horas por Equipo</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tecnicos}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="servicios_realizados" name="Servicios" fill="#1e3a8a" />
                  <Bar yAxisId="right" dataKey="horas_trabajadas" name="Horas" fill="#059669" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* Cliente vs Responsable */}
      {subTab === "cliente-responsable" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Responsable</th>
                <th className="text-left px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Instalaciones</th>
                <th className="text-left px-4 py-3">Revisiones</th>
                <th className="text-left px-4 py-3">Desinstalaciones</th>
              </tr>
            </thead>
            <tbody>
              {cruces.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-4 text-slate-400 text-xs">Sin datos</td></tr>
              ) : cruces.map((c, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{c.cliente}</td>
                  <td className="px-4 py-3">{c.responsable}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{c.total}</td>
                  <td className="px-4 py-3 text-teal-700">{c.INSTALACION || 0}</td>
                  <td className="px-4 py-3 text-amber-700">{c.REVISION || 0}</td>
                  <td className="px-4 py-3 text-violet-700">{c.DESINSTALACION || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Horas GR/LCH */}
      {subTab === "horas-gr" && (
        <>
          {horasGR.length > 0 && (
            <div className="flex gap-4 flex-wrap">
              {[
                { label: "Días con registro", value: horasGR.length, color: "text-blue-700" },
                { label: "Horas trabajadas total", value: `${totalHT.toFixed(1)}h`, color: "text-teal-700" },
                { label: "Horas en GR/LCH total", value: `${totalGR.toFixed(1)}h`, color: "text-amber-700" },
                { label: "% tiempo en GR/LCH", value: totalHT > 0 ? `${((totalGR / totalHT) * 100).toFixed(0)}%` : "—", color: "text-violet-700" },
              ].map(card => (
                <div key={card.label} className="bg-white border border-slate-200 rounded-xl px-5 py-4 text-center">
                  <p className="text-xs text-slate-500">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>
          )}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Horas trabajadas</th>
                  <th className="text-left px-4 py-3">Horas en GR/LCH</th>
                  <th className="text-left px-4 py-3">% tiempo en GR/LCH</th>
                </tr>
              </thead>
              <tbody>
                {horasGR.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-4 text-slate-400 text-xs">Sin datos — cargá movimientos de Equipo 2 con Llegada/Salida GR/LCH</td></tr>
                ) : horasGR.map((f, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-xs">{f.fecha}</td>
                    <td className="px-4 py-3 text-xs">{f.horas_trabajadas !== null ? `${f.horas_trabajadas}h` : "—"}</td>
                    <td className="px-4 py-3 text-xs text-amber-700">{f.horas_gr !== null ? `${f.horas_gr}h` : "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {f.horas_trabajadas && f.horas_gr
                        ? `${((f.horas_gr / f.horas_trabajadas) * 100).toFixed(0)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {horasGR.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-600 mb-3">Horas trabajadas vs Horas en GR/LCH</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={horasGR}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="horas_trabajadas" name="Horas trabajadas" fill="#1e3a8a" />
                  <Bar dataKey="horas_gr" name="Horas GR/LCH" fill="#d97706" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────

export default function EstadisticasPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "horas";

  const titulos = {
    horas: "Horas Trabajadas",
    responsable: "Servicios por Responsable",
    clientes: "Servicios por Cliente",
    cruzado: "Reporte Cruzado",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{titulos[tab] || "Estadísticas"}</h1>
      {tab === "horas" && <HorasTrabajadas />}
      {tab === "responsable" && <ServiciosResponsable />}
      {tab === "clientes" && <ServiciosCliente />}
      {tab === "cruzado" && <ReporteCruzado />}
    </div>
  );
}
