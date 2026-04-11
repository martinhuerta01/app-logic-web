"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

// ─── HORAS TRABAJADAS ─────────────────────────────────────────────

function HorasTrabajadas() {
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("2026");
  const [tecnicos, setTecnicos] = useState([]);

  const calcular = async () => {
    const params = {};
    if (mes) params.mes = mes;
    if (anio) params.anio = anio;
    try {
      const data = await api.get("/estadisticas/horas", params);
      setTecnicos(data.tecnicos || []);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Mes</label>
          <select value={mes} onChange={e => setMes(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Mes actual</option>
            {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Año</label>
          <select value={anio} onChange={e => setAnio(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option>2025</option><option>2026</option><option>2027</option>
          </select>
        </div>
        <button onClick={calcular} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
          Calcular
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
              <th className="text-left px-4 py-3">Técnico</th>
              <th className="text-left px-4 py-3">Equipo</th>
              <th className="text-left px-4 py-3">Días presentes</th>
              <th className="text-left px-4 py-3">Horas trabajadas</th>
              <th className="text-left px-4 py-3">Horas base</th>
              <th className="text-left px-4 py-3">Balance</th>
            </tr>
          </thead>
          <tbody>
            {tecnicos.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-4 text-slate-400 text-xs">Sin datos — cargá movimientos en Personal &gt; Horario Técnico</td></tr>
            ) : tecnicos.map((t, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-4 py-3 font-medium">{t.nombre}</td>
                <td className="px-4 py-3">{t.equipo || "—"}</td>
                <td className="px-4 py-3">{t.dias_presentes}</td>
                <td className="px-4 py-3">{t.horas_trabajadas}h</td>
                <td className="px-4 py-3 text-slate-400">{t.horas_base}h</td>
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
    </div>
  );
}

// ─── SERVICIOS POR RESPONSABLE ────────────────────────────────────

function ServiciosResponsable() {
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("2026");
  const [responsables, setResponsables] = useState([]);
  const [totalGeneral, setTotalGeneral] = useState(0);

  const buscar = async () => {
    const params = {};
    if (mes) params.mes = mes;
    if (anio) params.anio = anio;
    try {
      const data = await api.get("/estadisticas/servicios-responsable", params);
      setResponsables(data.responsables || []);
      setTotalGeneral(data.total_general || 0);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Mes</label>
          <select value={mes} onChange={e => setMes(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Mes actual</option>
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

      {totalGeneral > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 inline-block">
          <span className="text-xs text-slate-500">Total servicios realizados: </span>
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
    if (clienteFiltro) params.cliente = clienteFiltro;
    if (mes) params.mes = mes;
    if (anio) params.anio = anio;
    try {
      const data = await api.get("/estadisticas/servicios-cliente", params);
      setResumen(data.resumen || null);
      setClientes(data.clientes || []);
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
            <option value="">Mes actual</option>
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
    </div>
  );
}

// ─── REPORTE CRUZADO ──────────────────────────────────────────────

function ReporteCruzado() {
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("2026");
  const [subTab, setSubTab] = useState("productividad"); // productividad | cliente-responsable
  const [tecnicos, setTecnicos] = useState([]);
  const [cruces, setCruces] = useState([]);

  const calcular = async () => {
    const params = {};
    if (mes) params.mes = mes;
    if (anio) params.anio = anio;
    try {
      if (subTab === "productividad") {
        const data = await api.get("/estadisticas/reporte-cruzado", params);
        setTecnicos(data.tecnicos || []);
      } else {
        const data = await api.get("/estadisticas/cliente-vs-responsable", params);
        setCruces(data.datos || []);
      }
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-2">
        {[
          { key: "productividad", label: "Productividad" },
          { key: "cliente-responsable", label: "Cliente vs Responsable" },
        ].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              subTab === t.key ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Mes</label>
          <select value={mes} onChange={e => setMes(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Mes actual</option>
            {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Año</label>
          <select value={anio} onChange={e => setAnio(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option>2025</option><option>2026</option><option>2027</option>
          </select>
        </div>
        <button onClick={calcular} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
          Calcular
        </button>
      </div>

      {subTab === "productividad" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-xs">
                <th className="text-left px-4 py-3">Técnico</th>
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
                <tr><td colSpan={7} className="px-4 py-4 text-slate-400 text-xs">Sin datos</td></tr>
              ) : tecnicos.map((t, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{t.nombre}</td>
                  <td className="px-4 py-3">{t.equipo || "—"}</td>
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
      )}

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
