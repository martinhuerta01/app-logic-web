"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

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
          <select value={mes} onChange={(e) => setMes(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos</option>
            {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Año</label>
          <select value={anio} onChange={(e) => setAnio(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option>2025</option><option>2026</option><option>2027</option>
          </select>
        </div>
        <button onClick={calcular} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">Calcular</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
              <th className="text-left px-4 py-3">Técnico</th>
              <th className="text-left px-4 py-3">Equipo</th>
              <th className="text-left px-4 py-3">Días presentes</th>
              <th className="text-left px-4 py-3">Horas trabajadas</th>
              <th className="text-left px-4 py-3">Balance</th>
            </tr>
          </thead>
          <tbody>
            {tecnicos.map((t, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-4 py-3">{t.nombre}</td>
                <td className="px-4 py-3">{t.equipo || "—"}</td>
                <td className="px-4 py-3">{t.dias_presentes}</td>
                <td className="px-4 py-3">{t.horas_trabajadas}h</td>
                <td className="px-4 py-3">
                  <span className={t.balance >= 0 ? "text-green-600" : "text-red-600"}>{t.balance >= 0 ? "+" : ""}{t.balance}h</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ServiciosCliente() {
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("2026");
  const [resumen, setResumen] = useState(null);
  const [servicios, setServicios] = useState([]);

  useEffect(() => {
    api.get("/directorio/", { tipo: "cliente" }).then(setClientes).catch(() => {});
  }, []);

  const buscar = async () => {
    const params = {};
    if (clienteId) params.cliente_id = clienteId;
    if (mes) params.mes = mes;
    if (anio) params.anio = anio;
    try {
      const data = await api.get("/estadisticas/servicios-cliente", params);
      setResumen(data.resumen || null);
      setServicios(data.servicios || []);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Cliente</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Mes</label>
          <select value={mes} onChange={(e) => setMes(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos</option>
            {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Año</label>
          <select value={anio} onChange={(e) => setAnio(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option>2025</option><option>2026</option><option>2027</option>
          </select>
        </div>
        <button onClick={buscar} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">Buscar</button>
      </div>

      {resumen && (
        <div className="flex gap-4 flex-wrap">
          {[
            { label: "Total", value: resumen.total, color: "text-blue-700" },
            { label: "Instalaciones", value: resumen.instalaciones, color: "text-teal-700" },
            { label: "Revisiones", value: resumen.revisiones, color: "text-amber-700" },
            { label: "Desinstalaciones", value: resumen.desinstalaciones, color: "text-violet-700" },
          ].map((card) => (
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
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Dispositivo</th>
              <th className="text-left px-4 py-3">Patente</th>
              <th className="text-left px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {servicios.map((s, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-4 py-3">{s.fecha}</td>
                <td className="px-4 py-3">{s.tipo_servicio}</td>
                <td className="px-4 py-3">{s.dispositivo || "—"}</td>
                <td className="px-4 py-3">{s.patente}</td>
                <td className="px-4 py-3">{s.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReporteCruzado() {
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("2026");
  const [tecnicos, setTecnicos] = useState([]);

  const calcular = async () => {
    const params = {};
    if (mes) params.mes = mes;
    if (anio) params.anio = anio;
    try {
      const data = await api.get("/estadisticas/reporte-cruzado", params);
      setTecnicos(data.tecnicos || []);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Mes</label>
          <select value={mes} onChange={(e) => setMes(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos</option>
            {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Año</label>
          <select value={anio} onChange={(e) => setAnio(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option>2025</option><option>2026</option><option>2027</option>
          </select>
        </div>
        <button onClick={calcular} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition">Calcular</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
              <th className="text-left px-4 py-3">Técnico</th>
              <th className="text-left px-4 py-3">Equipo</th>
              <th className="text-left px-4 py-3">Días presentes</th>
              <th className="text-left px-4 py-3">Servicios realizados</th>
              <th className="text-left px-4 py-3">Servicios/día</th>
              <th className="text-left px-4 py-3">Horas trabajadas</th>
              <th className="text-left px-4 py-3">Balance</th>
            </tr>
          </thead>
          <tbody>
            {tecnicos.map((t, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-4 py-3">{t.nombre}</td>
                <td className="px-4 py-3">{t.equipo || "—"}</td>
                <td className="px-4 py-3">{t.dias_presentes}</td>
                <td className="px-4 py-3">{t.servicios_realizados}</td>
                <td className="px-4 py-3">{t.servicios_por_dia}</td>
                <td className="px-4 py-3">{t.horas_trabajadas}h</td>
                <td className="px-4 py-3">
                  <span className={t.balance >= 0 ? "text-green-600" : "text-red-600"}>{t.balance >= 0 ? "+" : ""}{t.balance}h</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EstadisticasPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "horas";

  const titulo = tab === "horas" ? "Horas Trabajadas" : tab === "clientes" ? "Servicios por Cliente" : "Reporte Cruzado";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{titulo}</h1>
      {tab === "horas" && <HorasTrabajadas />}
      {tab === "clientes" && <ServiciosCliente />}
      {tab === "cruzado" && <ReporteCruzado />}
    </div>
  );
}
