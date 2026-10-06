"use client";
import { Suspense, useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  ordenarUbicaciones, agruparPorSegmento, ordenCategoria, ORDEN_CATEGORIAS, parseSeries, fmtFecha, hace, mensajeDeError,
} from "@/lib/stockNuevo";

const MONO = { fontFamily: "DM Mono, monospace" };
const BASE = "/stock-nuevo";
const TH = {
  textAlign: "left", padding: "9px 12px", fontSize: 9.5, fontWeight: 600,
  letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8",
  background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
};
const TD = { padding: "10px 12px", fontSize: 13, color: "#334155", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" };
const NUM = { ...MONO, textAlign: "right", fontSize: 13.5 };

const boton = (fondo) => ({
  minHeight: 38, padding: "0 16px", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 700,
  color: "#ffffff", background: fondo, cursor: "pointer", fontFamily: "inherit", textDecoration: "none",
  display: "inline-flex", alignItems: "center",
});

const MOTIVOS = ["Falta registrar un envío", "Se usó sin ticket", "Equipo reutilizado", "Error de carga", "Conteo inicial"];

function Tarjeta({ titulo, valor, sub, color }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px" }}>
      <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>{titulo}</div>
      <div style={{ ...MONO, fontSize: 22, fontWeight: 700, color: color || "#0f172a", marginTop: 6 }}>{valor}</div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function Pantalla() {
  const parametros = useSearchParams();
  const [ubicaciones, setUbicaciones] = useState([]);
  const [productos, setProductos] = useState([]);
  const [sel, setSel] = useState(parametros.get("ubicacion") || "");
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [cerradas, setCerradas] = useState({});
  const [segmentosCerrados, setSegmentosCerrados] = useState({});
  const [seriesAbiertas, setSeriesAbiertas] = useState({});
  const [listasSeries, setListasSeries] = useState({});

  const [conteoAbierto, setConteoAbierto] = useState(false);
  const [contados, setContados] = useState({});
  const [motivos, setMotivos] = useState({});
  const [seriesConteo, setSeriesConteo] = useState({});
  const [pegado, setPegado] = useState("");
  const [agregar, setAgregar] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargarUbicaciones = useCallback(async () => {
    const [ubs, prods] = await Promise.all([api.get(`${BASE}/ubicaciones/`), api.get(`${BASE}/productos/`)]);
    const ordenadas = ordenarUbicaciones(ubs || []);
    setUbicaciones(ordenadas);
    setProductos(prods || []);
    setSel((actual) => actual || ordenadas[0]?.id || "");
  }, []);

  useEffect(() => {
    cargarUbicaciones().catch((e) => setError(mensajeDeError(e)));
  }, [cargarUbicaciones]);

  const cargarStock = useCallback(async (id) => {
    if (!id) return;
    setCargando(true); setError("");
    try {
      setDatos(await api.get(`${BASE}/ubicaciones/${id}/stock/`));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarStock(sel);
    setConteoAbierto(false); setSeriesAbiertas({}); setListasSeries({});
  }, [sel, cargarStock]);

  const segmentos = useMemo(() => agruparPorSegmento(ubicaciones), [ubicaciones]);
  const ubicacion = ubicaciones.find((u) => u.id === sel);
  const esOficina = ubicacion?.tipo === "oficina";
  const filas = datos?.filas || [];

  const grupos = useMemo(() => {
    const m = new Map();
    filas.forEach((f) => {
      const c = ORDEN_CATEGORIAS.includes(f.categoria) ? f.categoria : "Otros";
      m.set(c, [...(m.get(c) || []), f]);
    });
    return [...m.entries()].sort((a, b) => ordenCategoria(a[0]) - ordenCategoria(b[0]));
  }, [filas]);

  const negativos = filas.filter((f) => f.stock < 0).length;
  const conteo = datos?.conteo;

  const verSeries = async (f) => {
    const abierta = !seriesAbiertas[f.producto_id];
    setSeriesAbiertas((s) => ({ ...s, [f.producto_id]: abierta }));
    if (abierta && !listasSeries[f.producto_id]) {
      try {
        const lista = await api.get(`${BASE}/ubicaciones/${sel}/series/`, { producto_id: f.producto_id });
        setListasSeries((l) => ({ ...l, [f.producto_id]: lista }));
      } catch (e) { setError(mensajeDeError(e)); }
    }
  };

  // ── Conteo ──
  const filasConteo = useMemo(() => {
    const ids = new Set(filas.map((f) => f.producto_id));
    const extra = Object.keys(contados).filter((id) => !ids.has(id));
    const base = filas.map((f) => ({ id: f.producto_id, codigo: f.codigo, descripcion: f.descripcion, categoria: f.categoria, sistema: f.stock, lleva_serie: f.lleva_serie }));
    const agregadas = extra.map((id) => {
      const p = productos.find((x) => x.id === id);
      return { id, codigo: (p?.codigo || "").trim(), descripcion: p?.descripcion || "", categoria: p?.categoria, sistema: 0, lleva_serie: !!p?.lleva_serie };
    });
    return [...base, ...agregadas].sort((a, b) => ordenCategoria(a.categoria) - ordenCategoria(b.categoria) || a.codigo.localeCompare(b.codigo));
  }, [filas, contados, productos]);

  const abrirConteo = () => {
    setContados({}); setMotivos({}); setSeriesConteo({}); setPegado(""); setMensaje(null);
    setConteoAbierto(true);
  };

  const aplicarPegado = () => {
    const nuevos = { ...contados }, nuevasSeries = { ...seriesConteo }, sinCodigo = [];
    pegado.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((linea) => {
      const partes = linea.split(/[;\t,]+|\s+/).filter(Boolean);
      const codigo = (partes[0] || "").toUpperCase();
      const cantidad = parseInt(partes[1], 10);
      const prod = productos.find((p) => (p.codigo || "").trim().toUpperCase() === codigo);
      if (!prod || Number.isNaN(cantidad)) { sinCodigo.push(linea); return; }
      nuevos[prod.id] = String(cantidad);
      if (partes.length > 2) nuevasSeries[prod.id] = partes.slice(2).join("\n");
    });
    setContados(nuevos); setSeriesConteo(nuevasSeries);
    setMensaje(sinCodigo.length
      ? { tipo: "error", texto: `No se entendieron ${sinCodigo.length} líneas (revisá código y cantidad): ${sinCodigo.slice(0, 3).join(" | ")}` }
      : { tipo: "ok", texto: "Cantidades cargadas. Revisá las diferencias antes de confirmar." });
    setPegado("");
  };

  const lineasConContado = filasConteo.filter((f) => contados[f.id] !== undefined && contados[f.id] !== "");

  const confirmarConteo = async () => {
    if (lineasConContado.length === 0) { setMensaje({ tipo: "error", texto: "Cargá al menos una cantidad contada." }); return; }
    setGuardando(true); setMensaje(null);
    try {
      const r = await api.post(`${BASE}/conteos/`, {
        ubicacion_id: sel,
        lineas: lineasConContado.map((f) => ({
          producto_id: f.id, contado: parseInt(contados[f.id], 10), motivo: motivos[f.id] || null,
          series: parseSeries(seriesConteo[f.id]),
        })),
      });
      setMensaje({ tipo: "ok", texto: `Conteo guardado: ${r.productos} productos, ${r.con_diferencia} con diferencia.` });
      setConteoAbierto(false);
      await Promise.all([cargarStock(sel), cargarUbicaciones()]);
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e) });
    } finally {
      setGuardando(false);
    }
  };

  const productosParaAgregar = productos.filter((p) => !filasConteo.some((f) => f.id === p.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c2410c" }}>Stock nuevo</div>
        <h1 style={{ margin: "2px 0 0", fontSize: 24, color: "#0f172a" }}>Qué tiene cada lugar</h1>
      </div>

      {error && <div role="alert" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>{error}</div>}
      {mensaje && (
        <div role="status" style={{
          background: mensaje.tipo === "ok" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${mensaje.tipo === "ok" ? "#bbf7d0" : "#fecaca"}`,
          color: mensaje.tipo === "ok" ? "#166534" : "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: 13,
        }}>{mensaje.texto}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 250px) 1fr", gap: 18, alignItems: "start" }}>
        <nav aria-label="Ubicaciones" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
          {segmentos.map(([segmento, lista]) => {
            const cerrado = !!segmentosCerrados[segmento.clave] && !lista.some((u) => u.id === sel);
            const sinExplicar = lista.reduce((a, u) => a + u.negativos, 0);
            return (
              <div key={segmento.clave} style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 6 }}>
                <button type="button" aria-expanded={!cerrado} onClick={() => setSegmentosCerrados((c) => ({ ...c, [segmento.clave]: !c[segmento.clave] }))}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", padding: "6px 8px", color: "#475569" }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{segmento.nombre}</span>
                  <span style={{ fontSize: 11, display: "flex", gap: 6, alignItems: "center" }}>
                    {cerrado && sinExplicar > 0 && <span style={{ ...MONO, fontWeight: 700, background: "#b91c1c", color: "#fff", borderRadius: 999, padding: "0 7px" }}>{sinExplicar}</span>}
                    {cerrado ? "▸" : "▾"}
                  </span>
                </button>
                {!cerrado && lista.map((u) => (
                  <button key={u.id} type="button" onClick={() => setSel(u.id)} aria-current={u.id === sel}
                    style={{
                      textAlign: "left", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit",
                      background: u.id === sel ? "#1d4e89" : "transparent", color: u.id === sel ? "#ffffff" : "#1e293b",
                      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                    }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{u.nombre.trim()}</span>
                    {u.negativos > 0 && (
                      <span title="Productos sin explicar" style={{ ...MONO, fontSize: 11, fontWeight: 700, background: "#b91c1c", color: "#fff", borderRadius: 999, padding: "1px 7px" }}>{u.negativos}</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 19, color: "#0f172a" }}>{ubicacion?.nombre.trim() || "—"}</h2>
                <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                  {esOficina ? "Todo entra y sale de acá. Es la única ubicación que no puede quedar en negativo." : "Stock calculado desde el último conteo."}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                <button type="button" onClick={abrirConteo} style={boton("#c2410c")}>Cargar conteo</button>
                <Link href={esOficina ? `/dashboard${BASE}/envios` : `/dashboard${BASE}/envios?hacia=${sel}`} style={boton("#1d4e89")}>Registrar envío</Link>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <Tarjeta titulo="Último conteo" valor={conteo ? fmtFecha(conteo.fecha) : "Sin conteo"} sub={conteo ? hace(conteo.fecha) : "Cargá el conteo inicial"} color={conteo ? undefined : "#b45309"} />
              <Tarjeta titulo="Productos" valor={filas.length} sub="en esta ubicación" />
              <Tarjeta titulo="Sin explicar" valor={negativos} sub={negativos ? "Falta un envío o un conteo" : "Todo cierra"} color={negativos ? "#b91c1c" : "#15803d"} />
            </div>
          </div>

          {conteoAbierto && (
            <section aria-label="Cargar conteo" style={{ background: "#fff", border: "2px solid #c2410c", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>Cargar conteo de {ubicacion?.nombre.trim()}</h3>
                <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                  Escribí lo que contaste en cada producto. Lo que dejes vacío no se toca. Antes de confirmar ves la diferencia contra lo que calcula el sistema.
                </div>
              </div>

              <details>
                <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#1d4e89" }}>Pegar cantidades desde una planilla</summary>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  <label htmlFor="pegado" style={{ fontSize: 12.5, color: "#64748b" }}>Una línea por producto: código, cantidad y, si hay, los números de serie (separados por espacio). Ejemplo: D03 8 010402015210 010402015247</label>
                  <textarea id="pegado" rows={4} value={pegado} onChange={(e) => setPegado(e.target.value)}
                    style={{ ...MONO, fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 8, padding: 8 }} />
                  <div><button type="button" onClick={aplicarPegado} style={boton("#1d4e89")}>Cargar en la tabla</button></div>
                </div>
              </details>

              <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th style={TH}>Producto</th>
                      <th style={{ ...TH, textAlign: "right" }}>Sistema</th>
                      <th style={{ ...TH, textAlign: "right" }}>Contado</th>
                      <th style={{ ...TH, textAlign: "right" }}>Diferencia</th>
                      <th style={TH}>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasConteo.map((f) => {
                      const v = contados[f.id];
                      const tiene = v !== undefined && v !== "";
                      const dif = tiene ? parseInt(v, 10) - f.sistema : null;
                      return (
                        <tr key={f.id}>
                          <td style={TD}>
                            <div style={{ fontWeight: 600 }}>{f.descripcion}</div>
                            <div style={{ ...MONO, fontSize: 11, color: "#94a3b8" }}>{f.codigo}</div>
                            {f.lleva_serie && tiene && (
                              <textarea aria-label={`Números de serie de ${f.descripcion}`} rows={2} placeholder="Números de serie (opcional)"
                                value={seriesConteo[f.id] || ""} onChange={(e) => setSeriesConteo((s) => ({ ...s, [f.id]: e.target.value }))}
                                style={{ ...MONO, fontSize: 12, width: "100%", marginTop: 6, border: "1px solid #cbd5e1", borderRadius: 6, padding: 6 }} />
                            )}
                          </td>
                          <td style={{ ...TD, ...NUM }}>{f.sistema}</td>
                          <td style={{ ...TD, textAlign: "right" }}>
                            <input type="number" min="0" inputMode="numeric" aria-label={`Contado de ${f.descripcion}`} value={v ?? ""}
                              onChange={(e) => setContados((c) => ({ ...c, [f.id]: e.target.value }))}
                              style={{ ...MONO, width: 84, textAlign: "right", fontSize: 14, border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px" }} />
                          </td>
                          <td style={{ ...TD, ...NUM, fontWeight: 700, color: dif === null ? "#cbd5e1" : dif === 0 ? "#15803d" : "#b91c1c" }}>
                            {dif === null ? "—" : dif > 0 ? `+${dif}` : dif}
                          </td>
                          <td style={TD}>
                            {dif !== null && dif !== 0 && (
                              <>
                                <input list="motivos-conteo" aria-label={`Motivo de la diferencia de ${f.descripcion}`} value={motivos[f.id] || ""}
                                  onChange={(e) => setMotivos((m) => ({ ...m, [f.id]: e.target.value }))} placeholder="Motivo"
                                  style={{ width: "100%", minWidth: 160, fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px" }} />
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <datalist id="motivos-conteo">{MOTIVOS.map((m) => <option key={m} value={m} />)}</datalist>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <label htmlFor="agregar-producto" style={{ fontSize: 12.5, color: "#64748b" }}>Contar otro producto:</label>
                <select id="agregar-producto" value={agregar} style={{ fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px" }}
                  onChange={(e) => { if (e.target.value) setContados((c) => ({ ...c, [e.target.value]: "0" })); setAgregar(""); }}>
                  <option value="">Elegir…</option>
                  {productosParaAgregar.map((p) => <option key={p.id} value={p.id}>{(p.codigo || "").trim()} · {p.descripcion}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" onClick={confirmarConteo} disabled={guardando} style={{ ...boton("#15803d"), opacity: guardando ? 0.6 : 1 }}>
                  {guardando ? "Guardando…" : "Confirmar conteo"}
                </button>
                <button type="button" onClick={() => setConteoAbierto(false)} style={boton("#5b6472")}>Cancelar</button>
                <span style={{ fontSize: 12, color: "#64748b" }}>Al confirmar, el stock queda exactamente en lo contado y la diferencia queda registrada con quién, cuándo y motivo.</span>
              </div>
            </section>
          )}

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
            {cargando ? (
              <div style={{ padding: 24, color: "#64748b", fontSize: 13 }}>Cargando…</div>
            ) : filas.length === 0 ? (
              <div style={{ padding: 24, color: "#64748b", fontSize: 13 }}>Esta ubicación no tiene productos todavía. Cargá un conteo o registrá un envío.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
                  <thead>
                    <tr>
                      <th style={TH}>Producto</th>
                      <th style={{ ...TH, textAlign: "right" }}>Último conteo</th>
                      <th style={{ ...TH, textAlign: "right" }}>Envíos</th>
                      <th style={{ ...TH, textAlign: "right" }}>Tickets</th>
                      <th style={{ ...TH, textAlign: "right" }}>Stock ahora</th>
                      <th style={TH}>Estado</th>
                    </tr>
                  </thead>
                  {grupos.map(([cat, lista]) => (
                    <tbody key={cat}>
                      <tr>
                        <td colSpan={6} style={{ padding: 0, background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                          <button type="button" aria-expanded={!cerradas[cat]} onClick={() => setCerradas((c) => ({ ...c, [cat]: !c[cat] }))}
                            style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#334155", display: "flex", justifyContent: "space-between" }}>
                            <span>{cat}</span><span>{lista.length} {cerradas[cat] ? "▸" : "▾"}</span>
                          </button>
                        </td>
                      </tr>
                      {!cerradas[cat] && lista.map((f) => {
                        const neg = f.stock < 0;
                        const sinSerie = f.lleva_serie ? Math.max(f.stock - (f.series_cargadas || 0), 0) : 0;
                        return (
                          <FilaProducto key={f.producto_id} f={f} neg={neg} esOficina={esOficina} sel={sel} sinSerie={sinSerie}
                            abierta={!!seriesAbiertas[f.producto_id]} lista={listasSeries[f.producto_id]} onSeries={() => verSeries(f)} />
                        );
                      })}
                    </tbody>
                  ))}
                </table>
              </div>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>
            Stock ahora = último conteo + envíos registrados − tickets descontados desde esa fecha. En la Oficina no se puede sacar más de lo que hay; en el resto, un número negativo es una pregunta (¿falta un envío?), no un error.
          </div>
        </div>
      </div>
    </div>
  );
}

function FilaProducto({ f, neg, esOficina, sel, sinSerie, abierta, lista, onSeries }) {
  return (
    <>
      <tr>
        <td style={TD}>
          <div style={{ fontWeight: 600 }}>{f.descripcion}</div>
          <div style={{ ...MONO, fontSize: 11, color: "#94a3b8" }}>{f.codigo}</div>
          {f.lleva_serie && (
            <button type="button" onClick={onSeries} aria-expanded={abierta}
              style={{ marginTop: 4, border: "none", background: "#1d4e89", color: "#ffffff", borderRadius: 6, fontSize: 11.5, fontWeight: 700, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit" }}>
              {abierta ? "Ocultar series" : `Ver series (${f.series_cargadas || 0})`}
            </button>
          )}
        </td>
        <td style={{ ...TD, ...NUM, color: f.ultimo_conteo == null ? "#cbd5e1" : undefined }}>{f.ultimo_conteo == null ? "—" : f.ultimo_conteo}</td>
        <td style={{ ...TD, ...NUM }}>{f.envios > 0 ? `+${f.envios}` : f.envios}</td>
        <td style={{ ...TD, ...NUM }}>{f.tickets > 0 ? `−${f.tickets}` : "0"}</td>
        <td style={{ ...TD, ...NUM, fontWeight: 700, color: neg ? "#b91c1c" : "#0f172a" }}>{f.stock}</td>
        <td style={TD}>
          {neg ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
              <span style={{ fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>
                {esOficina ? "La Oficina no puede quedar en negativo: hacé un conteo" : "Falta registrar un envío o hacer un conteo"}
              </span>
              {!esOficina && (
                <Link href={`/dashboard${BASE}/envios?hacia=${sel}&producto=${f.producto_id}`}
                  style={{ ...boton("#1d4e89"), minHeight: 30, fontSize: 12, padding: "0 12px" }}>Registrar envío</Link>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>Con stock</span>
          )}
        </td>
      </tr>
      {abierta && (
        <tr>
          <td colSpan={6} style={{ ...TD, background: "#f8fafc" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Números de serie en esta ubicación</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(lista || []).map((s) => (
                <span key={s} style={{ ...MONO, fontSize: 12, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "2px 8px" }}>{s}</span>
              ))}
              {lista && lista.length === 0 && <span style={{ fontSize: 12.5, color: "#64748b" }}>Ninguno cargado.</span>}
            </div>
            {sinSerie > 0 && <div style={{ fontSize: 12.5, color: "#b45309", marginTop: 8 }}>{sinSerie} sin número de serie cargado</div>}
          </td>
        </tr>
      )}
    </>
  );
}

export default function StockNuevoUbicaciones() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "#64748b" }}>Cargando…</div>}>
      <Pantalla />
    </Suspense>
  );
}
