"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import Modal, { BtnPrimary, BtnSecondary } from "@/components/Modal";
import RegistrarMovimiento from "@/components/RegistrarMovimiento";
import { tipoInfo, signoMov, fmtFecha } from "@/lib/stockTipos";
import BotonExportar from "@/components/BotonExportar";
import { descargarTabla } from "@/lib/exportaciones";

const TH = {
  textAlign: "left", padding: "9px 12px", fontSize: 9.5, fontWeight: 600,
  letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8",
  background: "#f8fafc", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap",
};
const TD = { padding: "9px 12px", fontSize: 12.5, color: "#334155", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" };
const CTRL = {
  fontSize: 12.5, padding: "6px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0",
  background: "#f8fafc", color: "#334155", fontFamily: "inherit",
};
const PAGINA = 150;
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function Movimientos() {
  const [productos,   setProductos]   = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [movs,        setMovs]        = useState([]);
  const [stock,       setStock]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [aviso,       setAviso]       = useState("");

  const [q, setQ]         = useState("");
  const [tipo, setTipo]   = useState("");
  const [ubic, setUbic]   = useState("");
  const [mes, setMes]     = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [limite, setLimite] = useState(PAGINA);

  const [registrando, setRegistrando] = useState(false);
  const [aBorrar, setABorrar]         = useState(null);
  const [borrando, setBorrando]       = useState(false);

  const cargar = async () => {
    setError("");
    try {
      const [prods, ubics, ms, st] = await Promise.all([
        api.get("/stock/productos/"), api.get("/stock/ubicaciones/"),
        api.get("/stock/movimientos/"), api.get("/stock/actual/"),
      ]);
      setProductos(prods || []); setUbicaciones(ubics || []); setMovs(ms || []); setStock(st || []);
    } catch {
      setError("No se pudieron cargar los movimientos. Verificá la conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const ubicPorId = useMemo(() => new Map(ubicaciones.map(u => [u.id, u])), [ubicaciones]);
  const prodPorId = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos]);

  const tiposPresentes = useMemo(
    () => [...new Set(movs.map(m => String(m.tipo || "").toUpperCase()).filter(Boolean))].sort(),
    [movs]
  );

  const mesesDisponibles = useMemo(() => {
    const set = new Set(movs.map(m => (m.fecha || "").slice(0, 7)).filter(Boolean));
    return [...set].sort().reverse().map(ym => {
      const [y, mm] = ym.split("-").map(Number);
      return { value: ym, label: `${MESES[mm - 1]} ${y}` };
    });
  }, [movs]);

  const aplicarMes = (ym) => {
    setMes(ym);
    setLimite(PAGINA);
    if (!ym) return;
    const [y, m] = ym.split("-").map(Number);
    const ultimoDia = new Date(y, m, 0).getDate();
    setDesde(`${ym}-01`);
    setHasta(`${ym}-${String(ultimoDia).padStart(2, "0")}`);
  };

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return movs.filter(m => {
      const p = m.productos || prodPorId.get(m.producto_id) || {};
      if (t && !`${p.codigo || ""} ${p.descripcion || ""} ${m.observacion || ""}`.toLowerCase().includes(t)) return false;
      if (tipo && String(m.tipo || "").toUpperCase() !== tipo) return false;
      if (ubic && m.origen_id !== ubic && m.destino_id !== ubic) return false;
      if (desde && (m.fecha || "") < desde) return false;
      if (hasta && (m.fecha || "") > hasta) return false;
      return true;
    });
  }, [movs, prodPorId, q, tipo, ubic, desde, hasta]);

  const totales = useMemo(() => {
    const acc = new Map();
    for (const m of filtrados) {
      const k = String(m.tipo || "").toUpperCase();
      acc.set(k, (acc.get(k) || 0) + 1);
    }
    return [...acc];
  }, [filtrados]);

  const hayFiltros = q || tipo || ubic || mes || desde || hasta;
  const limpiar = () => { setQ(""); setTipo(""); setUbic(""); setMes(""); setDesde(""); setHasta(""); setLimite(PAGINA); };

  const eliminar = async () => {
    setBorrando(true);
    try {
      await api.delete(`/stock/movimientos/${aBorrar.id}/`);
      setAviso("Movimiento eliminado y stock ajustado");
      setABorrar(null);
      await cargar();
    } catch (e) {
      setError("No se pudo eliminar: " + String(e.message).slice(0, 120));
      setABorrar(null);
    } finally {
      setBorrando(false);
    }
  };

  const desc = (m) => {
    const p = m.productos || prodPorId.get(m.producto_id) || {};
    return { codigo: p.codigo || "?", descripcion: p.descripcion || "" };
  };
  const nombreUbic = (id) => (id ? ubicPorId.get(id)?.nombre || "?" : null);

  // Exporta todos los movimientos que se están viendo con los filtros (no solo los que se muestran en pantalla)
  const exportar = () => descargarTabla(
    `Movimientos_stock_${new Date().toLocaleDateString("sv-SE")}.xlsx`, "Movimientos",
    ["Fecha", "Tipo", "Código", "Producto", "Número de serie", "Desde", "Hacia", "Cantidad", "Observación", "Cargado por"],
    filtrados.map((m) => {
      const d = desc(m), s = signoMov(m);
      return [fmtFecha(m.fecha), tipoInfo(m.tipo).label, d.codigo, d.descripcion, m.serial || "", nombreUbic(m.origen_id) || "", nombreUbic(m.destino_id) || "",
        s === 0 ? m.cantidad : s * m.cantidad, m.observacion || "", m.cargado_por || ""];
    }),
    [12, 14, 10, 38, 20, 22, 22, 10, 40, 22]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Movimientos de stock</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>
            Todas las entradas, salidas, consumos y ajustes en un solo lugar
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <BotonExportar onExportar={exportar}>Exportar a Excel</BotonExportar>
          <BtnPrimary onClick={() => setRegistrando(true)}>+ Registrar movimiento</BtnPrimary>
        </div>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#b91c1c" }}>{error}</div>}
      {aviso && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#166534" }}>{aviso}</div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input value={q} onChange={e => { setQ(e.target.value); setLimite(PAGINA); }} placeholder="Buscar insumo, código o referencia…" style={{ ...CTRL, flex: 1, minWidth: 220 }} />
        <select value={tipo} onChange={e => setTipo(e.target.value)} style={CTRL}>
          <option value="">Todos los tipos</option>
          {tiposPresentes.map(t => <option key={t} value={t}>{tipoInfo(t).label}</option>)}
        </select>
        <select value={ubic} onChange={e => setUbic(e.target.value)} style={CTRL}>
          <option value="">Todas las ubicaciones</option>
          {[...ubicaciones].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
        <select value={mes} onChange={e => aplicarMes(e.target.value)} style={CTRL} title="Elegir mes completo">
          <option value="">Todos los meses</option>
          {mesesDisponibles.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setMes(""); }} style={CTRL} title="Desde" />
        <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setMes(""); }} style={CTRL} title="Hasta" />
        {hayFiltros && (
          <button onClick={limpiar} style={{ ...CTRL, cursor: "pointer", background: "transparent", color: "#2563eb", border: "none", fontWeight: 600 }}>Limpiar</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5, color: "#64748b" }}>
        <span>{filtrados.length} registro{filtrados.length !== 1 ? "s" : ""}</span>
        {totales.map(([t, n]) => {
          const ti = tipoInfo(t);
          return (
            <span key={t} style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: ti.bg, color: ti.color, fontFamily: "DM Mono, monospace" }}>
              {ti.label} {n}
            </span>
          );
        })}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
          <thead>
            <tr>
              <th style={TH}>Fecha</th><th style={TH}>Tipo</th><th style={TH}>Insumo</th>
              <th style={TH}>Desde → hacia</th>
              <th style={{ ...TH, textAlign: "right" }}>Cant.</th>
              <th style={TH}>Referencia</th><th style={TH}>Cargó</th><th style={{ ...TH, width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ ...TD, color: "#94a3b8" }}>Cargando…</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={8} style={{ ...TD, color: "#94a3b8" }}>No hay movimientos con esos filtros.</td></tr>
            ) : filtrados.slice(0, limite).map(m => {
              const ti = tipoInfo(m.tipo), s = signoMov(m), d = desc(m);
              const de = nombreUbic(m.origen_id), a = nombreUbic(m.destino_id);
              return (
                <tr key={m.id}>
                  <td style={{ ...TD, whiteSpace: "nowrap" }}>{fmtFecha(m.fecha)}</td>
                  <td style={TD}>
                    <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10.5, fontWeight: 700, background: ti.bg, color: ti.color }}>{ti.label}</span>
                  </td>
                  <td style={TD}>
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: 12, fontWeight: 600 }}>{d.codigo}</span>
                    <span style={{ color: "#64748b" }}> · {d.descripcion}</span>
                    {m.serial && (
                      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10.5, color: "#7c3aed", marginTop: 2 }}>
                        serial {m.serial}
                      </div>
                    )}
                  </td>
                  <td style={{ ...TD, fontSize: 12 }}>{de || "—"} <span style={{ color: "#cbd5e1" }}>→</span> {a || "—"}</td>
                  <td style={{ ...TD, textAlign: "right", fontFamily: "DM Mono, monospace", fontWeight: 700, color: s > 0 ? "#16a34a" : s < 0 ? "#dc2626" : "#334155" }}>
                    {s > 0 ? "+" : s < 0 ? "−" : ""}{m.cantidad}
                  </td>
                  <td style={{ ...TD, fontSize: 11.5, color: "#64748b" }}>{m.observacion || ""}</td>
                  <td style={{ ...TD, fontSize: 11.5, color: "#94a3b8" }}>{m.cargado_por || ""}</td>
                  <td style={TD}>
                    <button onClick={() => setABorrar(m)} title="Eliminar (ajusta el stock)"
                      style={{ border: "none", background: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 15, padding: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = "#dc2626"} onMouseLeave={e => e.currentTarget.style.color = "#cbd5e1"}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtrados.length > limite && (
        <button onClick={() => setLimite(l => l + PAGINA)} style={{ ...CTRL, cursor: "pointer", alignSelf: "center", fontWeight: 600 }}>
          Mostrar más ({filtrados.length - limite} restantes)
        </button>
      )}

      <RegistrarMovimiento
        open={registrando} onClose={() => setRegistrando(false)}
        productos={productos} ubicaciones={ubicaciones} stockActual={stock}
        onGuardado={(n) => { setAviso(`${n} movimiento${n !== 1 ? "s" : ""} registrado${n !== 1 ? "s" : ""}`); cargar(); }}
      />

      <Modal open={!!aBorrar} onClose={() => { if (!borrando) setABorrar(null); }} title="Eliminar movimiento" width="440px"
        footer={
          <>
            <span />
            <div style={{ display: "flex", gap: 8 }}>
              <BtnSecondary onClick={() => setABorrar(null)}>Cancelar</BtnSecondary>
              <BtnPrimary onClick={eliminar} loading={borrando}>Eliminar</BtnPrimary>
            </div>
          </>
        }>
        {aBorrar && (
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
            Se elimina el movimiento de <strong>{aBorrar.cantidad} × {desc(aBorrar).codigo}</strong> del {fmtFecha(aBorrar.fecha)}
            {" "}y el stock se ajusta automáticamente en sentido contrario.
          </p>
        )}
      </Modal>
    </div>
  );
}
