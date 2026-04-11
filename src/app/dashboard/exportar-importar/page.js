"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import * as XLSX from "xlsx";

// ─── EXPORTAR ─────────────────────────────────────────────────────

function Exportar() {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const descargar = (datos, nombre, columnas) => {
    if (!datos || datos.length === 0) {
      setMsg("No hay datos para exportar");
      return;
    }
    // Filtrar solo las columnas deseadas
    const filas = datos.map(row => {
      const obj = {};
      columnas.forEach(c => { obj[c.label] = c.get ? c.get(row) : (row[c.key] || ""); });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, `${nombre}.xlsx`);
    setMsg(`✓ ${nombre}.xlsx descargado`);
  };

  const exportarServicios = async (mes, anio) => {
    setLoading(true);
    try {
      const data = await api.get("/servicios/", { mes, anio });
      descargar(data, `Servicios_${mes}_${anio}`, [
        { label: "Fecha", key: "fecha" },
        { label: "Responsable", key: "responsable" },
        { label: "Hora", key: "hora_programada" },
        { label: "Cliente", key: "cliente" },
        { label: "Tipo", key: "tipo_servicio" },
        { label: "Dispositivo", key: "dispositivo" },
        { label: "Patente", key: "patente" },
        { label: "Localidad", key: "localidad" },
        { label: "Estado", key: "estado" },
        { label: "Observaciones", key: "observaciones" },
      ]);
    } catch { setMsg("Error al exportar"); }
    setLoading(false);
  };

  const exportarStock = async () => {
    setLoading(true);
    try {
      const data = await api.get("/stock/actual/");
      descargar(data, "Stock_Actual", [
        { label: "Código", get: r => r.productos?.codigo || "" },
        { label: "Descripción", get: r => r.productos?.descripcion || "" },
        { label: "Categoría", get: r => r.productos?.categoria || "" },
        { label: "Ubicación", get: r => r.ubicaciones?.nombre || "" },
        { label: "Cantidad", key: "cantidad" },
      ]);
    } catch { setMsg("Error al exportar"); }
    setLoading(false);
  };

  const exportarHorarios = async (mes, anio) => {
    setLoading(true);
    try {
      const data = await api.get("/movimientos-camioneta/");
      descargar(data, `Horarios_${mes}_${anio}`, [
        { label: "Fecha", key: "fecha" },
        { label: "Equipo", get: r => r.equipos?.nombre || "" },
        { label: "Patente", get: r => r.equipos?.patente || "" },
        { label: "Hora Salida", key: "hora_salida" },
        { label: "Hora Llegada", key: "hora_llegada" },
        { label: "Punto Inicio", key: "punto_inicio" },
        { label: "Punto Fin", key: "punto_fin" },
        { label: "Cargado por", key: "cargado_por" },
      ]);
    } catch { setMsg("Error al exportar"); }
    setLoading(false);
  };

  const exportarProductividad = async (mes, anio) => {
    setLoading(true);
    try {
      const data = await api.get("/estadisticas/reporte-cruzado", { mes, anio });
      descargar(data.tecnicos || [], `Productividad_${mes}_${anio}`, [
        { label: "Técnico", key: "nombre" },
        { label: "Equipo", key: "equipo" },
        { label: "Días", key: "dias_presentes" },
        { label: "Servicios", key: "servicios_realizados" },
        { label: "Svc/día", key: "servicios_por_dia" },
        { label: "Horas", key: "horas_trabajadas" },
        { label: "Balance", key: "balance" },
      ]);
    } catch { setMsg("Error al exportar"); }
    setLoading(false);
  };

  const [expMes, setExpMes] = useState(new Date().getMonth() + 1);
  const [expAnio, setExpAnio] = useState(2026);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 mb-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Mes</label>
          <select value={expMes} onChange={e => setExpMes(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Año</label>
          <select value={expAnio} onChange={e => setExpAnio(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option>2025</option><option>2026</option><option>2027</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button onClick={() => exportarServicios(expMes, expAnio)} disabled={loading}
          className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-blue-400 hover:shadow transition">
          <p className="font-semibold text-slate-700">📋 Servicios / Historial</p>
          <p className="text-xs text-slate-400 mt-1">Todos los servicios del mes seleccionado</p>
        </button>
        <button onClick={exportarStock} disabled={loading}
          className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-blue-400 hover:shadow transition">
          <p className="font-semibold text-slate-700">📦 Stock Actual</p>
          <p className="text-xs text-slate-400 mt-1">Stock de todas las ubicaciones</p>
        </button>
        <button onClick={() => exportarHorarios(expMes, expAnio)} disabled={loading}
          className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-blue-400 hover:shadow transition">
          <p className="font-semibold text-slate-700">👷 Horarios Técnicos</p>
          <p className="text-xs text-slate-400 mt-1">Movimientos de camioneta del mes</p>
        </button>
        <button onClick={() => exportarProductividad(expMes, expAnio)} disabled={loading}
          className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-blue-400 hover:shadow transition">
          <p className="font-semibold text-slate-700">📊 Productividad</p>
          <p className="text-xs text-slate-400 mt-1">Reporte cruzado del mes</p>
        </button>
      </div>

      {msg && (
        <p className={`text-sm font-medium ${msg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{msg}</p>
      )}
    </div>
  );
}

// ─── IMPORTAR ─────────────────────────────────────────────────────

function Importar() {
  const [tipo, setTipo] = useState("servicios");
  const [preview, setPreview] = useState([]);
  const [columnas, setColumnas] = useState([]);
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setMsg("");
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (data.length > 0) {
        setColumnas(Object.keys(data[0]));
        setPreview(data.slice(0, 5));
      }
    };
    reader.readAsBinaryString(f);
  };

  const importar = async () => {
    if (!file) return;
    setLoading(true);
    setMsg("");
    try {
      // Pre-cargar catálogos si es stock
      let productos = [];
      let ubicaciones = [];
      let equipos = [];
      if (tipo === "stock") {
        [productos, ubicaciones] = await Promise.all([
          api.get("/stock/productos/"),
          api.get("/stock/ubicaciones/"),
        ]);
      }

      const reader = new FileReader();
      reader.onload = async (evt) => {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

        let count = 0;
        let errores = 0;
        const hoy = new Date().toISOString().split("T")[0];

        for (const row of data) {
          try {
            if (tipo === "servicios") {
              await api.post("/servicios/", {
                fecha: row["Fecha"] || row["fecha"] || null,
                responsable: row["Responsable"] || row["responsable"] || null,
                hora_programada: row["Hora"] || row["hora_programada"] || null,
                cliente: row["Cliente"] || row["cliente"] || "",
                tipo_servicio: row["Tipo"] || row["tipo_servicio"] || "INSTALACION",
                dispositivo: row["Dispositivo"] || row["dispositivo"] || null,
                patente: row["Patente"] || row["patente"] || "",
                localidad: row["Localidad"] || row["localidad"] || null,
                estado: row["Estado"] || row["estado"] || "PENDIENTE",
                observaciones: row["Observaciones"] || row["observaciones"] || null,
              });
              count++;
            } else if (tipo === "movimientos") {
              if (!equipos.length) equipos = await api.get("/equipos/");
              const eq = equipos.find(e => e.nombre === (row["Equipo"] || row["equipo"]));
              await api.post("/movimientos-camioneta/", {
                equipo_id: eq?.id || null,
                fecha: row["Fecha"] || row["fecha"] || null,
                hora_salida: row["Hora Salida"] || row["hora_salida"] || null,
                hora_llegada: row["Hora Llegada"] || row["hora_llegada"] || null,
                punto_inicio: row["Punto Inicio"] || row["punto_inicio"] || null,
                punto_fin: row["Punto Fin"] || row["punto_fin"] || null,
                tecnicos: [],
              });
              count++;
            } else if (tipo === "stock") {
              const codigoFila = String(row["Código"] || row["Codigo"] || row["codigo"] || "").trim();
              const ubicFila = String(row["Ubicación"] || row["Ubicacion"] || row["ubicacion"] || "").trim();
              const cantidad = parseInt(row["Cantidad"] || row["cantidad"] || "0");
              const prod = productos.find(
                p => p.codigo?.toLowerCase() === codigoFila.toLowerCase()
              );
              const ubic = ubicaciones.find(
                u => u.nombre?.toLowerCase() === ubicFila.toLowerCase()
              );
              if (!prod || !ubic || isNaN(cantidad) || cantidad <= 0) {
                errores++;
                continue;
              }
              await api.post("/stock/entradas/", {
                producto_id: prod.id,
                ubicacion_id: ubic.id,
                cantidad,
                fecha: row["Fecha"] || row["fecha"] || hoy,
                observaciones: "Importación masiva",
              });
              count++;
            }
          } catch { errores++; }
        }
        const msgExtra = errores > 0 ? ` (${errores} filas con error)` : "";
        setMsg(`✓ ${count} registros importados${msgExtra}`);
        setLoading(false);
      };
      reader.readAsBinaryString(file);
    } catch {
      setMsg("Error al importar");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Tipo de datos</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="servicios">Servicios</option>
            <option value="movimientos">Movimientos camioneta</option>
            <option value="stock">Stock actual</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Archivo Excel</label>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile}
            className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        </div>
      </div>

      {tipo === "servicios" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          <p className="font-semibold mb-1">Columnas esperadas para Servicios:</p>
          <p>Fecha | Responsable | Hora | Cliente | Tipo | Dispositivo | Patente | Localidad | Estado | Observaciones</p>
        </div>
      )}
      {tipo === "movimientos" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          <p className="font-semibold mb-1">Columnas esperadas para Movimientos:</p>
          <p>Fecha | Equipo | Hora Salida | Hora Llegada | Punto Inicio | Punto Fin</p>
        </div>
      )}
      {tipo === "stock" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          <p className="font-semibold mb-1">Columnas esperadas para Stock:</p>
          <p>Código | Ubicación | Cantidad | Fecha (opcional)</p>
          <p className="mt-1 text-blue-500">El Código debe coincidir exactamente con el código del producto (ej: D03, A13). La Ubicación debe coincidir con el nombre en Configuración (ej: Oficina, CD General Rodriguez).</p>
        </div>
      )}

      {preview.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Vista previa (primeras 5 filas):</p>
          <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {columnas.map(c => <th key={c} className="text-left px-3 py-2 text-slate-600">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {columnas.map(c => <td key={c} className="px-3 py-1.5">{String(row[c]).slice(0, 40)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={importar} disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition disabled:opacity-50">
            {loading ? "Importando..." : "Importar datos"}
          </button>
        </div>
      )}

      {msg && (
        <p className={`text-sm font-medium ${msg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{msg}</p>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────

export default function ExportarImportarPage() {
  const [tab, setTab] = useState("exportar");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Exportar / Importar</h1>

      <div className="flex gap-2">
        {[
          { key: "exportar", label: "Exportar" },
          { key: "importar", label: "Importar" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "exportar" && <Exportar />}
      {tab === "importar" && <Importar />}
    </div>
  );
}
