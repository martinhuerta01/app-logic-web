"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";

const TH = {
  textAlign: "left", padding: "9px 12px", fontSize: 9.5, fontWeight: 600,
  letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8",
  background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
};
const TD = { padding: "9px 12px", fontSize: 12.5, color: "#334155", borderBottom: "1px solid #f1f5f9" };

const TABS = [
  { key: "serenisima", label: "La Serenísima", defaultKeyword: "General Rodríguez" },
  { key: "otros", label: "Otros clientes", defaultKeyword: "Camioneta 1" },
];

export default function TalleresPage() {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [mapeo,       setMapeo]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [aviso,       setAviso]       = useState("");

  const [tab,     setTab]     = useState("serenisima");
  const [keyword, setKeyword] = useState("");
  const [ubicId,  setUbicId]  = useState("");
  const [guardando, setGuardando] = useState(false);

  // La Serenísima descuenta de los CDs; los otros clientes descuentan del
  // pool "general" del taller/técnico (Vitaco, Taller Bahía Blanca, Camioneta 1, etc.)
  const opcionesUbicacion = useMemo(
    () => [...ubicaciones]
      .filter((u) => (tab === "serenisima" ? u.tipo === "cd" : u.tipo === "general"))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [ubicaciones, tab]
  );
  const ubicPorId = useMemo(() => new Map(ubicaciones.map((u) => [u.id, u])), [ubicaciones]);
  const filas = useMemo(() => mapeo.filter((m) => (m.aplica_a || "serenisima") === tab), [mapeo, tab]);

  const cargar = async () => {
    setError("");
    try {
      const [ubics, mp] = await Promise.all([api.get("/stock/ubicaciones/"), api.get("/stock/mapeo-talleres/")]);
      setUbicaciones(ubics || []); setMapeo(mp || []);
    } catch {
      setError("No se pudo cargar el mapeo de talleres. Verificá la conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const agregar = async () => {
    const kw = keyword.trim().toLowerCase();
    if (!kw || !ubicId) { setAviso("Error: completá la palabra clave y elegí una ubicación"); return; }
    setGuardando(true); setAviso("");
    try {
      await api.post("/stock/mapeo-talleres/", { keyword: kw, ubicacion_id: ubicId, aplica_a: tab, activo: true });
      setKeyword(""); setUbicId("");
      await cargar();
    } catch (e) {
      setAviso(`Error: ${String(e.message).slice(0, 140)}`);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarUbicacion = async (id, ubicacion_id) => {
    try { await api.put(`/stock/mapeo-talleres/${id}`, { ubicacion_id }); await cargar(); }
    catch (e) { setAviso(`Error: ${String(e.message).slice(0, 140)}`); }
  };

  const eliminar = async (id) => {
    try { await api.delete(`/stock/mapeo-talleres/${id}`); await cargar(); }
    catch (e) { setAviso(`Error: ${String(e.message).slice(0, 140)}`); }
  };

  const tabActual = TABS.find((t) => t.key === tab);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Mapeo de talleres</h1>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>
          Palabra clave en Base/descripción del ticket → ubicación de destino. El mismo taller puede tener un pool
          para La Serenísima y otro distinto para el resto de sus clientes.
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
          <div style={{ display: "flex", gap: 8 }}>
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: "7px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                border: tab === t.key ? "1.5px solid #2563eb" : "1.5px solid #e2e8f0",
                background: tab === t.key ? "#eff6ff" : "#f8fafc", color: tab === t.key ? "#2563eb" : "#64748b",
              }}>{t.label}</button>
            ))}
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={TH}>Palabra clave</th>
                  <th style={TH}>Resuelve a</th>
                  <th style={{ ...TH, width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 ? (
                  <tr><td colSpan={3} style={{ ...TD, color: "#94a3b8" }}>Sin palabras clave cargadas para &ldquo;{tabActual.label}&rdquo; todavía.</td></tr>
                ) : filas.map((m) => (
                  <tr key={m.id}>
                    <td style={{ ...TD, fontFamily: "DM Mono, monospace" }}>{m.keyword}</td>
                    <td style={TD}>
                      <select value={m.ubicacion_id} onChange={(e) => cambiarUbicacion(m.id, e.target.value)}
                        style={{ fontSize: 12, padding: "5px 7px", borderRadius: 6, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#334155", minWidth: 180 }}>
                        {!opcionesUbicacion.some((u) => u.id === m.ubicacion_id) && ubicPorId.get(m.ubicacion_id) && (
                          <option value={m.ubicacion_id}>{ubicPorId.get(m.ubicacion_id).nombre}</option>
                        )}
                        {opcionesUbicacion.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                      </select>
                    </td>
                    <td style={TD}>
                      <button onClick={() => eliminar(m.id)} style={{ border: "none", background: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 15 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: 12, borderTop: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="ej. mar de ajo"
                  style={{ flex: 1, fontSize: 12.5, padding: "7px 10px", borderRadius: 8, border: "1.5px dashed #cbd5e1" }} />
                <select value={ubicId} onChange={(e) => setUbicId(e.target.value)}
                  style={{ fontSize: 12.5, padding: "7px 10px", borderRadius: 8, border: "1.5px dashed #cbd5e1", color: ubicId ? "#334155" : "#94a3b8", minWidth: 170 }}>
                  <option value="">Elegir ubicación…</option>
                  {opcionesUbicacion.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
                <button onClick={agregar} disabled={guardando}
                  style={{ border: "none", background: "none", color: "#2563eb", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: "0 6px" }}>
                  + Agregar
                </button>
              </div>
            </div>
          </div>

          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
            &ldquo;{tabActual.defaultKeyword}&rdquo; no hace falta cargarlo acá: es el destino por defecto de &ldquo;{tabActual.label}&rdquo; cuando ninguna palabra clave matchea.
          </div>
        </>
      )}
      {loading && <p style={{ color: "#94a3b8", fontSize: 13 }}>Cargando…</p>}
    </div>
  );
}
