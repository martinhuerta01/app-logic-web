"use client";
import { useState, useEffect } from "react";
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

// Normaliza texto para comparación flexible (sin tildes, minúsculas)
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

// Busca un valor en una fila probando varios nombres de columna
const getCol = (row, ...names) => {
  for (const name of names) {
    const key = Object.keys(row).find((k) => norm(k) === norm(name));
    if (key !== undefined && row[key] !== "" && row[key] !== undefined)
      return row[key];
  }
  return "";
};

const COLUMNAS_INFO = {
  servicios: "Fecha | Responsable | Hora | Cliente | Tipo | Dispositivo | Patente | Localidad | Estado | Observaciones",
  movimientos: "Fecha | Equipo | Hora Salida | Hora Llegada | Punto Inicio | Punto Fin",
  stock: "Codigo | Insumo | Cant. Inicial | Entradas | Salidas | Stock Actual",
  "stock-entradas": "Codigo | Insumo | Cantidad | Fecha",
  "stock-salidas": "Ubicacion | Codigo | Insumo | Cantidad | Fecha",
};

function Importar() {
  const [tipo, setTipo] = useState("servicios");
  const [preview, setPreview] = useState([]);
  const [columnas, setColumnas] = useState([]);
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [errDetalle, setErrDetalle] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [ubicacionDestino, setUbicacionDestino] = useState("");

  // Carga ubicaciones para los tipos de stock
  useEffect(() => {
    api.get("/stock/ubicaciones/").then(setUbicaciones).catch(() => {});
  }, []);

  const handleTipo = (e) => {
    setTipo(e.target.value);
    setPreview([]);
    setColumnas([]);
    setFile(null);
    setMsg("");
    setErrDetalle([]);
    setUbicacionDestino("");
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setMsg("");
    setErrDetalle([]);
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
    setErrDetalle([]);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

      let count = 0;
      let saltados = 0;
      const errores = [];
      const hoy = new Date().toISOString().split("T")[0];

      try {
        // ── STOCK ACTUAL ──────────────────────────────────────────
        if (tipo === "stock") {
          const ubicOrigen = ubicaciones.find(
            (u) =>
              (ubicacionDestino && norm(u.nombre) === norm(ubicacionDestino)) ||
              (!ubicacionDestino && (norm(u.nombre) === "oficina" || u.tipo === "oficina"))
          );
          if (!ubicOrigen) {
            setMsg("Error: seleccioná la ubicación destino antes de importar");
            setLoading(false);
            return;
          }

          const productos = await api.get("/stock/productos/");

          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const codigoFila = String(
              getCol(row, "Código", "Codigo", "codigo", "CÓDIGO", "CODIGO") || ""
            ).trim();

            if (!codigoFila) {
              saltados++;
              continue;
            }

            const prod = productos.find(
              (p) => norm(p.codigo) === norm(codigoFila)
            );
            if (!prod) {
              errores.push(`Fila ${i + 2}: código "${codigoFila}" no existe en la base de datos`);
              continue;
            }

            const stockRaw = getCol(
              row,
              "Stock Actual",
              "Stock actual",
              "stock actual",
              "Cantidad",
              "cantidad",
              "Actual",
              "actual",
              "Stock"
            );
            const stockVal = parseFloat(String(stockRaw).replace(",", "."));

            // Si el stock es 0 o negativo, lo contamos como procesado sin llamar la API
            // (aparecerá en la vista con stock 0 de todas formas)
            if (isNaN(stockVal) || stockVal <= 0) {
              count++;
              continue;
            }

            try {
              await api.post("/stock/entradas/", {
                producto_id: prod.id,
                ubicacion_id: ubicOrigen.id,
                cantidad: Math.round(stockVal),
                fecha: hoy,
                observaciones: "Importación stock actual",
              });
              count++;
            } catch (e) {
              errores.push(`Fila ${i + 2} (${codigoFila}): ${e.message}`);
            }
          }

        // ── STOCK ENTRADAS ────────────────────────────────────────
        } else if (tipo === "stock-entradas") {
          const ubicOrigen = ubicaciones.find(
            (u) =>
              (ubicacionDestino && norm(u.nombre) === norm(ubicacionDestino)) ||
              (!ubicacionDestino && (norm(u.nombre) === "oficina" || u.tipo === "oficina"))
          );
          if (!ubicOrigen) {
            setMsg("Error: seleccioná la ubicación destino antes de importar");
            setLoading(false);
            return;
          }

          const productos = await api.get("/stock/productos/");

          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const codigoFila = String(
              getCol(row, "Código", "Codigo", "codigo") || ""
            ).trim();
            const cantidadRaw = getCol(row, "Cantidad", "cantidad", "Cant", "cant");
            const cantidad = parseInt(String(cantidadRaw).replace(",", "."));
            const fecha =
              String(getCol(row, "Fecha", "fecha") || hoy).trim() || hoy;

            if (!codigoFila) { saltados++; continue; }
            const prod = productos.find((p) => norm(p.codigo) === norm(codigoFila));
            if (!prod) {
              errores.push(`Fila ${i + 2}: código "${codigoFila}" no encontrado`);
              continue;
            }
            if (isNaN(cantidad) || cantidad <= 0) {
              errores.push(`Fila ${i + 2} (${codigoFila}): cantidad inválida`);
              continue;
            }

            try {
              await api.post("/stock/entradas/", {
                producto_id: prod.id,
                ubicacion_id: ubicOrigen.id,
                cantidad,
                fecha,
                observaciones: "Importación entradas",
              });
              count++;
            } catch (e) {
              errores.push(`Fila ${i + 2} (${codigoFila}): ${e.message}`);
            }
          }

        // ── STOCK SALIDAS ─────────────────────────────────────────
        } else if (tipo === "stock-salidas") {
          const oficina = ubicaciones.find(
            (u) => norm(u.nombre) === "oficina" || u.tipo === "oficina"
          );
          if (!oficina) {
            setMsg("Error: no se encontró la ubicación Oficina en la base de datos");
            setLoading(false);
            return;
          }

          const productos = await api.get("/stock/productos/");

          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const codigoFila = String(
              getCol(row, "Código", "Codigo", "codigo") || ""
            ).trim();
            const ubicNombre = String(
              getCol(row, "Ubicacion", "Ubicación", "ubicacion", "Destino", "destino") || ""
            ).trim();
            const cantidadRaw = getCol(row, "Cantidad", "cantidad", "Cant");
            const cantidad = parseInt(String(cantidadRaw).replace(",", "."));
            const fecha =
              String(getCol(row, "Fecha", "fecha") || hoy).trim() || hoy;

            if (!codigoFila) { saltados++; continue; }

            const prod = productos.find((p) => norm(p.codigo) === norm(codigoFila));
            if (!prod) {
              errores.push(`Fila ${i + 2}: código "${codigoFila}" no encontrado`);
              continue;
            }
            const destino = ubicaciones.find((u) => norm(u.nombre) === norm(ubicNombre));
            if (!destino) {
              errores.push(`Fila ${i + 2}: ubicación "${ubicNombre}" no encontrada`);
              continue;
            }
            if (isNaN(cantidad) || cantidad <= 0) {
              errores.push(`Fila ${i + 2} (${codigoFila}): cantidad inválida`);
              continue;
            }

            try {
              await api.post("/stock/transferencias/", {
                producto_id: prod.id,
                ubicacion_origen_id: oficina.id,
                ubicacion_destino_id: destino.id,
                cantidad,
                fecha,
              });
              count++;
            } catch (e) {
              errores.push(`Fila ${i + 2} (${codigoFila}): ${e.message}`);
            }
          }

        // ── SERVICIOS ─────────────────────────────────────────────
        } else if (tipo === "servicios") {
          for (const row of data) {
            try {
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
            } catch (e) {
              errores.push(e.message);
            }
          }

        // ── MOVIMIENTOS ───────────────────────────────────────────
        } else if (tipo === "movimientos") {
          const equipos = await api.get("/equipos/");
          for (const row of data) {
            try {
              const eq = equipos.find(
                (e) => norm(e.nombre) === norm(row["Equipo"] || row["equipo"] || "")
              );
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
            } catch (e) {
              errores.push(e.message);
            }
          }
        }
      } catch (e) {
        setMsg(`Error inesperado: ${e.message}`);
        setLoading(false);
        return;
      }

      let msgFinal = `✓ ${count} registros importados`;
      if (saltados > 0) msgFinal += ` · ${saltados} filas vacías omitidas`;
      if (errores.length > 0) msgFinal += ` · ${errores.length} con error`;
      setMsg(msgFinal);
      setErrDetalle(errores.slice(0, 10));
      setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  const esStock = tipo === "stock" || tipo === "stock-entradas" || tipo === "stock-salidas";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Tipo de datos</label>
          <select value={tipo} onChange={handleTipo}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="servicios">Servicios</option>
            <option value="movimientos">Movimientos camioneta</option>
            <option value="stock">Stock Actual (Oficina)</option>
            <option value="stock-entradas">Stock — Entradas</option>
            <option value="stock-salidas">Stock — Salidas</option>
          </select>
        </div>

        {esStock && (
          <div>
            <label className="block text-xs text-slate-500 mb-1">Ubicación destino</label>
            <select
              value={ubicacionDestino}
              onChange={(e) => setUbicacionDestino(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Oficina (por defecto)</option>
              {ubicaciones
                .filter((u) => u.tipo === "oficina" || u.tipo === "cd" || u.tipo === "camioneta" || u.tipo === "tecnico")
                .map((u) => (
                  <option key={u.id} value={u.nombre}>{u.nombre}</option>
                ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-500 mb-1">Archivo Excel</label>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile}
            className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
        <p className="font-semibold mb-1">Columnas esperadas:</p>
        <p>{COLUMNAS_INFO[tipo]}</p>
      </div>

      {preview.length > 0 && (
        <div className="space-y-3">
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
        <p className={`text-sm font-medium ${msg.includes("Error") ? "text-red-600" : "text-green-600"}`}>{msg}</p>
      )}

      {errDetalle.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 space-y-1">
          <p className="font-semibold">Detalle de errores (primeros {errDetalle.length}):</p>
          {errDetalle.map((e, i) => <p key={i}>• {e}</p>)}
        </div>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────

export default function ExportarImportarPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Exportar</h1>
      <Exportar />
    </div>
  );
}
