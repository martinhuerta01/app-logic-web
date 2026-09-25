"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";

const TH = {
  textAlign: "left", padding: "9px 12px", fontSize: 9.5, fontWeight: 600,
  letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8",
  background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
};
const TD = { padding: "9px 12px", fontSize: 12.5, color: "#334155", borderBottom: "1px solid #f1f5f9" };
const MONO = { fontFamily: "DM Mono, monospace" };

const ordenTipo = (t) => (t === "oficina" ? 0 : t === "cd" ? 1 : 2);

export default function StockPorUbicacion() {
  const [productos,   setProductos]   = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [movs,        setMovs]        = useState([]);
  const [stock,       setStock]       = useState([]);
  const [mapeo,       setMapeo]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  const [sel,   setSel]   = useState("");
  const [ser,   setSer]   = useState(false);
  const [q,     setQ]     = useState("");
  const [todos, setTodos] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [prods, ubics, ms, st, mp] = await Promise.all([
          api.get("/stock/productos/"), api.get("/stock/ubicaciones/"),
          api.get("/stock/movimientos/"), api.get("/stock/actual/"),
          api.get("/mapeo-serenisima/").catch(() => api.get("/stock/mapeo-serenisima/").catch(() => [])),
        ]);
        setProductos(prods || []); setUbicaciones(ubics || []); setMovs(ms || []); setStock(st || []); setMapeo(mp || []);
        const ordenadas = [...(ubics || [])].sort((a, b) => ordenTipo(a.tipo) - ordenTipo(b.tipo) || a.nombre.localeCompare(b.nombre));
        setSel(ordenadas[0]?.id || "");
      } catch {
        setError("No se pudo cargar el stock. Verificá la conexión con el servidor.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ubicOrdenadas = useMemo(
    () => [...ubicaciones].sort((a, b) => ordenTipo(a.tipo) - ordenTipo(b.tipo) || a.nombre.localeCompare(b.nombre)),
    [ubicaciones]
  );
  const actual = ubicaciones.find(u => u.id === sel);
  const esCd = actual?.tipo === "cd";
  const verSer = ser && esCd && mapeo.length > 0;

  const porProducto = useMemo(() => {
    const e = new Map(), s = new Map(), a = new Map();
    for (const m of movs) {
      const c = m.cantidad || 0;
      if (m.destino_id === sel) e.set(m.producto_id, (e.get(m.producto_id) || 0) + c);
      if (m.origen_id === sel)  s.set(m.producto_id, (s.get(m.producto_id) || 0) + c);
    }
    for (const r of stock) if (r.ubicacion_id === sel) a.set(r.producto_id, (a.get(r.producto_id) || 0) + (r.cantidad || 0));
    return { e, s, a };
  }, [movs, stock, sel]);

  const filas = useMemo(() => {
    const dato = (ids) => {
      let e = 0, s = 0, a = 0, tieneFila = false;
      for (const id of ids) {
        e += porProducto.e.get(id) || 0;
        s += porProducto.s.get(id) || 0;
        if (porProducto.a.has(id)) { a += porProducto.a.get(id); tieneFila = true; }
      }
      const act = tieneFila ? a : e - s;
      return { entradas: e, salidas: s, actual: act, desajuste: act !== e - s };
    };
    let lista;
    if (verSer) {
      lista = mapeo.map(m => ({
        key: `s${m.codigo_serenisima}`, codigo: String(m.codigo_serenisima), descripcion: m.descripcion,
        ...dato((m.producto_ids || []).map(String)),
      }));
    } else {
      lista = productos.map(p => ({ key: p.id, codigo: p.codigo, descripcion: p.descripcion, ...dato([p.id]) }));
    }
    const t = q.trim().toLowerCase();
    return lista
      .filter(f => todos || f.entradas || f.salidas || f.actual)
      .filter(f => !t || `${f.codigo} ${f.descripcion}`.toLowerCase().includes(t))
      .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), undefined, { numeric: true }));
  }, [productos, mapeo, porProducto, verSer, q, todos]);

  const negativos = filas.filter(f => f.actual < 0).length;
  const desajustes = filas.filter(f => f.desajuste).length;

  const chip = (activo) => ({
    padding: "4px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
    border: activo ? "1.5px solid #2563eb" : "1.5px solid #e2e8f0",
    background: activo ? "#eff6ff" : "#f8fafc", color: activo ? "#2563eb" : "#64748b",
  });
  const kpi = (label, value, accent) => (
    <div key={label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent }} />
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700, lineHeight: 1, ...MONO, color: "#0f172a" }}>{value}</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Stock por ubicación</h1>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>
          Una sola vista para Oficina, CD y camionetas: entradas, salidas y stock actual
        </p>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#b91c1c" }}>{error}</div>}

      {!loading && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ubicOrdenadas.map(u => <button key={u.id} onClick={() => setSel(u.id)} style={chip(sel === u.id)}>{u.nombre}</button>)}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {kpi("Insumos listados", filas.length, "#0f172a")}
            {kpi("En negativo", negativos, negativos ? "#dc2626" : "#16a34a")}
            {kpi("Con desajuste", desajustes, desajustes ? "#f97316" : "#16a34a")}
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar insumo o código…"
              style={{ fontSize: 12.5, padding: "6px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#f8fafc", minWidth: 240 }} />
            {esCd && mapeo.length > 0 && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#475569", cursor: "pointer" }}>
                <input type="checkbox" checked={ser} onChange={e => setSer(e.target.checked)} style={{ accentColor: "#2563eb" }} />
                Ver con códigos Serenísima
              </label>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#475569", cursor: "pointer" }}>
              <input type="checkbox" checked={todos} onChange={e => setTodos(e.target.checked)} style={{ accentColor: "#2563eb" }} />
              Incluir insumos sin movimiento
            </label>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={TH}>{verSer ? "Cód. Serenísima" : "Código"}</th>
                  <th style={TH}>Insumo</th>
                  <th style={{ ...TH, textAlign: "right" }}>Entradas</th>
                  <th style={{ ...TH, textAlign: "right" }}>Salidas</th>
                  <th style={{ ...TH, textAlign: "right" }}>Actual</th>
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...TD, color: "#94a3b8" }}>No hay stock registrado en {actual?.nombre || "esta ubicación"}.</td></tr>
                ) : filas.map(f => (
                  <tr key={f.key}>
                    <td style={{ ...TD, ...MONO, fontSize: 12, fontWeight: 600 }}>{f.codigo}</td>
                    <td style={TD}>{f.descripcion}</td>
                    <td style={{ ...TD, ...MONO, textAlign: "right", color: f.entradas ? "#16a34a" : "#cbd5e1" }}>{f.entradas ? `+${f.entradas}` : "—"}</td>
                    <td style={{ ...TD, ...MONO, textAlign: "right", color: f.salidas ? "#dc2626" : "#cbd5e1" }}>{f.salidas ? `−${f.salidas}` : "—"}</td>
                    <td style={{ ...TD, ...MONO, textAlign: "right", fontWeight: 700, color: f.actual <= 0 ? "#dc2626" : f.actual <= 3 ? "#ea580c" : "#16a34a" }}>
                      {f.desajuste && (
                        <span title="El stock cargado no coincide con lo que suman los movimientos (stock inicial o ajuste manual). Ver Conciliación."
                          style={{ marginRight: 6, fontSize: 10, color: "#f97316", cursor: "help" }}>≠</span>
                      )}
                      {f.actual}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: 0, fontSize: 11.5, color: "#94a3b8" }}>
            El stock actual es el cargado en el sistema. Si no coincide con entradas − salidas se marca con ≠.
          </p>
        </>
      )}
      {loading && <p style={{ color: "#94a3b8", fontSize: 13 }}>Cargando stock…</p>}
    </div>
  );
}
