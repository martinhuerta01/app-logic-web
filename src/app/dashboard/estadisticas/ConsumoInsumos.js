"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import BotonExportar from "@/components/BotonExportar";
import { descargarTabla } from "@/lib/exportaciones";
import { VISTAS_STOCK } from "@/lib/stockTipos";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const TH = {
  textAlign: "right", padding: "9px 12px", fontSize: 9.5, fontWeight: 600,
  letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8",
  background: "#f8fafc", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap",
};
const TD = { padding: "8px 12px", fontSize: 12.5, color: "#334155", borderBottom: "1px solid #f1f5f9", textAlign: "right", fontFamily: "DM Mono, monospace" };
const CTRL = {
  fontSize: 12.5, padding: "6px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0",
  background: "#f8fafc", color: "#334155", fontFamily: "inherit",
};

// Lo que "se consumió" es lo que se instaló (tickets) o salió sin destino: no cuenta lo que solo se mueve entre ubicaciones.
const esConsumo = (m) => {
  const t = String(m.tipo || "").toUpperCase();
  return t === "INSTALACION" || (t === "SALIDA" && !m.destino_id);
};

// Últimos N meses terminando en el actual: [{ clave: "2026-09", etiqueta: "Septiembre 2026" }, ...]
function ultimosMeses(n) {
  const hoy = new Date();
  const lista = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    lista.push({ clave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, etiqueta: `${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}` });
  }
  return lista;
}

export default function ConsumoInsumos() {
  const [productos,   setProductos]   = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [movs,        setMovs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  const [vista, setVista] = useState("oficina");
  const [cantMeses, setCantMeses] = useState(6);
  const [categoria, setCategoria] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [p, u, m] = await Promise.all([api.get("/stock/productos/"), api.get("/stock/ubicaciones/"), api.get("/stock/movimientos/")]);
        setProductos(p || []); setUbicaciones(u || []); setMovs(m || []);
      } catch {
        setError("No se pudieron cargar los datos de consumo. Verificá la conexión con el servidor.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const idsVista = useMemo(() => {
    if (vista === "serenisima") return new Set(ubicaciones.filter((u) => u.tipo === "cd").map((u) => u.id));
    if (vista === "camioneta1" || vista === "camioneta2") {
      const u = ubicaciones.find((x) => x.nombre?.toLowerCase() === (vista === "camioneta1" ? "camioneta 1" : "camioneta 2"));
      return new Set(u ? [u.id] : []);
    }
    return new Set(ubicaciones.filter((u) => u.tipo === "oficina").map((u) => u.id));
  }, [ubicaciones, vista]);

  const meses = useMemo(() => ultimosMeses(cantMeses), [cantMeses]);
  const categorias = useMemo(() => [...new Set(productos.map((p) => p.categoria).filter(Boolean))].sort(), [productos]);

  const filas = useMemo(() => {
    const porProducto = new Map();
    const claves = new Set(meses.map((m) => m.clave));
    for (const m of movs) {
      if (!esConsumo(m) || !idsVista.has(m.origen_id)) continue;
      const clave = (m.fecha || "").slice(0, 7);
      if (!claves.has(clave)) continue;
      const fila = porProducto.get(m.producto_id) || {};
      fila[clave] = (fila[clave] || 0) + (m.cantidad || 0);
      porProducto.set(m.producto_id, fila);
    }
    const t = q.trim().toLowerCase();
    return productos
      .filter((p) => porProducto.has(p.id))
      .filter((p) => !categoria || p.categoria === categoria)
      .filter((p) => !t || `${p.codigo} ${p.descripcion}`.toLowerCase().includes(t))
      .map((p) => {
        const porMes = porProducto.get(p.id);
        const total = meses.reduce((s, m) => s + (porMes[m.clave] || 0), 0);
        return { p, porMes, total, promedio: total / meses.length };
      })
      .sort((a, b) => b.total - a.total);
  }, [movs, productos, idsVista, meses, categoria, q]);

  const totalUnidades = filas.reduce((s, f) => s + f.total, 0);
  const totalPorMes = meses.map((m) => filas.reduce((s, f) => s + (f.porMes[m.clave] || 0), 0));
  const mesPico = totalPorMes.some((x) => x > 0) ? meses[totalPorMes.indexOf(Math.max(...totalPorMes))].etiqueta : "—";
  const etiquetaVista = VISTAS_STOCK.find((v) => v.key === vista)?.label;

  const chip = (activo) => ({
    padding: "4px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
    border: activo ? "1.5px solid #2563eb" : "1.5px solid #e2e8f0",
    background: activo ? "#eff6ff" : "#f8fafc", color: activo ? "#2563eb" : "#64748b",
  });
  const kpi = (label, value) => (
    <div key={label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 700, lineHeight: 1, fontFamily: "DM Mono, monospace", color: "#0f172a" }}>{value}</p>
    </div>
  );

  const exportar = () => descargarTabla(
    `Consumo_${etiquetaVista.replace(/\s+/g, "_")}_${meses[0].clave}_a_${meses[meses.length - 1].clave}.xlsx`,
    "Consumo de insumos",
    ["Código", "Insumo", "Categoría", ...meses.map((m) => m.etiqueta), "Total", "Promedio por mes"],
    filas.map((f) => [f.p.codigo, f.p.descripcion, f.p.categoria || "", ...meses.map((m) => f.porMes[m.clave] || 0), f.total, Math.round(f.promedio * 10) / 10]),
    [10, 38, 14, ...meses.map(() => 12), 10, 16]
  );

  if (loading) return <p style={{ color: "#94a3b8", fontSize: 13 }}>Cargando consumo…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
        Unidades consumidas por mes: lo que se instaló según los tickets o salió sin destino. Sirve para decidir cuánto pedir.
      </p>
      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#b91c1c" }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {VISTAS_STOCK.map((v) => <button key={v.key} onClick={() => setVista(v.key)} style={chip(vista === v.key)}>{v.label}</button>)}
        <span style={{ width: 1, height: 18, background: "#e2e8f0", margin: "0 4px" }} />
        <select value={cantMeses} onChange={(e) => setCantMeses(Number(e.target.value))} style={CTRL}>
          {[3, 6, 12].map((n) => <option key={n} value={n}>Últimos {n} meses</option>)}
        </select>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={CTRL}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar insumo o código…" style={{ ...CTRL, minWidth: 200 }} />
        <span style={{ marginLeft: "auto" }}>
          <BotonExportar onExportar={exportar}>Exportar a Excel</BotonExportar>
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {kpi("Unidades consumidas", totalUnidades)}
        {kpi("Insumos con consumo", filas.length)}
        {kpi("Mes de mayor consumo", mesPico)}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr>
              <th style={{ ...TH, textAlign: "left" }}>Insumo</th>
              {meses.map((m) => <th key={m.clave} style={TH}>{m.etiqueta}</th>)}
              <th style={TH}>Total</th>
              <th style={TH}>Promedio por mes</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr><td colSpan={meses.length + 3} style={{ ...TD, textAlign: "left", color: "#94a3b8", fontFamily: "inherit" }}>
                No hay consumo registrado en {etiquetaVista} en este período. El consumo aparece al importar tickets de instalación.
              </td></tr>
            ) : filas.map((f) => (
              <tr key={f.p.id}>
                <td style={{ ...TD, textAlign: "left", fontFamily: "inherit" }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontWeight: 600, color: "#0f172a" }}>{f.p.codigo}</span>
                  <span style={{ color: "#64748b" }}> · {f.p.descripcion}</span>
                </td>
                {meses.map((m) => <td key={m.clave} style={{ ...TD, color: f.porMes[m.clave] ? "#334155" : "#cbd5e1" }}>{f.porMes[m.clave] || "—"}</td>)}
                <td style={{ ...TD, fontWeight: 700, color: "#0f172a" }}>{f.total}</td>
                <td style={TD}>{(Math.round(f.promedio * 10) / 10).toString().replace(".", ",")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
