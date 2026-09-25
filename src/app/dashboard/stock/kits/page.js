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

const TIPOS_SUGERIDOS = [
  { key: "GPS_TICKET", label: "Instalación GPS" },
  { key: "PORTABLE_TICKET", label: "Portable" },
  { key: "CAMARA_TICKET", label: "Kit cámara" },
  { key: "CORTE_TICKET", label: "Corte" },
];

export default function KitsPage() {
  const [productos, setProductos] = useState([]);
  const [recetas,   setRecetas]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [aviso,     setAviso]     = useState("");

  const [tipo,   setTipo]   = useState("GPS_TICKET");
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cant,   setCant]   = useState("1");
  const [guardandoFila, setGuardandoFila] = useState(false);

  const cargar = async () => {
    setError("");
    try {
      const [prods, rec] = await Promise.all([api.get("/stock/productos/"), api.get("/stock/recetas/")]);
      setProductos(prods || []); setRecetas(rec || []);
    } catch {
      setError("No se pudieron cargar los kits. Verificá la conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const productosActivos = useMemo(() => productos.filter((p) => p.activo !== false), [productos]);

  const tiposExistentes = useMemo(
    () => [...new Set(recetas.map((r) => r.tipo_instalacion))],
    [recetas]
  );
  const tipos = useMemo(() => {
    const extra = tiposExistentes
      .filter((t) => !TIPOS_SUGERIDOS.some((s) => s.key === t))
      .map((t) => ({ key: t, label: t }));
    return [...TIPOS_SUGERIDOS, ...extra];
  }, [tiposExistentes]);

  const filas = useMemo(() => recetas.filter((r) => r.tipo_instalacion === tipo), [recetas, tipo]);

  const eliminarTipo = async (tipoKey) => {
    if (!confirm(`¿Eliminar el tipo "${tipoKey}" y sus ${recetas.filter((r) => r.tipo_instalacion === tipoKey).length} insumo(s) cargado(s)?`)) return;
    setAviso("");
    try {
      const filasDelTipo = recetas.filter((r) => r.tipo_instalacion === tipoKey);
      await Promise.all(filasDelTipo.map((r) => api.delete(`/stock/recetas/${r.id}`)));
      if (tipo === tipoKey) setTipo("GPS_TICKET");
      await cargar();
    } catch (e) {
      setAviso(`Error: ${String(e.message).slice(0, 140)}`);
    }
  };

  const agregar = async () => {
    const cod = codigo.trim().toUpperCase();
    const cantidad = parseInt(cant, 10);
    if (!cod || !cantidad || cantidad < 1) { setAviso("Error: elegí un código válido y una cantidad mayor a 0"); return; }
    const prod = productosActivos.find((p) => String(p.codigo).trim().toUpperCase() === cod);
    if (!prod) { setAviso(`Error: el código ${cod} no existe en Productos`); return; }
    setGuardandoFila(true); setAviso("");
    try {
      await api.post("/stock/recetas/", { tipo_instalacion: tipo, producto_id: prod.id, cantidad });
      setCodigo(""); setCant("1");
      await cargar();
    } catch (e) {
      setAviso(`Error: ${String(e.message).slice(0, 140)}`);
    } finally {
      setGuardandoFila(false);
    }
  };

  const actualizarCantidad = async (id, cantidad) => {
    if (!cantidad || cantidad < 1) return;
    try { await api.put(`/stock/recetas/${id}`, { cantidad }); await cargar(); }
    catch (e) { setAviso(`Error: ${String(e.message).slice(0, 140)}`); }
  };

  const eliminar = async (id) => {
    try { await api.delete(`/stock/recetas/${id}`); await cargar(); }
    catch (e) { setAviso(`Error: ${String(e.message).slice(0, 140)}`); }
  };

  const crearTipo = () => {
    const t = nuevoTipo.trim().toUpperCase().replace(/\s+/g, "_");
    if (!t) return;
    setTipo(t); setNuevoTipo("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Kits de instalación</h1>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>
          Qué insumos descuenta cada tipo de servicio al importar tickets — se edita acá, sin tocar código
        </p>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#b91c1c" }}>{error}</div>}
      {aviso && (
        <div style={{
          background: aviso.startsWith("Error") ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${aviso.startsWith("Error") ? "#fecaca" : "#bbf7d0"}`,
          borderRadius: 10, padding: "12px 16px", fontSize: 13, color: aviso.startsWith("Error") ? "#b91c1c" : "#166534",
        }}>{aviso}</div>
      )}

      {!loading && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {tipos.map((t) => (
              <span key={t.key} style={{
                display: "inline-flex", alignItems: "center", borderRadius: 999,
                border: tipo === t.key ? "1.5px solid #2563eb" : "1.5px solid #e2e8f0",
                background: tipo === t.key ? "#eff6ff" : "#f8fafc",
              }}>
                <button onClick={() => setTipo(t.key)} style={{
                  border: "none", background: "none", padding: "7px 0 7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                  color: tipo === t.key ? "#2563eb" : "#64748b",
                }}>{t.label}</button>
                <button onClick={() => eliminarTipo(t.key)} title={`Eliminar tipo "${t.label}"`} style={{
                  border: "none", background: "none", cursor: "pointer", padding: "7px 10px 7px 6px", fontSize: 13,
                  color: tipo === t.key ? "#2563eb" : "#94a3b8",
                }}>×</button>
              </span>
            ))}
            <input value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") crearTipo(); }}
              placeholder="+ nuevo tipo"
              style={{ fontSize: 12, padding: "6px 10px", borderRadius: 999, border: "1.5px dashed #cbd5e1", background: "transparent", width: 120 }} />
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={TH}>Código</th>
                  <th style={TH}>Insumo</th>
                  <th style={{ ...TH, textAlign: "right", width: 110 }}>Cantidad</th>
                  <th style={{ ...TH, width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 ? (
                  <tr><td colSpan={4} style={{ ...TD, color: "#94a3b8" }}>Sin insumos cargados para &ldquo;{tipo}&rdquo; todavía.</td></tr>
                ) : filas.map((r) => (
                  <tr key={r.id}>
                    <td style={{ ...TD, ...MONO, fontWeight: 600, color: "#0f172a" }}>{r.productos?.codigo}</td>
                    <td style={TD}>{r.productos?.descripcion}</td>
                    <td style={{ ...TD, textAlign: "right" }}>
                      <input type="number" min="1" defaultValue={r.cantidad}
                        onBlur={(e) => actualizarCantidad(r.id, parseInt(e.target.value, 10))}
                        style={{ width: 52, textAlign: "center", fontSize: 12.5, padding: "5px 6px", borderRadius: 6, border: "1.5px solid #e2e8f0", fontFamily: "DM Mono, monospace" }} />
                    </td>
                    <td style={TD}>
                      <button onClick={() => eliminar(r.id)} style={{ border: "none", background: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 15 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: 12, borderTop: "1px solid #f1f5f9" }}>
              <datalist id="codigos-kits">
                {productosActivos.map((p) => <option key={p.id} value={p.codigo}>{p.descripcion}</option>)}
              </datalist>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input list="codigos-kits" value={codigo} onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Código de insumo (ej. A20)"
                  style={{ flex: 1, fontSize: 12.5, padding: "7px 10px", borderRadius: 8, border: "1.5px dashed #cbd5e1", fontFamily: "DM Mono, monospace" }} />
                <input type="number" min="1" value={cant} onChange={(e) => setCant(e.target.value)}
                  style={{ width: 70, fontSize: 12.5, padding: "7px 10px", borderRadius: 8, border: "1.5px dashed #cbd5e1", textAlign: "center" }} />
                <button onClick={agregar} disabled={guardandoFila}
                  style={{ border: "none", background: "none", color: "#2563eb", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: "0 6px" }}>
                  + Agregar
                </button>
              </div>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 11.5, color: "#94a3b8" }}>
            Estos kits son los que usa el import de tickets (Stock → Descontar por tickets) — cambiar una cantidad acá no requiere tocar código.
          </p>
        </>
      )}
      {loading && <p style={{ color: "#94a3b8", fontSize: 13 }}>Cargando…</p>}
    </div>
  );
}
