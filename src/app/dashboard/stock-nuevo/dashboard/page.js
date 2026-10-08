"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, LabelList, Legend, PieChart, Pie,
} from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import BotonExportar from "@/components/BotonExportar";
import { descargarTabla } from "@/lib/exportaciones";
import { agruparPorSegmento, localidadAMostrar, diasDesde, fmtFecha, hace, mensajeDeError, ordenCategoria, DIAS_CRITICO, DIAS_BAJO, nivelDeReposicion as nivelDe } from "@/lib/stockNuevo";

const BASE = "/stock-nuevo";
const RUTA = "/dashboard/stock-nuevo";
const MONO = { fontFamily: "DM Mono, monospace" };
const tarjeta = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 };
const TH = {
  textAlign: "left", padding: "9px 12px", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.07em",
  textTransform: "uppercase", color: "#94a3b8", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
};
const TD = { padding: "9px 12px", fontSize: 13, color: "#334155", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };

// Colores de estado: rojo = actuar ya, ámbar = atención, verde = bien, gris = sin dato
const COLOR = { critico: "#dc2626", bajo: "#f59e0b", ok: "#16a34a", sinconsumo: "#94a3b8" };
const NIVELES = {
  critico: { texto: "Crítico", fondo: "#fee2e2", color: "#991b1b", orden: 0 },
  bajo: { texto: "Bajo", fondo: "#fef3c7", color: "#92400e", orden: 1 },
  ok: { texto: "Con stock", fondo: "#dcfce7", color: "#166534", orden: 2 },
  sinconsumo: { texto: "Sin consumo", fondo: "#e2e8f0", color: "#475569", orden: 3 },
};
const CATEGORIAS = [
  ["Dispositivos", "#1d4e89"], ["Cables", "#0e7490"], ["Accesorios", "#7c3aed"], ["Insumos", "#c2410c"],
];
const COLOR_EDAD = ["#16a34a", "#84cc16", "#f59e0b", "#ea580c", "#b91c1c", "#94a3b8"];
const MES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Qué productos se ven en el gráfico de la Oficina queda guardado en este navegador
const CLAVE_GRAFICO = "stock_dashboard_grafico_v1";
const corto = (s, n = 28) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function Indicador({ titulo, valor, detalle, color, href }) {
  const contenido = (
    <div style={{ ...tarjeta, padding: "16px 18px", height: "100%", borderTop: `4px solid ${color}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b" }}>{titulo}</div>
      <div style={{ ...MONO, fontSize: 34, fontWeight: 700, color, marginTop: 8, lineHeight: 1 }}>{valor}</div>
      <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 8, lineHeight: 1.35 }}>{detalle}</div>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>{contenido}</Link> : contenido;
}

function Bloque({ titulo, ayuda, children, derecha }) {
  return (
    <section style={{ ...tarjeta, padding: 18, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: "#0f172a" }}>{titulo}</h2>
          {ayuda && <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 3, maxWidth: 760, lineHeight: 1.4 }}>{ayuda}</div>}
        </div>
        {derecha}
      </div>
      {children}
    </section>
  );
}

const CuadroInfo = ({ children }) => (
  <div style={{ background: "#0f172a", color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, lineHeight: 1.5, boxShadow: "0 4px 14px rgba(0,0,0,.25)" }}>{children}</div>
);

export default function DashboardStock() {
  const { rol } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [verTabla, setVerTabla] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null);
  const [diasConteo, setDiasConteo] = useState("");
  const [modoGrafico, setModoGrafico] = useState("auto"); // auto: los que se acaban primero | elegidos: los que marcó el usuario
  const [elegidos, setElegidos] = useState([]);
  const [panelElegir, setPanelElegir] = useState(false);
  const [buscarElegir, setBuscarElegir] = useState("");

  useEffect(() => {
    try {
      const g = JSON.parse(localStorage.getItem(CLAVE_GRAFICO) || "null");
      if (g && (g.modo === "auto" || g.modo === "elegidos") && Array.isArray(g.elegidos)) { setModoGrafico(g.modo); setElegidos(g.elegidos); }
    } catch { /* sin almacenamiento: queda el modo automático */ }
  }, []);

  const guardarEleccion = (modo, lista) => {
    setModoGrafico(modo); setElegidos(lista);
    try { localStorage.setItem(CLAVE_GRAFICO, JSON.stringify({ modo, elegidos: lista })); } catch { /* no se guarda, sigue funcionando */ }
  };

  const cargar = useCallback(async () => {
    try {
      const d = await api.get(`${BASE}/dashboard/`);
      setDatos(d); setDiasConteo(String(d.dias_alerta_conteo));
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const reposicion = useMemo(() => (datos?.reposicion || []).map((r) => ({ ...r, nivel: nivelDe(r) })), [datos]);

  const cuenta = useMemo(() => {
    const c = { critico: 0, bajo: 0, ok: 0, sinconsumo: 0 };
    reposicion.forEach((r) => { c[r.nivel]++; });
    return c;
  }, [reposicion]);

  // Barras: por defecto los que se acaban primero; o los productos que elige el usuario
  const filaBarra = (r) => ({
    ...r, nombre: `${r.codigo} · ${corto(r.descripcion, 24)}`, dias: r.dias_de_stock,
    largo: r.dias_de_stock == null ? 0 : Math.max(r.dias_de_stock, 0.8), // el cero también se ve como una marca
    etiqueta: r.dias_de_stock == null ? "sin consumo" : `${r.dias_de_stock} d`,
  });
  const automaticos = useMemo(() => reposicion
    .filter((r) => r.dias_de_stock != null && r.consumo_por_dia > 0)
    .sort((a, b) => a.dias_de_stock - b.dias_de_stock).slice(0, 12), [reposicion]);
  const barras = useMemo(() => {
    if (modoGrafico === "auto") return automaticos.map(filaBarra);
    const set = new Set(elegidos);
    return reposicion.filter((r) => set.has(r.producto_id))
      .sort((a, b) => (a.dias_de_stock ?? 1e9) - (b.dias_de_stock ?? 1e9) || a.codigo.localeCompare(b.codigo)).map(filaBarra);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoGrafico, elegidos, reposicion, automaticos]);

  const opcionesElegir = useMemo(() => {
    const q = buscarElegir.trim().toLowerCase();
    const m = new Map();
    reposicion.filter((r) => !q || r.codigo.toLowerCase().includes(q) || r.descripcion.toLowerCase().includes(q)).forEach((r) => {
      m.set(r.categoria, [...(m.get(r.categoria) || []), r]);
    });
    return [...m.entries()].sort((a, b) => ordenCategoria(a[0]) - ordenCategoria(b[0]));
  }, [reposicion, buscarElegir]);

  const alternarProducto = (id) => guardarEleccion("elegidos", elegidos.includes(id) ? elegidos.filter((x) => x !== id) : [...elegidos, id]);

  const bajoMinimo = useMemo(() => reposicion.filter((r) => r.minimo != null && r.stock < r.minimo), [reposicion]);

  const donut = useMemo(() => Object.entries(cuenta).filter(([, n]) => n > 0)
    .map(([clave, n]) => ({ clave, name: NIVELES[clave].texto, value: n, fill: COLOR[clave] })), [cuenta]);

  const tabla = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return reposicion.filter((r) => !q || r.codigo.toLowerCase().includes(q) || r.descripcion.toLowerCase().includes(q))
      .sort((a, b) => NIVELES[a.nivel].orden - NIVELES[b.nivel].orden || (a.dias_de_stock ?? 99999) - (b.dias_de_stock ?? 99999)
        || ordenCategoria(a.categoria) - ordenCategoria(b.categoria) || a.codigo.localeCompare(b.codigo));
  }, [reposicion, busqueda]);

  const guardarMinimo = async (r, valor) => {
    setEditando(null);
    const nuevo = valor === "" ? null : Math.max(0, parseInt(valor, 10));
    if (nuevo === r.minimo || Number.isNaN(nuevo)) return;
    try { await api.put(`${BASE}/minimos/`, { producto_id: r.producto_id, cantidad_minima: nuevo }); await cargar(); }
    catch (e) { setMensaje({ tipo: "error", texto: mensajeDeError(e) }); }
  };

  const guardarDiasConteo = async () => {
    try {
      await api.put(`${BASE}/alertas/`, { clave: "dias_alerta_conteo", dias: parseInt(diasConteo, 10) });
      setMensaje({ tipo: "ok", texto: "Días de alerta de conteo guardados." });
      await cargar();
    } catch (e) { setMensaje({ tipo: "error", texto: mensajeDeError(e) }); }
  };

  const exportarReposicion = () => descargarTabla(
    `Reposicion_Oficina_${new Date().toLocaleDateString("sv-SE")}.xlsx`, "Reposición de la Oficina",
    ["Código", "Producto", "Categoría", "Stock", "Mínimo", `Consumo ${datos.ventana_dias} días`, "Consumo por día", "Días de stock", "Pedir antes del", "Estado"],
    [...reposicion].sort((a, b) => NIVELES[a.nivel].orden - NIVELES[b.nivel].orden || (a.dias_de_stock ?? 99999) - (b.dias_de_stock ?? 99999)).map((r) => [
      r.codigo, r.descripcion, r.categoria, r.stock, r.minimo ?? "", r.consumo_90_dias, r.consumo_por_dia, r.dias_de_stock ?? "", r.pedir_el ? fmtFecha(r.pedir_el) : "", NIVELES[r.nivel].texto]),
    [10, 38, 14, 10, 10, 16, 16, 14, 16, 14]
  );

  if (error) return <div role="alert" style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontSize: 13 }}>{error}</div>;
  if (!datos) return <div style={{ padding: 24, color: "#64748b", fontSize: 13 }}>Cargando…</div>;

  const ubicaciones = datos.ubicaciones;
  const sinExplicar = ubicaciones.reduce((a, u) => a + u.negativos, 0);
  const conNegativos = ubicaciones.filter((u) => u.negativos > 0).length;
  const conteoVencido = (u) => !u.ultimo_conteo || diasDesde(u.ultimo_conteo) > datos.dias_alerta_conteo;
  const sinConteo = ubicaciones.filter(conteoVencido).length;
  const aPedir = cuenta.critico + cuenta.bajo;
  const maxDias = Math.max(30, ...barras.map((b) => b.largo));

  const consumo = datos.consumo_mensual.map((m) => ({ ...m, etiqueta: MES_CORTO[parseInt(m.mes.slice(5), 10) - 1] }));
  const hayConsumo = consumo.some((m) => CATEGORIAS.some(([c]) => m[c] > 0));
  const edades = datos.retirados_por_edad.filter((e) => e.tramo !== "Sin fecha" || e.cantidad > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c2410c" }}>Stock</div>
        <h1 style={{ margin: "2px 0 0", fontSize: 26, color: "#0f172a" }}>Dashboard</h1>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Qué hay que pedir, qué no cierra y qué falta contar · {fmtFecha(datos.hoy)}</div>
      </div>

      {mensaje && (
        <div role={mensaje.tipo === "ok" ? "status" : "alert"} style={{
          background: mensaje.tipo === "ok" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${mensaje.tipo === "ok" ? "#bbf7d0" : "#fecaca"}`,
          color: mensaje.tipo === "ok" ? "#166534" : "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: 13,
        }}>{mensaje.texto}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <Indicador titulo="Para pedir" valor={aPedir} color={aPedir ? COLOR.critico : COLOR.ok} detalle={`Oficina: ${cuenta.critico} críticos y ${cuenta.bajo} bajos`} />
        <Indicador titulo="Sin explicar" valor={sinExplicar} color={sinExplicar ? COLOR.bajo : COLOR.ok}
          detalle={sinExplicar ? `Productos en ${conNegativos} ubicaciones: falta un envío o un conteo` : "Todo cierra"} href={`${RUTA}/ubicaciones`} />
        <Indicador titulo="Sin conteo reciente" valor={sinConteo} color={sinConteo ? COLOR.bajo : COLOR.ok} detalle={`Ubicaciones sin conteo o con más de ${datos.dias_alerta_conteo} días`} />
        <Indicador titulo="Retirados atrasados" valor={datos.retirados.atrasados} color={datos.retirados.atrasados ? COLOR.critico : COLOR.ok}
          detalle={`De ${datos.retirados.pendientes} pendientes, más de ${datos.retirados.dias_alerta} días`} href={`${RUTA}/retirados`} />
        <Indicador titulo="Faltantes" valor={datos.faltantes} color={datos.faltantes ? COLOR.bajo : COLOR.ok} detalle="Piezas que no volvieron con un retirado" href={`${RUTA}/retirados`} />
      </div>

      <div className="stock-fila-2" style={{ display: "grid", gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <Bloque titulo="Qué se acaba primero en la Oficina"
            ayuda={`Días que alcanza el stock con el consumo de los últimos ${datos.ventana_dias} días. Rojo: ${DIAS_CRITICO} días o menos. Ámbar: hasta ${DIAS_BAJO}. Podés elegir qué productos ver.`}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" aria-pressed={modoGrafico === "auto"} onClick={() => guardarEleccion("auto", elegidos)}
                style={{ minHeight: 38, padding: "0 14px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#ffffff", cursor: "pointer", fontFamily: "inherit", background: modoGrafico === "auto" ? "#c2410c" : "#4a5463" }}>
                Los que se acaban primero
              </button>
              <button type="button" aria-pressed={modoGrafico === "elegidos"}
                onClick={() => { guardarEleccion("elegidos", elegidos.length ? elegidos : automaticos.map((r) => r.producto_id)); setPanelElegir(true); }}
                style={{ minHeight: 38, padding: "0 14px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#ffffff", cursor: "pointer", fontFamily: "inherit", background: modoGrafico === "elegidos" ? "#c2410c" : "#4a5463" }}>
                Elegir yo ({elegidos.length})
              </button>
              {modoGrafico === "elegidos" && (
                <button type="button" aria-expanded={panelElegir} onClick={() => setPanelElegir((v) => !v)}
                  style={{ minHeight: 38, padding: "0 14px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#ffffff", cursor: "pointer", fontFamily: "inherit", background: "#1d4e89" }}>
                  {panelElegir ? "Cerrar la lista" : "Cambiar los productos"}
                </button>
              )}
            </div>

            {modoGrafico === "elegidos" && panelElegir && (
              <div style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10, background: "#f8fafc" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input type="search" aria-label="Buscar producto para el gráfico" placeholder="Buscar por nombre o código" value={buscarElegir} onChange={(e) => setBuscarElegir(e.target.value)}
                    style={{ flex: "1 1 220px", fontSize: 13.5, border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px", background: "#fff" }} />
                  <button type="button" onClick={() => guardarEleccion("elegidos", automaticos.map((r) => r.producto_id))}
                    style={{ minHeight: 36, padding: "0 12px", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700, color: "#ffffff", cursor: "pointer", fontFamily: "inherit", background: "#4a5463" }}>
                    Marcar los 12 que se acaban primero
                  </button>
                  <button type="button" onClick={() => guardarEleccion("elegidos", [])}
                    style={{ minHeight: 36, padding: "0 12px", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700, color: "#ffffff", cursor: "pointer", fontFamily: "inherit", background: "#b91c1c" }}>
                    Quitar todos
                  </button>
                </div>
                <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                  {opcionesElegir.length === 0 && <div style={{ fontSize: 13, color: "#64748b" }}>No hay productos con esa búsqueda.</div>}
                  {opcionesElegir.map(([cat, lista]) => (
                    <fieldset key={cat} style={{ border: "none", margin: 0, padding: 0 }}>
                      <legend style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#475569", marginBottom: 6 }}>{cat}</legend>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 6 }}>
                        {lista.map((r) => {
                          const marcado = elegidos.includes(r.producto_id);
                          return (
                            <label key={r.producto_id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, cursor: "pointer", background: marcado ? "#e0ecf8" : "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px" }}>
                              <input type="checkbox" checked={marcado} onChange={() => alternarProducto(r.producto_id)} style={{ accentColor: "#1d4e89", width: 16, height: 16 }} />
                              <span><span style={{ ...MONO, color: "#64748b" }}>{r.codigo}</span> · {corto(r.descripcion, 30)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </div>
            )}

            {barras.length === 0 ? (
              <div style={{ padding: 20, color: "#64748b", fontSize: 13 }}>
                {modoGrafico === "elegidos" ? "Todavía no elegiste ningún producto: abrí la lista y marcá los que quieras ver." : "Todavía no hay consumo registrado para calcular cuánto dura el stock."}
              </div>
            ) : (
              <div role="img" aria-label={`Días de stock de ${barras.length} productos. El primero es ${barras[0].descripcion} con ${barras[0].etiqueta}.`}
                style={{ width: "100%", height: Math.max(260, barras.length * 34 + 40) }}>
                <ResponsiveContainer>
                  <BarChart data={barras} layout="vertical" margin={{ top: 8, right: 70, left: 8, bottom: 8 }}>
                    <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, maxDias]} tick={{ fontSize: 12, fill: "#475569" }} unit=" d" />
                    <YAxis type="category" dataKey="nombre" width={190} tick={{ fontSize: 12, fill: "#1e293b" }} />
                    <Tooltip cursor={{ fill: "#f1f5f9" }} content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const r = payload[0].payload;
                      return (
                        <CuadroInfo>
                          <b>{r.descripcion}</b><br />
                          Stock: {r.stock}{r.minimo != null ? ` (mínimo ${r.minimo})` : ""}<br />
                          Consumo: {r.consumo_por_dia ? `${r.consumo_por_dia} por día` : "sin consumo en estos días"}<br />
                          {r.dias != null && <>Alcanza: {r.dias} días<br /></>}
                          {r.pedir_el && <>Pedir antes del {fmtFecha(r.pedir_el)}</>}
                        </CuadroInfo>
                      );
                    }} />
                    <ReferenceLine x={DIAS_CRITICO} stroke={COLOR.critico} strokeDasharray="5 4" />
                    <ReferenceLine x={DIAS_BAJO} stroke={COLOR.bajo} strokeDasharray="5 4" />
                    <Bar dataKey="largo" radius={[0, 5, 5, 0]} maxBarSize={22}>
                      {barras.map((b) => <Cell key={b.producto_id} fill={COLOR[b.nivel]} />)}
                      <LabelList dataKey="etiqueta" position="right" style={{ fontSize: 12, fontWeight: 700, fill: "#0f172a" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {bajoMinimo.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 12.5, color: "#7f1d1d" }}>
                <b>Por debajo del mínimo:</b>
                {bajoMinimo.map((r) => (
                  <span key={r.producto_id} style={{ background: "#fee2e2", borderRadius: 999, padding: "2px 10px", fontWeight: 600 }}>{r.codigo} · {r.stock} de {r.minimo}</span>
                ))}
              </div>
            )}
          </Bloque>
        </div>

        <Bloque titulo="Estado de los productos" ayuda="Cuántos productos hay en cada nivel.">
          <div role="img" aria-label={`Productos por nivel: ${donut.map((d) => `${d.value} ${d.name.toLowerCase()}`).join(", ")}.`} style={{ width: "100%", height: 230 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="#fff" />
                <Tooltip content={({ active, payload }) => active && payload?.length ? <CuadroInfo>{payload[0].name}: <b>{payload[0].value}</b> productos</CuadroInfo> : null} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.keys(NIVELES).map((k) => (
              <li key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span aria-hidden style={{ width: 12, height: 12, borderRadius: 3, background: COLOR[k] }} />
                <span style={{ flex: 1 }}>{NIVELES[k].texto}</span>
                <b style={MONO}>{cuenta[k]}</b>
              </li>
            ))}
          </ul>
        </Bloque>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
        <Bloque titulo="Consumo por mes" ayuda="Unidades instaladas o dadas de salida en los últimos 6 meses, por tipo de producto.">
          {!hayConsumo ? (
            <div style={{ padding: 20, color: "#64748b", fontSize: 13 }}>No hay consumo en estos meses.</div>
          ) : (
            <div role="img" aria-label="Unidades consumidas por mes, separadas por categoría de producto" style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={consumo} margin={{ top: 8, right: 8, left: -10, bottom: 4 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="etiqueta" tick={{ fontSize: 12, fill: "#475569" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#475569" }} />
                  <Tooltip cursor={{ fill: "#f1f5f9" }} />
                  <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
                  {CATEGORIAS.map(([c, color]) => <Bar key={c} dataKey={c} stackId="a" fill={color} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Bloque>

        <Bloque titulo="Retirados por antigüedad" ayuda={`Equipos desinstalados que todavía no llegaron a la Oficina. Se alerta después de ${datos.retirados.dias_alerta} días.`}>
          {datos.retirados.pendientes === 0 ? (
            <div style={{ padding: 20, color: "#15803d", fontSize: 13, fontWeight: 600 }}>No hay retirados pendientes.</div>
          ) : (
            <div role="img" aria-label={`Retirados pendientes por antigüedad: ${edades.map((e) => `${e.cantidad} ${e.tramo.toLowerCase()}`).join(", ")}.`} style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={edades} margin={{ top: 20, right: 8, left: -10, bottom: 4 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="tramo" tick={{ fontSize: 11.5, fill: "#475569" }} interval={0} />
                  <YAxis tick={{ fontSize: 12, fill: "#475569" }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "#f1f5f9" }} content={({ active, payload }) => active && payload?.length ? <CuadroInfo>{payload[0].payload.tramo}: <b>{payload[0].value}</b> equipos</CuadroInfo> : null} />
                  <Bar dataKey="cantidad" radius={[5, 5, 0, 0]} maxBarSize={56}>
                    {edades.map((e, i) => <Cell key={e.tramo} fill={COLOR_EDAD[i]} />)}
                    <LabelList dataKey="cantidad" position="top" style={{ fontSize: 12, fontWeight: 700, fill: "#0f172a" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <Link href={`${RUTA}/retirados`} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", minHeight: 36, padding: "0 14px", borderRadius: 8, background: "#1d4e89", color: "#ffffff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Ver los retirados
          </Link>
        </Bloque>
      </div>

      <Bloque titulo="Estado de cada ubicación"
        ayuda="Rojo: hay productos que no cierran. Ámbar: el conteo está vencido o no existe. Verde: al día. Tocá una ubicación para ver su stock."
        derecha={rol === "admin" && (
          <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, color: "#64748b" }}>
            <label htmlFor="dias-conteo">Conteo vencido después de</label>
            <input id="dias-conteo" type="number" min="1" max="365" value={diasConteo} onChange={(e) => setDiasConteo(e.target.value)}
              style={{ ...MONO, width: 64, textAlign: "right", border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px" }} />
            <span>días</span>
            <button type="button" onClick={guardarDiasConteo} style={{ border: "none", borderRadius: 8, background: "#1d4e89", color: "#ffffff", fontWeight: 700, fontSize: 12.5, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}>Guardar</button>
          </span>
        )}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {agruparPorSegmento(ubicaciones).map(([segmento, items]) => (
            <div key={segmento.clave}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#475569", marginBottom: 8 }}>{segmento.nombre}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {items.map((u) => <Ficha key={u.id} u={u} vencido={conteoVencido(u)} />)}
              </div>
            </div>
          ))}
        </div>
      </Bloque>

      <Bloque titulo="Todos los productos de la Oficina" ayuda="El detalle completo, y desde acá se fija el mínimo de cada producto."
        derecha={
          <span style={{ display: "inline-flex", gap: 10, flexWrap: "wrap" }}>
          <BotonExportar onExportar={exportarReposicion}>Exportar a Excel</BotonExportar>
          <button type="button" aria-expanded={verTabla} onClick={() => setVerTabla((v) => !v)}
            style={{ minHeight: 38, padding: "0 16px", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 700, color: "#ffffff", cursor: "pointer", fontFamily: "inherit", background: "#4a5463" }}>
            {verTabla ? "Ocultar tabla" : "Ver tabla y fijar mínimos"}
          </button>
          </span>
        }>
        {verTabla && (
          <>
            <input type="search" aria-label="Buscar producto" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o código"
              style={{ width: 280, fontSize: 13.5, border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px" }} />
            <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr>
                    <th style={TH}>Producto</th>
                    <th style={{ ...TH, textAlign: "right" }}>Stock</th>
                    <th style={{ ...TH, textAlign: "right" }}>Mínimo</th>
                    <th style={{ ...TH, textAlign: "right" }}>Por día</th>
                    <th style={{ ...TH, textAlign: "right" }}>Días</th>
                    <th style={TH}>Pedir antes del</th>
                    <th style={TH}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {tabla.map((r) => {
                    const n = NIVELES[r.nivel];
                    return (
                      <tr key={r.producto_id}>
                        <td style={TD}><div style={{ fontWeight: 600 }}>{r.descripcion}</div><div style={{ ...MONO, fontSize: 11, color: "#94a3b8" }}>{r.codigo}</div></td>
                        <td style={{ ...TD, ...MONO, textAlign: "right", fontWeight: 700 }}>{r.stock}</td>
                        <td style={{ ...TD, textAlign: "right" }}>
                          {editando === r.producto_id ? (
                            <input type="number" min="0" autoFocus defaultValue={r.minimo ?? ""} aria-label={`Mínimo de ${r.descripcion}`}
                              onBlur={(e) => guardarMinimo(r, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditando(null); }}
                              style={{ ...MONO, width: 70, textAlign: "right", fontSize: 13.5, border: "1px solid #1d4e89", borderRadius: 6, padding: "4px 6px" }} />
                          ) : (
                            <button type="button" onClick={() => setEditando(r.producto_id)} aria-label={`Cambiar el mínimo de ${r.descripcion}`}
                              style={{ ...MONO, border: "1px dashed #94a3b8", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: 13.5, padding: "3px 10px", color: r.minimo == null ? "#64748b" : "#0f172a" }}>
                              {r.minimo ?? "Fijar"}
                            </button>
                          )}
                        </td>
                        <td style={{ ...TD, ...MONO, textAlign: "right" }}>{r.consumo_por_dia || "—"}</td>
                        <td style={{ ...TD, ...MONO, textAlign: "right", fontWeight: 700 }}>{r.dias_de_stock == null ? "—" : r.dias_de_stock}</td>
                        <td style={{ ...TD, ...MONO }}>{r.pedir_el ? fmtFecha(r.pedir_el) : "—"}</td>
                        <td style={TD}><span style={{ background: n.fondo, color: n.color, fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: "2px 10px", whiteSpace: "nowrap" }}>{n.texto}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Bloque>

      <style>{`.stock-fila-2 { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); } @media (max-width: 900px) { .stock-fila-2 { grid-template-columns: minmax(0, 1fr); } }`}</style>
    </div>
  );
}

function Ficha({ u, vencido }) {
  const estado = u.negativos > 0
    ? { color: COLOR.critico, fondo: "#fef2f2", texto: `${u.negativos} sin explicar` }
    : vencido ? { color: COLOR.bajo, fondo: "#fffbeb", texto: u.ultimo_conteo ? "Conteo vencido" : "Sin conteo" }
      : { color: COLOR.ok, fondo: "#f0fdf4", texto: "Al día" };
  return (
    <Link href={`${RUTA}/ubicaciones?ubicacion=${u.id}`}
      style={{ textDecoration: "none", color: "inherit", background: estado.fondo, border: "1px solid #e2e8f0", borderLeft: `5px solid ${estado.color}`, borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{u.nombre.trim()}</span>
      {localidadAMostrar(u) && <span style={{ fontSize: 12, color: "#64748b" }}>{localidadAMostrar(u)}</span>}
      <span style={{ fontSize: 12.5, fontWeight: 700, color: estado.color === COLOR.bajo ? "#92400e" : estado.color === COLOR.ok ? "#166534" : "#991b1b" }}>{estado.texto}</span>
      <span style={{ fontSize: 11.5, color: "#64748b" }}>{u.ultimo_conteo ? `Contado ${hace(u.ultimo_conteo)}` : "Nunca se contó"}</span>
    </Link>
  );
}
