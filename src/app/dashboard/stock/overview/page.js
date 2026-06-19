"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
const HOY = new Date().toISOString().slice(0, 10);

function diffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtFecha(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function calcStats(movsProd, stockActual) {
  const entradas = movsProd
    .filter(m => m.tipo === "ENTRADA" || m.tipo === "COMPRA" ||
                 m.tipo?.toLowerCase() === "entrada" || m.tipo?.toLowerCase() === "compra")
    .sort((a, b) => a.fecha > b.fecha ? 1 : -1);

  if (entradas.length === 0) return { consumoDiario: null, diasRestantes: null, fechaCompra: null };

  const lotes = entradas.map((e, i) => {
    const nextFecha = entradas[i + 1]?.fecha ?? HOY;
    return { cantidad: e.cantidad, dias: diffDays(e.fecha, nextFecha) };
  });

  const historicos = lotes.slice(0, -1);
  const avgDias = historicos.length > 0
    ? Math.round(historicos.reduce((s, l) => s + l.dias, 0) / historicos.length)
    : null;
  const avgCantidad = historicos.length > 0
    ? Math.round(historicos.reduce((s, l) => s + l.cantidad, 0) / historicos.length)
    : entradas[0]?.cantidad ?? null;

  const consumoDiario = avgDias && avgCantidad ? +(avgCantidad / avgDias).toFixed(2) : null;
  const diasRestantes = consumoDiario && stockActual != null
    ? Math.round(stockActual / consumoDiario) : null;
  const fechaCompra = diasRestantes != null
    ? addDays(HOY, Math.max(0, diasRestantes - 3)) : null;

  return { consumoDiario, diasRestantes, fechaCompra };
}

function urgenciaNivel(diasRestantes, stock) {
  if (stock === 0) return "critico";
  if (diasRestantes != null) {
    if (diasRestantes <= 7)  return "critico";
    if (diasRestantes <= 20) return "bajo";
    return "ok";
  }
  // sin datos de consumo: usar cantidad absoluta
  if (stock <= 2)  return "critico";
  if (stock <= 8)  return "bajo";
  return "ok";
}

const NIVEL_STYLE = {
  critico: { bar: "#ef4444", badge: { bg: "#fef2f2", color: "#dc2626" }, label: "Crítico" },
  bajo:    { bar: "#f97316", badge: { bg: "#fff7ed", color: "#ea580c" }, label: "Bajo"    },
  ok:      { bar: "#22c55e", badge: { bg: "#f0fdf4", color: "#16a34a" }, label: "OK"      },
};

const NIVEL_ORDER = { critico: 0, bajo: 1, ok: 2 };

// ── Componente tarjeta ─────────────────────────────────────────────────────────
function ProductoCard({ prod, stock, movimientos, oficina, onClick }) {
  const movsProd = movimientos.filter(m => String(m.producto_id) === String(prod.id));
  const { consumoDiario, diasRestantes, fechaCompra } = calcStats(movsProd, stock);
  const nivel = urgenciaNivel(diasRestantes, stock);
  const ns = NIVEL_STYLE[nivel];

  // Barra de nivel: % visual relativo a un "máximo estimado"
  const maxEstimado = useMemo(() => {
    const entradas = movsProd
      .filter(m => m.tipo === "ENTRADA" || m.tipo === "COMPRA" ||
                   m.tipo?.toLowerCase() === "entrada" || m.tipo?.toLowerCase() === "compra")
      .map(m => m.cantidad);
    return entradas.length > 0 ? Math.max(...entradas) : Math.max(stock, 10);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimientos, prod.id, stock]);

  const pct = maxEstimado > 0 ? Math.min(100, Math.round((stock / maxEstimado) * 100)) : 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        border: `1.5px solid ${nivel === "critico" ? "#fecaca" : nivel === "bajo" ? "#fed7aa" : "#e2e8f0"}`,
        borderRadius: 12,
        padding: "16px 18px",
        cursor: "pointer",
        transition: "box-shadow 150ms, transform 150ms",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
    >
      {/* Acento lateral izquierdo */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: ns.bar, borderRadius: "12px 0 0 12px" }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1e293b", lineHeight: 1.3, flex: 1, paddingRight: 8 }}>
          {prod.descripcion}
        </p>
        <span style={{
          fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
          background: ns.badge.bg, color: ns.badge.color, whiteSpace: "nowrap",
        }}>
          {ns.label}
        </span>
      </div>

      {/* Cantidad */}
      <p style={{
        margin: "0 0 10px",
        fontSize: 32, fontWeight: 700, lineHeight: 1,
        fontFamily: "var(--font-mono, 'DM Mono', monospace)",
        color: nivel === "critico" ? "#dc2626" : nivel === "bajo" ? "#ea580c" : "#1e293b",
      }}>
        {stock}
        <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8", marginLeft: 4 }}>u.</span>
      </p>

      {/* Barra */}
      <div style={{ background: "#f1f5f9", borderRadius: 999, height: 5, marginBottom: 12, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: ns.bar, borderRadius: 999, transition: "width 600ms ease" }} />
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
        <div>
          <p style={{ margin: 0, fontSize: 9.5, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Consumo/día</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 600, color: "#334155", fontFamily: "DM Mono, monospace" }}>
            {consumoDiario != null ? `${consumoDiario} u.` : "—"}
          </p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 9.5, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Días restantes</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 600, color: nivel === "critico" ? "#dc2626" : nivel === "bajo" ? "#ea580c" : "#334155", fontFamily: "DM Mono, monospace" }}>
            {diasRestantes != null ? `${diasRestantes} d.` : "—"}
          </p>
        </div>
        {fechaCompra && (
          <div style={{ gridColumn: "1/-1" }}>
            <p style={{ margin: 0, fontSize: 9.5, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Pedir antes de</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 600, color: "#2563eb", fontFamily: "DM Mono, monospace" }}>
              {fmtFecha(fechaCompra)}
            </p>
          </div>
        )}
        {prod.categoria && (
          <div style={{ gridColumn: "1/-1" }}>
            <span style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 500 }}>{prod.categoria}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function StockOverview() {
  const router = useRouter();
  const [productos,   setProductos]   = useState([]);
  const [stockActual, setStockActual] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [oficina,     setOficina]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [filtroNivel, setFiltroNivel] = useState("todos");
  const [filtroCat,   setFiltroCat]   = useState("todas");

  useEffect(() => {
    const cargar = async () => {
      try {
        const [prods, ubics] = await Promise.all([
          api.get("/stock/productos/"),
          api.get("/stock/ubicaciones/"),
        ]);
        setProductos(prods || []);
        const ofic = (ubics || []).find(u => u.nombre?.toLowerCase() === "oficina" || u.tipo === "oficina");
        setOficina(ofic);
        if (ofic) {
          const [stock, movs] = await Promise.all([
            api.get("/stock/actual/", { ubicacion_id: ofic.id }),
            api.get("/stock/movimientos/"),
          ]);
          setStockActual(stock || []);
          setMovimientos(movs || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  // Construir lista de productos con stock
  const resumen = useMemo(() => {
    const hace90 = addDays(HOY, -90);
    return productos
      .map(prod => {
        const stockItem = stockActual.find(s => s.producto_id === prod.id);
        const stock = stockItem?.cantidad ?? 0;
        const movsProd = movimientos.filter(m => String(m.producto_id) === String(prod.id));
        const { diasRestantes } = calcStats(movsProd, stock);
        const nivel = urgenciaNivel(diasRestantes, stock);
        // fecha del último movimiento de este producto
        const ultimoMov = movsProd.length > 0
          ? movsProd.reduce((max, m) => m.fecha > max ? m.fecha : max, movsProd[0].fecha)
          : null;
        return { prod, stock, nivel, diasRestantes, ultimoMov };
      })
      .filter(r => {
        // con stock > 0: siempre mostrar
        if (r.stock > 0) return true;
        // stock 0 pero con movimiento en los últimos 90 días: crítico real
        if (r.ultimoMov && r.ultimoMov >= hace90) return true;
        // stock 0 sin movimientos recientes: producto inactivo, ocultar
        return false;
      })
      .sort((a, b) => {
        const no = NIVEL_ORDER[a.nivel] - NIVEL_ORDER[b.nivel];
        if (no !== 0) return no;
        // dentro del mismo nivel: menor días restantes primero
        if (a.diasRestantes != null && b.diasRestantes != null) return a.diasRestantes - b.diasRestantes;
        if (a.diasRestantes != null) return -1;
        if (b.diasRestantes != null) return 1;
        return a.stock - b.stock;
      });
  }, [productos, stockActual, movimientos]);

  const categorias = useMemo(() => {
    const cats = new Set(resumen.map(r => r.prod.categoria).filter(Boolean));
    return ["todas", ...Array.from(cats).sort()];
  }, [resumen]);

  const criticos  = resumen.filter(r => r.nivel === "critico").length;
  const bajos     = resumen.filter(r => r.nivel === "bajo").length;
  const ok        = resumen.filter(r => r.nivel === "ok").length;
  const conStock0 = resumen.filter(r => r.stock === 0).length;

  const visibles = resumen.filter(r => {
    if (filtroNivel !== "todos" && r.nivel !== filtroNivel) return false;
    if (filtroCat !== "todas" && r.prod.categoria !== filtroCat) return false;
    return true;
  });

  const chipStyle = (activo) => ({
    padding: "4px 12px",
    borderRadius: 999,
    fontSize: 11.5,
    fontWeight: 600,
    border: activo ? "1.5px solid #2563eb" : "1.5px solid #e2e8f0",
    background: activo ? "#eff6ff" : "#f8fafc",
    color: activo ? "#2563eb" : "#64748b",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 120ms",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Dashboard de Stock</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>Insumos de oficina — nivel actual y estimación de pedido</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/stock/oficina?tab=actual")}
          style={{
            padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: "#f8fafc", border: "1.5px solid #e2e8f0", color: "#475569",
            cursor: "pointer",
          }}
        >
          Ver lista completa →
        </button>
      </div>

      {loading ? (
        <div style={{ color: "#94a3b8", fontSize: 13 }}>Cargando stock…</div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "Productos", value: resumen.length, accent: "#0f172a", meta: "en oficina" },
              { label: "Crítico",   value: criticos,       accent: "#dc2626", meta: criticos > 0 ? "≤ 7 días o sin stock" : "todo bien" },
              { label: "Bajo",      value: bajos,          accent: "#f97316", meta: "8 – 20 días" },
              { label: "OK",        value: ok,             accent: "#16a34a", meta: "> 20 días" },
            ].map(k => (
              <div key={k.label} style={{
                background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
                padding: "14px 16px", position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: k.accent, borderRadius: "10px 10px 0 0" }} />
                <p style={{ margin: 0, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>{k.label}</p>
                <p style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 700, lineHeight: 1, fontFamily: "DM Mono, monospace", color: "#0f172a" }}>{k.value}</p>
                <p style={{ margin: "5px 0 0", fontSize: 10, color: k.accent }}>{k.meta}</p>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {/* Nivel */}
            {[
              { key: "todos",   label: "Todos" },
              { key: "critico", label: "Crítico" },
              { key: "bajo",    label: "Bajo" },
              { key: "ok",      label: "OK" },
            ].map(f => (
              <button key={f.key} onClick={() => setFiltroNivel(f.key)} style={chipStyle(filtroNivel === f.key)}>
                {f.label}
              </button>
            ))}

            {/* Separador */}
            {categorias.length > 1 && (
              <>
                <span style={{ width: 1, height: 18, background: "#e2e8f0", margin: "0 4px" }} />
                {categorias.map(c => (
                  <button key={c} onClick={() => setFiltroCat(c)} style={chipStyle(filtroCat === c)}>
                    {c === "todas" ? "Todas las categorías" : c}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Alerta stock 0 */}
          {conStock0 > 0 && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
              padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
              fontSize: 13, color: "#b91c1c",
            }}>
              <span style={{ fontSize: 16 }}>⚠</span>
              <span>
                <strong>{conStock0} producto{conStock0 !== 1 ? "s" : ""}</strong> con stock en cero — revisar entradas o ajustar inventario.
              </span>
            </div>
          )}

          {/* Grid de tarjetas */}
          {visibles.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>No hay productos para mostrar con ese filtro.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
              {visibles.map(({ prod, stock }) => (
                <ProductoCard
                  key={prod.id}
                  prod={prod}
                  stock={stock}
                  movimientos={movimientos}
                  oficina={oficina}
                  onClick={() => router.push(`/dashboard/stock/oficina?tab=busqueda`)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
