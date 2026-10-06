"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { BtnPrimary } from "@/components/Modal";
import RegistrarMovimiento from "@/components/RegistrarMovimiento";

const TH = {
  textAlign: "left", padding: "9px 12px", fontSize: 9.5, fontWeight: 600,
  letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8",
  background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
};
const TD = { padding: "9px 12px", fontSize: 12.5, color: "#334155", borderBottom: "1px solid #f1f5f9" };
const MONO = { fontFamily: "DM Mono, monospace" };

const esHerramienta = (p) => p.categoria?.toLowerCase() === "herramientas";
const esCamioneta = (u) => u.nombre?.toLowerCase().startsWith("camioneta");

export default function HerramientasPage() {
  const [productos,   setProductos]   = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [stock,       setStock]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [aviso,       setAviso]       = useState("");
  const [sel,         setSel]         = useState("");
  const [soloConStock, setSoloConStock] = useState(true);
  const [registrando, setRegistrando] = useState(false);

  const cargar = async () => {
    setError("");
    try {
      const [prods, ubics, st] = await Promise.all([
        api.get("/stock/productos/"), api.get("/stock/ubicaciones/"), api.get("/stock/actual/"),
      ]);
      setProductos(prods || []); setUbicaciones(ubics || []); setStock(st || []);
      setSel((actual) => actual || (ubics || []).find((u) => u.tipo === "oficina")?.id || "");
    } catch {
      setError("No se pudieron cargar las herramientas. Verificá la conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const lugares = useMemo(() => {
    const ofic = ubicaciones.filter((u) => u.tipo === "oficina");
    const cams = ubicaciones.filter(esCamioneta).sort((a, b) => a.nombre.localeCompare(b.nombre));
    return [...ofic, ...cams];
  }, [ubicaciones]);

  const herramientas = useMemo(
    () => productos.filter((p) => esHerramienta(p) && p.activo !== false)
      .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), undefined, { numeric: true })),
    [productos]
  );

  const cantidad = (ubicacionId, productoId) =>
    stock.filter((s) => s.ubicacion_id === ubicacionId && s.producto_id === productoId)
      .reduce((n, s) => n + (s.cantidad || 0), 0);

  const filas = herramientas
    .map((p) => ({ p, n: cantidad(sel, p.id) }))
    .filter((f) => !soloConStock || f.n !== 0);

  const chip = (activo) => ({
    padding: "4px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
    border: activo ? "1.5px solid #2563eb" : "1.5px solid #e2e8f0",
    background: activo ? "#eff6ff" : "#f8fafc", color: activo ? "#2563eb" : "#64748b",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Herramientas</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>
            Lo que tiene cada camioneta y la oficina — separado de los insumos que se consumen
          </p>
        </div>
        <BtnPrimary onClick={() => setRegistrando(true)}>+ Registrar movimiento</BtnPrimary>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#b91c1c" }}>{error}</div>}
      {aviso && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#166534" }}>{aviso}</div>}

      {!loading && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {lugares.map((u) => (
              <button key={u.id} onClick={() => setSel(u.id)} style={chip(sel === u.id)}>{u.nombre}</button>
            ))}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#475569", cursor: "pointer", marginLeft: 8 }}>
              <input type="checkbox" checked={soloConStock} onChange={(e) => setSoloConStock(e.target.checked)} style={{ accentColor: "#2563eb" }} />
              Solo las que tiene
            </label>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={TH}>Código</th>
                  <th style={TH}>Herramienta</th>
                  <th style={{ ...TH, textAlign: "right" }}>Cantidad</th>
                  {lugares.filter((u) => u.id !== sel).map((u) => (
                    <th key={u.id} style={{ ...TH, textAlign: "right" }}>{u.nombre}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 ? (
                  <tr><td colSpan={3 + lugares.length - 1} style={{ ...TD, color: "#94a3b8" }}>
                    No hay herramientas cargadas acá. Registrá una transferencia desde Oficina.
                  </td></tr>
                ) : filas.map(({ p, n }) => (
                  <tr key={p.id}>
                    <td style={{ ...TD, ...MONO, fontWeight: 600, color: "#0f172a" }}>{p.codigo}</td>
                    <td style={TD}>{p.descripcion}</td>
                    <td style={{ ...TD, ...MONO, textAlign: "right", fontWeight: 700, color: n > 0 ? "#16a34a" : "#dc2626" }}>{n}</td>
                    {lugares.filter((u) => u.id !== sel).map((u) => {
                      const o = cantidad(u.id, p.id);
                      return <td key={u.id} style={{ ...TD, ...MONO, textAlign: "right", color: o ? "#475569" : "#cbd5e1" }}>{o || "—"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: 0, fontSize: 11.5, color: "#94a3b8" }}>
            Las columnas de la derecha muestran lo mismo en las otras ubicaciones, para ver dónde está cada herramienta de un vistazo.
          </p>
        </>
      )}
      {loading && <p style={{ color: "#94a3b8", fontSize: 13 }}>Cargando…</p>}

      <RegistrarMovimiento
        open={registrando} onClose={() => setRegistrando(false)}
        productos={herramientas} ubicaciones={ubicaciones} stockActual={stock}
        onGuardado={(n) => { setAviso(`${n} movimiento${n !== 1 ? "s" : ""} registrado${n !== 1 ? "s" : ""}`); cargar(); }}
      />
    </div>
  );
}
