"use client";
import { Suspense, useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  fmtFecha, ordenarUbicaciones, agruparPorSegmento, localidadAMostrar, ordenCategoria, ORDEN_CATEGORIAS, parseSeries, mensajeDeError,
} from "@/lib/stockNuevo";

const MONO = { fontFamily: "DM Mono, monospace" };
const BASE = "/stock-nuevo";

// Fecha de hoy en formato AAAA-MM-DD según la hora local
const hoyISO = () => new Date().toLocaleDateString("en-CA");

const chip = (activo) => ({
  minHeight: 40, padding: "0 16px", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 700,
  color: "#ffffff", background: activo ? "#1d4e89" : "#5b6472", cursor: "pointer", fontFamily: "inherit",
});
const paso = {
  width: 36, height: 36, border: "none", borderRadius: 8, background: "#4a5463", color: "#ffffff",
  fontSize: 18, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};
const campo = {
  width: "100%", minHeight: 44, fontSize: 14.5, fontFamily: "inherit", color: "#0f172a", background: "#fff",
  border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 12px",
};
const etiquetaUbicacion = (u) => `${u.nombre.trim()}${localidadAMostrar(u) ? ` · ${localidadAMostrar(u)}` : ""}`;
const tarjeta = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 };
const subtitulo = { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b", marginBottom: 8 };

function Pantalla() {
  const parametros = useSearchParams();
  const [ubicaciones, setUbicaciones] = useState([]);
  const [productos, setProductos] = useState([]);
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState(parametros.get("hacia") || "");
  const [disponible, setDisponible] = useState({});
  const [cantidades, setCantidades] = useState({});
  const [seriesTxt, setSeriesTxt] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const [abiertas, setAbiertas] = useState({});
  const [fecha, setFecha] = useState(hoyISO());
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const productoInicial = parametros.get("producto");

  useEffect(() => {
    (async () => {
      try {
        const [ubs, prods] = await Promise.all([api.get(`${BASE}/ubicaciones/`), api.get(`${BASE}/productos/`)]);
        const ordenadas = ordenarUbicaciones(ubs || []);
        setUbicaciones(ordenadas);
        setProductos(prods || []);
        setOrigen((o) => o || ordenadas.find((u) => u.tipo === "oficina")?.id || ordenadas[0]?.id || "");
      } catch (e) {
        setMensaje({ tipo: "error", texto: mensajeDeError(e) });
      }
    })();
  }, []);

  const cargarDisponible = useCallback(async (id) => {
    if (!id) return;
    try { setDisponible(await api.get(`${BASE}/stock-por-producto/`, { ubicacion_id: id })); }
    catch (e) { setMensaje({ tipo: "error", texto: mensajeDeError(e) }); }
  }, []);

  useEffect(() => { cargarDisponible(origen); setCantidades({}); setSeriesTxt({}); }, [origen, cargarDisponible]);

  // Si llegó desde un renglón en negativo, deja el producto elegido con 1 unidad
  useEffect(() => {
    if (productoInicial && productos.some((p) => p.id === productoInicial)) {
      setCantidades((c) => (c[productoInicial] ? c : { [productoInicial]: 1 }));
      const cat = productos.find((p) => p.id === productoInicial)?.categoria;
      if (cat) setAbiertas((a) => ({ ...a, [ORDEN_CATEGORIAS.includes(cat) ? cat : "Otros"]: true }));
    }
  }, [productoInicial, productos]);

  const origenU = ubicaciones.find((u) => u.id === origen);
  const esOficina = origenU?.tipo === "oficina";
  const destinoU = ubicaciones.find((u) => u.id === destino);

  const gruposOrigen = useMemo(() => agruparPorSegmento(ubicaciones), [ubicaciones]);
  const gruposDestino = useMemo(() => agruparPorSegmento(ubicaciones.filter((u) => u.id !== origen)), [ubicaciones, origen]);

  useEffect(() => { if (destino === origen) setDestino(""); }, [origen, destino]);

  const grupos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const m = new Map();
    productos
      .filter((p) => !q || (p.codigo || "").toLowerCase().includes(q) || (p.descripcion || "").toLowerCase().includes(q))
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
  const total = elegidos.reduce((a, p) => a + cantidades[p.id], 0);

  const problemas = elegidos.map((p) => {
    const q = cantidades[p.id], disp = disponible[p.id] || 0, series = parseSeries(seriesTxt[p.id]);
    if (esOficina && q > disp) return { id: p.id, texto: `La Oficina tiene ${disp} y querés enviar ${q}`, bloquea: true };
    if (series.length > 0 && series.length !== q) return { id: p.id, texto: `Cargaste ${series.length} números de serie y la cantidad es ${q}`, bloquea: true };
    if (!esOficina && q > disp) return { id: p.id, texto: `Queda en negativo (${disp - q})`, bloquea: false };
    return null;
  }).filter(Boolean);
  const avisosFecha = [origenU, destinoU].filter((u) => u?.ultimo_conteo && fecha <= u.ultimo_conteo)
    .map((u) => `La fecha es anterior o igual al último conteo de ${u.nombre.trim()} (${fmtFecha(u.ultimo_conteo)}): lo contado ya podría incluir este envío.`);
  const bloqueado = problemas.some((p) => p.bloquea) || !fecha || fecha > hoyISO();
  const problemaDe = (id) => problemas.find((p) => p.id === id);

  const confirmar = async () => {
    if (!origen || !destino) { setMensaje({ tipo: "error", texto: "Elegí desde dónde sale y a dónde va." }); return; }
    if (elegidos.length === 0) { setMensaje({ tipo: "error", texto: "Elegí al menos un producto y una cantidad." }); return; }
    setEnviando(true); setMensaje(null);
    try {
      const r = await api.post(`${BASE}/envios/`, {
        origen_id: origen, destino_id: destino, fecha,
        lineas: elegidos.map((p) => ({ producto_id: p.id, cantidad: cantidades[p.id], series: parseSeries(seriesTxt[p.id]) })),
      });
      const neg = r?.negativos || [];
      setMensaje({
        tipo: "ok",
        texto: `Envío registrado: ${elegidos.length} productos a ${destinoU?.nombre.trim()}, con fecha ${fmtFecha(fecha)}.` +
          (neg.length ? ` Atención: ${origenU?.nombre.trim()} queda en negativo en ${neg.map((n) => `${n.codigo} (${n.queda})`).join(", ")}.` : ""),
      });
      setCantidades({}); setSeriesTxt({});
      await cargarDisponible(origen);
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e) });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c2410c" }}>Stock nuevo</div>
        <h1 style={{ margin: "2px 0 0", fontSize: 24, color: "#0f172a" }}>Envíos</h1>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, maxWidth: 780 }}>
          Elegí desde dónde sale, a dónde va y cuánto de cada producto. Desde la Oficina no se puede enviar más de lo que hay. Desde un centro sí, y si queda en negativo aparece una alerta.
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
            <label htmlFor="envio-desde" style={subtitulo}>Desde</label>
            <select id="envio-desde" value={origen} onChange={(e) => setOrigen(e.target.value)} style={campo}>
              {gruposOrigen.map(([segmento, lista]) => (
                <optgroup key={segmento.clave} label={segmento.nombre}>
                  {lista.map((u) => <option key={u.id} value={u.id}>{etiquetaUbicacion(u)}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="envio-hacia" style={subtitulo}>Hacia</label>
            <select id="envio-hacia" value={destino} onChange={(e) => setDestino(e.target.value)} style={campo}>
              <option value="">Elegir destino…</option>
              {gruposDestino.map(([segmento, lista]) => (
                <optgroup key={segmento.clave} label={segmento.nombre}>
                  {lista.map((u) => <option key={u.id} value={u.id}>{etiquetaUbicacion(u)}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="envio-fecha" style={subtitulo}>Fecha del envío</label>
            <input id="envio-fecha" type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} style={campo} />
          </div>
        </div>
        {fecha && fecha < hoyISO() && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: "#64748b" }}>Estás cargando un envío con fecha pasada ({fmtFecha(fecha)}).</div>
        )}
        {avisosFecha.map((a) => <div key={a} style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: "#b45309" }}>⚠ {a}</div>)}
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
                <button type="button" aria-expanded={!cerrada} onClick={() => setAbiertas((c) => ({ ...c, [cat]: !c[cat] }))}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", border: "none", background: "#f1f5f9", padding: "9px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#334155" }}>
                  <span>{cat}</span><span>{enGrupo ? `${enGrupo} elegidos · ` : ""}{lista.length} {cerrada ? "▸" : "▾"}</span>
                </button>
                {!cerrada && lista.map((p) => {
                  const q = cantidades[p.id] || 0;
                  const prob = problemaDe(p.id);
                  return (
                    <div key={p.id} style={{ padding: "10px 14px", borderTop: "1px solid #f1f5f9", background: q ? "#f8fbff" : "#fff" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
                        <div style={{ minWidth: 200, flex: "1 1 220px" }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.descripcion}</div>
                          <div style={{ ...MONO, fontSize: 11, color: "#94a3b8" }}>{(p.codigo || "").trim()}</div>
                        </div>
                        <div style={{ ...MONO, fontSize: 13, color: "#475569", minWidth: 110 }} aria-label="Disponible en el origen">
                          {origenU?.nombre.trim()}: <b>{disponible[p.id] || 0}</b>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <button type="button" style={paso} onClick={() => poner(p.id, -1)} aria-label={`Restar uno a ${p.descripcion}`}>−</button>
                          <input type="number" min="0" aria-label={`Cantidad de ${p.descripcion}`} value={q || ""} placeholder="0" onChange={(e) => fijar(p.id, e.target.value)}
                            style={{ ...MONO, width: 72, textAlign: "center", fontSize: 16, fontWeight: 700, border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 4px" }} />
                          <button type="button" style={paso} onClick={() => poner(p.id, 1)} aria-label={`Sumar uno a ${p.descripcion}`}>+</button>
                          <button type="button" style={{ ...paso, width: 48, fontSize: 13 }} onClick={() => poner(p.id, 10)} aria-label={`Sumar diez a ${p.descripcion}`}>+10</button>
                        </div>
                      </div>
                      {prob && <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: prob.bloquea ? "#b91c1c" : "#b45309" }}>{prob.texto}</div>}
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
        <button type="button" onClick={confirmar} disabled={enviando || bloqueado || !destino || elegidos.length === 0}
          style={{ ...chip(true), background: "#15803d", opacity: (enviando || bloqueado || !destino || elegidos.length === 0) ? 0.5 : 1, minHeight: 44, padding: "0 22px", fontSize: 15 }}>
          {enviando ? "Registrando…" : "Confirmar envío"}
        </button>
        <span style={{ fontSize: 13, color: "#475569" }}>
          {elegidos.length === 0
            ? "Todavía no elegiste productos."
            : `${origenU?.nombre.trim() || "?"} → ${destinoU?.nombre.trim() || "elegí el destino"} · ${elegidos.length} productos, ${total} unidades`}
        </span>
      </div>
    </div>
  );
}

export default function StockNuevoEnvios() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "#64748b" }}>Cargando…</div>}>
      <Pantalla />
    </Suspense>
  );
}
