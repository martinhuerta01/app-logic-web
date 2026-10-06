"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { agruparPorSegmento, localidadAMostrar, diasDesde, fmtFecha, hace, mensajeDeError, ordenCategoria } from "@/lib/stockNuevo";

const BASE = "/stock-nuevo";
const RUTA = "/dashboard/stock-nuevo";
const MONO = { fontFamily: "DM Mono, monospace" };
const TH = {
  textAlign: "left", padding: "9px 12px", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.07em",
  textTransform: "uppercase", color: "#94a3b8", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
};
const TD = { padding: "10px 12px", fontSize: 13, color: "#334155", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };
const NUM = { ...MONO, textAlign: "right", fontSize: 13.5 };
const tarjeta = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10 };

// Niveles de la reposición de la Oficina (días de stock con el consumo de los últimos 90 días)
const NIVELES = {
  critico: { texto: "Crítico", fondo: "#fee2e2", color: "#991b1b", orden: 0 },
  bajo: { texto: "Bajo", fondo: "#ffedd5", color: "#9a3412", orden: 1 },
  ok: { texto: "Con stock", fondo: "#dcfce7", color: "#166534", orden: 2 },
  sinconsumo: { texto: "Sin consumo", fondo: "#e2e8f0", color: "#475569", orden: 3 },
};
const DIAS_CRITICO = 7;
const DIAS_BAJO = 20;

const nivelDe = (r) => {
  if (r.minimo != null && r.stock < r.minimo) return "critico";
  if (r.consumo_por_dia > 0) {
    if (r.dias_de_stock <= DIAS_CRITICO) return "critico";
    if (r.dias_de_stock <= DIAS_BAJO) return "bajo";
    return "ok";
  }
  return "sinconsumo";
};

function Indicador({ titulo, valor, detalle, color, href }) {
  const contenido = (
    <div style={{ ...tarjeta, padding: "14px 16px", height: "100%", borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>{titulo}</div>
      <div style={{ ...MONO, fontSize: 28, fontWeight: 700, color, marginTop: 6, lineHeight: 1 }}>{valor}</div>
      <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 6 }}>{detalle}</div>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>{contenido}</Link> : contenido;
}

export default function DashboardStock() {
  const { rol } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [nivel, setNivel] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null);
  const [diasConteo, setDiasConteo] = useState("");

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

  const cuentaNiveles = useMemo(() => {
    const c = { todos: reposicion.length, critico: 0, bajo: 0, ok: 0, sinconsumo: 0 };
    reposicion.forEach((r) => { c[r.nivel]++; });
    return c;
  }, [reposicion]);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return reposicion
      .filter((r) => nivel === "todos" || r.nivel === nivel)
      .filter((r) => !q || r.codigo.toLowerCase().includes(q) || r.descripcion.toLowerCase().includes(q))
      .sort((a, b) => NIVELES[a.nivel].orden - NIVELES[b.nivel].orden
        || (a.dias_de_stock ?? 99999) - (b.dias_de_stock ?? 99999)
        || ordenCategoria(a.categoria) - ordenCategoria(b.categoria) || a.codigo.localeCompare(b.codigo));
  }, [reposicion, nivel, busqueda]);

  const guardarMinimo = async (r, valor) => {
    setEditando(null);
    const nuevo = valor === "" ? null : Math.max(0, parseInt(valor, 10));
    if (nuevo === r.minimo || Number.isNaN(nuevo)) return;
    try {
      await api.put(`${BASE}/minimos/`, { producto_id: r.producto_id, cantidad_minima: nuevo });
      await cargar();
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e) });
    }
  };

  const guardarDiasConteo = async () => {
    try {
      await api.put(`${BASE}/alertas/`, { clave: "dias_alerta_conteo", dias: parseInt(diasConteo, 10) });
      setMensaje({ tipo: "ok", texto: "Días de alerta de conteo guardados." });
      await cargar();
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e) });
    }
  };

  if (error) return <div role="alert" style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontSize: 13 }}>{error}</div>;
  if (!datos) return <div style={{ padding: 24, color: "#64748b", fontSize: 13 }}>Cargando…</div>;

  const ubicaciones = datos.ubicaciones;
  const sinExplicar = ubicaciones.reduce((a, u) => a + u.negativos, 0);
  const ubicacionesConNegativos = ubicaciones.filter((u) => u.negativos > 0).length;
  const conteoVencido = (u) => !u.ultimo_conteo || diasDesde(u.ultimo_conteo) > datos.dias_alerta_conteo;
  const sinConteo = ubicaciones.filter(conteoVencido).length;
  const aPedir = cuentaNiveles.critico + cuentaNiveles.bajo;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c2410c" }}>Stock nuevo</div>
        <h1 style={{ margin: "2px 0 0", fontSize: 24, color: "#0f172a" }}>Dashboard</h1>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Qué hay que pedir, qué no cierra y qué falta contar. Hoy es {fmtFecha(datos.hoy)}.</div>
      </div>

      {mensaje && (
        <div role={mensaje.tipo === "ok" ? "status" : "alert"} style={{
          background: mensaje.tipo === "ok" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${mensaje.tipo === "ok" ? "#bbf7d0" : "#fecaca"}`,
          color: mensaje.tipo === "ok" ? "#166534" : "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: 13,
        }}>{mensaje.texto}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
        <Indicador titulo="Para pedir (Oficina)" valor={aPedir} color={aPedir ? "#b91c1c" : "#15803d"}
          detalle={`${cuentaNiveles.critico} críticos y ${cuentaNiveles.bajo} bajos`} />
        <Indicador titulo="Productos sin explicar" valor={sinExplicar} color={sinExplicar ? "#b45309" : "#15803d"}
          detalle={sinExplicar ? `En ${ubicacionesConNegativos} ubicaciones: falta un envío o un conteo` : "Todo cierra"} href={`${RUTA}/ubicaciones`} />
        <Indicador titulo="Sin conteo reciente" valor={sinConteo} color={sinConteo ? "#b45309" : "#15803d"}
          detalle={`Ubicaciones sin conteo o con más de ${datos.dias_alerta_conteo} días`} />
        <Indicador titulo="Retirados atrasados" valor={datos.retirados.atrasados} color={datos.retirados.atrasados ? "#b91c1c" : "#15803d"}
          detalle={`De ${datos.retirados.pendientes} pendientes, más de ${datos.retirados.dias_alerta} días`} href={`${RUTA}/retirados`} />
        <Indicador titulo="Faltantes sin resolver" valor={datos.faltantes} color={datos.faltantes ? "#b45309" : "#15803d"}
          detalle="Piezas que no volvieron con un retirado" href={`${RUTA}/retirados`} />
      </div>

      <section aria-label="Reposición de la Oficina" style={{ ...tarjeta, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17 }}>Reposición de la Oficina</h2>
            <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2, maxWidth: 820 }}>
              El consumo es el promedio diario de los últimos {datos.ventana_dias} días (tickets y salidas). Crítico: stock por debajo del mínimo o {DIAS_CRITICO} días o menos. Bajo: hasta {DIAS_BAJO} días.
              La fecha para pedir descuenta el plazo de entrega de cada producto (si no tiene, 3 días).
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {[["todos", "Todos"], ["critico", "Críticos"], ["bajo", "Bajos"], ["ok", "Con stock"], ["sinconsumo", "Sin consumo"]].map(([clave, texto]) => (
              <button key={clave} type="button" aria-pressed={nivel === clave} onClick={() => setNivel(clave)}
                style={{ minHeight: 36, padding: "0 14px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#ffffff", cursor: "pointer", fontFamily: "inherit", background: nivel === clave ? "#c2410c" : "#4a5463" }}>
                {texto} ({cuentaNiveles[clave]})
              </button>
            ))}
            <label htmlFor="buscar-repos" className="sr-only">Buscar producto</label>
            <input id="buscar-repos" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o código"
              style={{ marginLeft: "auto", width: 240, fontSize: 13.5, border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px" }} />
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr>
                <th style={TH}>Producto</th>
                <th style={{ ...TH, textAlign: "right" }}>Stock</th>
                <th style={{ ...TH, textAlign: "right" }}>Mínimo</th>
                <th style={{ ...TH, textAlign: "right" }}>Consumo por día</th>
                <th style={{ ...TH, textAlign: "right" }}>Días de stock</th>
                <th style={TH}>Pedir antes del</th>
                <th style={TH}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan={7} style={{ ...TD, color: "#64748b" }}>No hay productos con ese filtro.</td></tr>}
              {lista.map((r) => {
                const n = NIVELES[r.nivel];
                return (
                  <tr key={r.producto_id}>
                    <td style={TD}><div style={{ fontWeight: 600 }}>{r.descripcion}</div><div style={{ ...MONO, fontSize: 11, color: "#94a3b8" }}>{r.codigo}</div></td>
                    <td style={{ ...TD, ...NUM, fontWeight: 700 }}>{r.stock}</td>
                    <td style={{ ...TD, textAlign: "right" }}>
                      {editando === r.producto_id ? (
                        <input type="number" min="0" autoFocus defaultValue={r.minimo ?? ""} aria-label={`Mínimo de ${r.descripcion}`}
                          onBlur={(e) => guardarMinimo(r, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditando(null); }}
                          style={{ ...MONO, width: 70, textAlign: "right", fontSize: 13.5, border: "1px solid #1d4e89", borderRadius: 6, padding: "4px 6px" }} />
                      ) : (
                        <button type="button" onClick={() => setEditando(r.producto_id)} aria-label={`Cambiar el mínimo de ${r.descripcion}`}
                          style={{ ...MONO, border: "1px dashed #94a3b8", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: 13.5, padding: "3px 10px", color: r.minimo == null ? "#94a3b8" : "#0f172a" }}>
                          {r.minimo ?? "Fijar"}
                        </button>
                      )}
                    </td>
                    <td style={{ ...TD, ...NUM, color: r.consumo_por_dia ? "#0f172a" : "#cbd5e1" }}>{r.consumo_por_dia || "—"}</td>
                    <td style={{ ...TD, ...NUM, fontWeight: 700, color: r.nivel === "critico" ? "#b91c1c" : "#0f172a" }}>{r.dias_de_stock == null ? "—" : r.dias_de_stock}</td>
                    <td style={{ ...TD, ...MONO, fontSize: 13 }}>{r.pedir_el ? fmtFecha(r.pedir_el) : "—"}</td>
                    <td style={TD}><span style={{ background: n.fondo, color: n.color, fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: "2px 10px", whiteSpace: "nowrap" }}>{n.texto}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Estado por ubicación" style={{ ...tarjeta, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17 }}>Estado de cada ubicación</h2>
            <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>Cuándo se contó por última vez y cuántos productos no cierran.</div>
          </div>
          {rol === "admin" && (
            <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, color: "#64748b" }}>
              <label htmlFor="dias-conteo">Alertar el conteo después de</label>
              <input id="dias-conteo" type="number" min="1" max="365" value={diasConteo} onChange={(e) => setDiasConteo(e.target.value)}
                style={{ ...MONO, width: 64, textAlign: "right", border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px" }} />
              <span>días</span>
              <button type="button" onClick={guardarDiasConteo} style={{ border: "none", borderRadius: 8, background: "#1d4e89", color: "#ffffff", fontWeight: 700, fontSize: 12.5, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}>Guardar</button>
            </span>
          )}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr>
                <th style={TH}>Ubicación</th>
                <th style={TH}>Último conteo</th>
                <th style={{ ...TH, textAlign: "right" }}>Productos</th>
                <th style={{ ...TH, textAlign: "right" }}>Sin explicar</th>
                <th style={TH}><span className="sr-only">Ver</span></th>
              </tr>
            </thead>
            <tbody>
              {agruparPorSegmento(ubicaciones).map(([segmento, items]) => (
                <FilaSegmento key={segmento.clave} segmento={segmento} items={items} conteoVencido={conteoVencido} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FilaSegmento({ segmento, items, conteoVencido }) {
  return (
    <>
      <tr><td colSpan={5} style={{ padding: "7px 12px", background: "#f1f5f9", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#475569" }}>{segmento.nombre}</td></tr>
      {items.map((u) => {
        const vencido = conteoVencido(u);
        return (
          <tr key={u.id}>
            <td style={TD}>
              <div style={{ fontWeight: 600 }}>{u.nombre.trim()}</div>
              {localidadAMostrar(u) && <div style={{ fontSize: 12, color: "#64748b" }}>{localidadAMostrar(u)}</div>}
            </td>
            <td style={{ ...TD, color: vencido ? "#b45309" : "#334155", fontWeight: vencido ? 700 : 400 }}>
              {u.ultimo_conteo ? `${fmtFecha(u.ultimo_conteo)} · ${hace(u.ultimo_conteo)}` : "Sin conteo"}
            </td>
            <td style={{ ...TD, ...NUM }}>{u.productos}</td>
            <td style={{ ...TD, ...NUM, fontWeight: 700, color: u.negativos ? "#b91c1c" : "#15803d" }}>{u.negativos || "0"}</td>
            <td style={{ ...TD, textAlign: "right" }}>
              <Link href={`${RUTA}/ubicaciones?ubicacion=${u.id}`}
                style={{ display: "inline-flex", alignItems: "center", minHeight: 32, padding: "0 12px", borderRadius: 8, background: "#1d4e89", color: "#ffffff", fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>
                Ver stock
              </Link>
            </td>
          </tr>
        );
      })}
    </>
  );
}
