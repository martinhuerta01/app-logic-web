"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { ordenCategoria, ORDEN_CATEGORIAS, parseSeries, fmtFecha, mensajeDeError } from "@/lib/stockNuevo";

const BASE = "/stock-nuevo";
const MONO = { fontFamily: "DM Mono, monospace" };
const hoyISO = () => new Date().toLocaleDateString("en-CA");
const haceDias = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString("en-CA"); };

const tarjeta = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 };
const subtitulo = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b", marginBottom: 8 };
const campo = { width: "100%", minHeight: 44, fontSize: 14.5, fontFamily: "inherit", color: "#0f172a", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 12px" };
const paso = { width: 36, height: 36, border: "none", borderRadius: 8, background: "#4a5463", color: "#ffffff", fontSize: 18, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const TH = { textAlign: "left", padding: "9px 12px", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" };
const TD = { padding: "10px 12px", fontSize: 13, color: "#334155", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" };

export default function Entradas() {
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [oficinaId, setOficinaId] = useState("");
  const [enOficina, setEnOficina] = useState({});
  const [fecha, setFecha] = useState(hoyISO());
  const [proveedor, setProveedor] = useState("");
  const [cantidades, setCantidades] = useState({});
  const [seriesTxt, setSeriesTxt] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const [abiertas, setAbiertas] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const [desde, setDesde] = useState(haceDias(90));
  const [hasta, setHasta] = useState(hoyISO());
  const [buscarHistorial, setBuscarHistorial] = useState("");
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);

  const cargarStockOficina = useCallback(async (id) => {
    if (!id) return;
    try { setEnOficina(await api.get(`${BASE}/stock-por-producto/`, { ubicacion_id: id })); } catch { /* se ve sin el dato */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [prods, provs, ubs] = await Promise.all([
          api.get(`${BASE}/productos/`), api.get(`${BASE}/proveedores/`).catch(() => []), api.get(`${BASE}/ubicaciones/`),
        ]);
        setProductos(prods || []); setProveedores(provs || []);
        const of = (ubs || []).find((u) => u.tipo === "oficina")?.id || "";
        setOficinaId(of);
        cargarStockOficina(of);
      } catch (e) {
        setMensaje({ tipo: "error", texto: mensajeDeError(e) });
      }
    })();
  }, [cargarStockOficina]);

  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);
    try {
      const r = await api.get(`${BASE}/entradas/`, { desde, hasta });
      setHistorial(r?.movimientos || []);
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e) });
    } finally {
      setCargandoHistorial(false);
    }
  }, [desde, hasta]);
  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

  const grupos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const m = new Map();
    productos.filter((p) => !q || (p.codigo || "").toLowerCase().includes(q) || (p.descripcion || "").toLowerCase().includes(q))
      .forEach((p) => {
        const c = ORDEN_CATEGORIAS.includes(p.categoria) ? p.categoria : "Otros";
        m.set(c, [...(m.get(c) || []), p]);
      });
    return [...m.entries()].sort((a, b) => ordenCategoria(a[0]) - ordenCategoria(b[0]));
  }, [productos, busqueda]);

  const poner = (id, n) => setCantidades((c) => {
    const nueva = Math.max(0, (c[id] || 0) + n);
    const copia = { ...c };
    if (nueva === 0) delete copia[id]; else copia[id] = nueva;
    return copia;
  });
  const fijar = (id, valor) => setCantidades((c) => {
    const n = Math.max(0, parseInt(valor, 10) || 0);
    const copia = { ...c };
    if (n === 0) delete copia[id]; else copia[id] = n;
    return copia;
  });

  const elegidos = productos.filter((p) => cantidades[p.id] > 0);
  const totalUnidades = elegidos.reduce((a, p) => a + cantidades[p.id], 0);
  const problemas = elegidos.map((p) => {
    const series = parseSeries(seriesTxt[p.id]);
    return series.length > 0 && series.length !== cantidades[p.id]
      ? { id: p.id, texto: `Cargaste ${series.length} números de serie y la cantidad es ${cantidades[p.id]}` } : null;
  }).filter(Boolean);
  const bloqueado = guardando || elegidos.length === 0 || problemas.length > 0 || !fecha || fecha > hoyISO();

  const confirmar = async () => {
    setGuardando(true); setMensaje(null);
    try {
      const r = await api.post(`${BASE}/entradas/`, {
        fecha, proveedor_id: proveedor || null,
        lineas: elegidos.map((p) => ({ producto_id: p.id, cantidad: cantidades[p.id], series: parseSeries(seriesTxt[p.id]) })),
      });
      const prov = proveedores.find((p) => p.id === proveedor)?.nombre;
      setMensaje({ tipo: "ok", texto: `Entrada registrada: ${r.productos} productos, ${r.unidades} unidades a la Oficina, con fecha ${fmtFecha(fecha)}${prov ? ` (${prov})` : ""}.` });
      setCantidades({}); setSeriesTxt({});
      await Promise.all([cargarStockOficina(oficinaId), cargarHistorial()]);
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e) });
    } finally {
      setGuardando(false);
    }
  };

  // Historial agrupado por entrada (las cargadas antes de este módulo quedan de a una línea)
  const entradas = useMemo(() => {
    const q = buscarHistorial.trim().toLowerCase();
    const m = new Map();
    historial.forEach((mv) => {
      const k = mv.entrada_id || mv.id;
      if (!m.has(k)) m.set(k, { id: k, fecha: mv.fecha, proveedor: mv.proveedores?.nombre || null, cargado_por: mv.cargado_por, lineas: new Map(), unidades: 0 });
      const e = m.get(k);
      const cod = (mv.productos?.codigo || "?").trim();
      const l = e.lineas.get(cod) || { codigo: cod, descripcion: mv.productos?.descripcion || "", cantidad: 0 };
      l.cantidad += mv.cantidad;
      e.lineas.set(cod, l);
      e.unidades += mv.cantidad;
    });
    return [...m.values()]
      .map((e) => ({ ...e, lineas: [...e.lineas.values()] }))
      .filter((e) => !q || (e.proveedor || "").toLowerCase().includes(q)
        || e.lineas.some((l) => l.codigo.toLowerCase().includes(q) || l.descripcion.toLowerCase().includes(q)));
  }, [historial, buscarHistorial]);
  const unidadesHistorial = entradas.reduce((a, e) => a + e.unidades, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c2410c" }}>Stock</div>
        <h1 style={{ margin: "2px 0 0", fontSize: 24, color: "#0f172a" }}>Entradas</h1>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, maxWidth: 780 }}>
          Lo que se compra entra a la Oficina. Elegí la fecha, el proveedor si querés, y la cantidad de cada producto. Desde la Oficina después se manda con Envíos.
        </div>
      </div>

      {mensaje && (
        <div role={mensaje.tipo === "ok" ? "status" : "alert"} style={{
          background: mensaje.tipo === "ok" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${mensaje.tipo === "ok" ? "#bbf7d0" : "#fecaca"}`,
          color: mensaje.tipo === "ok" ? "#166534" : "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: 13,
        }}>{mensaje.texto}</div>
      )}

      <div style={tarjeta}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14, alignItems: "end" }}>
          <div>
            <label htmlFor="entrada-fecha" style={subtitulo}>Fecha de la entrada</label>
            <input id="entrada-fecha" type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} style={campo} />
          </div>
          <div>
            <label htmlFor="entrada-proveedor" style={subtitulo}>Proveedor (opcional)</label>
            <select id="entrada-proveedor" value={proveedor} onChange={(e) => setProveedor(e.target.value)} style={campo}>
              <option value="">Sin proveedor</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <span style={subtitulo}>Entra a</span>
            <div style={{ ...campo, display: "flex", alignItems: "center", background: "#f8fafc", fontWeight: 600 }}>Oficina</div>
          </div>
        </div>
        {proveedores.length === 0 && <div style={{ marginTop: 8, fontSize: 12.5, color: "#64748b" }}>Todavía no hay proveedores cargados: se agregan en Contactos → Proveedores.</div>}
        {fecha && fecha < hoyISO() && <div style={{ marginTop: 8, fontSize: 12.5, color: "#64748b" }}>Estás cargando una entrada con fecha pasada ({fmtFecha(fecha)}).</div>}
      </div>

      <div style={tarjeta}>
        <label htmlFor="buscar-producto" style={subtitulo}>Productos</label>
        <input id="buscar-producto" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o código"
          style={{ width: "100%", maxWidth: 420, fontSize: 14, border: "1px solid #cbd5e1", borderRadius: 8, padding: "9px 12px", marginBottom: 12 }} />
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
          {grupos.map(([cat, lista]) => {
            const cerrada = !abiertas[cat] && !busqueda;
            const enGrupo = lista.filter((p) => cantidades[p.id] > 0).length;
            return (
              <div key={cat}>
                <button type="button" aria-expanded={!cerrada} onClick={() => setAbiertas((a) => ({ ...a, [cat]: !a[cat] }))}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", border: "none", background: "#f1f5f9", padding: "9px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#334155" }}>
                  <span>{cat}</span><span>{enGrupo ? `${enGrupo} elegidos · ` : ""}{lista.length} {cerrada ? "▸" : "▾"}</span>
                </button>
                {!cerrada && lista.map((p) => {
                  const q = cantidades[p.id] || 0;
                  const prob = problemas.find((x) => x.id === p.id);
                  return (
                    <div key={p.id} style={{ padding: "10px 14px", borderTop: "1px solid #f1f5f9", background: q ? "#f8fbff" : "#fff" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
                        <div style={{ minWidth: 200, flex: "1 1 220px" }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.descripcion}</div>
                          <div style={{ ...MONO, fontSize: 11, color: "#94a3b8" }}>{(p.codigo || "").trim()}</div>
                        </div>
                        <div style={{ ...MONO, fontSize: 13, color: "#475569", minWidth: 120 }}>En la Oficina: <b>{enOficina[p.id] || 0}</b></div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <button type="button" style={paso} onClick={() => poner(p.id, -1)} aria-label={`Restar uno a ${p.descripcion}`}>−</button>
                          <input type="number" min="0" aria-label={`Cantidad de ${p.descripcion}`} value={q || ""} placeholder="0" onChange={(e) => fijar(p.id, e.target.value)}
                            style={{ ...MONO, width: 72, textAlign: "center", fontSize: 16, fontWeight: 700, border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 4px" }} />
                          <button type="button" style={paso} onClick={() => poner(p.id, 1)} aria-label={`Sumar uno a ${p.descripcion}`}>+</button>
                          <button type="button" style={{ ...paso, width: 48, fontSize: 13 }} onClick={() => poner(p.id, 10)} aria-label={`Sumar diez a ${p.descripcion}`}>+10</button>
                        </div>
                      </div>
                      {prob && <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: "#b91c1c" }}>{prob.texto}</div>}
                      {q > 0 && p.lleva_serie && (
                        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                          <label htmlFor={`serie-${p.id}`} style={{ fontSize: 12, color: "#475569" }}>
                            Números de serie de {p.descripcion} (opcional; si los cargás, tiene que haber {q})
                          </label>
                          <textarea id={`serie-${p.id}`} rows={2} value={seriesTxt[p.id] || ""} onChange={(e) => setSeriesTxt((s) => ({ ...s, [p.id]: e.target.value }))}
                            placeholder="010402015210, 010402015247, ..." style={{ ...MONO, fontSize: 12.5, border: "1px solid #cbd5e1", borderRadius: 8, padding: 8 }} />
                          <span style={{ fontSize: 12, color: "#64748b" }}>{parseSeries(seriesTxt[p.id]).length} de {q} cargados</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={confirmar} disabled={bloqueado}
          style={{ minHeight: 44, padding: "0 22px", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, color: "#ffffff", background: "#15803d", cursor: "pointer", fontFamily: "inherit", opacity: bloqueado ? 0.5 : 1 }}>
          {guardando ? "Registrando…" : "Confirmar entrada"}
        </button>
        <span style={{ fontSize: 13, color: "#475569" }}>
          {elegidos.length === 0 ? "Todavía no elegiste productos." : `${elegidos.length} productos, ${totalUnidades} unidades a la Oficina`}
        </span>
      </div>

      <section aria-label="Historial de entradas" style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17 }}>Historial de entradas</h2>
            <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>{entradas.length} entradas · {unidadesHistorial} unidades en el período</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ fontSize: 12, color: "#64748b", display: "flex", flexDirection: "column", gap: 4 }}>Desde
              <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} style={{ ...campo, minHeight: 38, width: 160 }} />
            </label>
            <label style={{ fontSize: 12, color: "#64748b", display: "flex", flexDirection: "column", gap: 4 }}>Hasta
              <input type="date" value={hasta} min={desde} max={hoyISO()} onChange={(e) => setHasta(e.target.value)} style={{ ...campo, minHeight: 38, width: 160 }} />
            </label>
            <input type="search" aria-label="Buscar en el historial" value={buscarHistorial} onChange={(e) => setBuscarHistorial(e.target.value)} placeholder="Buscar producto o proveedor"
              style={{ ...campo, minHeight: 38, width: 230 }} />
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr><th style={TH}>Fecha</th><th style={TH}>Proveedor</th><th style={TH}>Productos</th><th style={{ ...TH, textAlign: "right" }}>Unidades</th><th style={TH}>Cargado por</th></tr>
            </thead>
            <tbody>
              {cargandoHistorial ? (
                <tr><td colSpan={5} style={{ ...TD, color: "#64748b" }}>Cargando…</td></tr>
              ) : entradas.length === 0 ? (
                <tr><td colSpan={5} style={{ ...TD, color: "#64748b" }}>No hay entradas en ese período.</td></tr>
              ) : entradas.map((e) => (
                <tr key={e.id}>
                  <td style={{ ...TD, ...MONO, whiteSpace: "nowrap" }}>{fmtFecha(e.fecha)}</td>
                  <td style={TD}>{e.proveedor || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                  <td style={TD}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {e.lineas.map((l) => (
                        <span key={l.codigo} title={l.descripcion} style={{ ...MONO, fontSize: 11.5, fontWeight: 600, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 999, padding: "1px 8px" }}>
                          {l.codigo} ×{l.cantidad}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ ...TD, ...MONO, textAlign: "right", fontWeight: 700 }}>{e.unidades}</td>
                  <td style={{ ...TD, color: "#64748b" }}>{e.cargado_por || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
