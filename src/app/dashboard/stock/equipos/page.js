"use client";
import { useState, useEffect, useMemo, Fragment } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Modal, { BtnPrimary, BtnSecondary, FieldLabel, FieldInput, FieldSelect } from "@/components/Modal";
import { ESTADOS_EQUIPO, CONFIGURACIONES, tipoInfo, fmtFecha } from "@/lib/stockTipos";

const TH = {
  textAlign: "left", padding: "9px 12px", fontSize: 9.5, fontWeight: 600,
  letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8",
  background: "#f8fafc", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap",
};
const TD = { padding: "9px 12px", fontSize: 12.5, color: "#334155", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" };
const MONO = { fontFamily: "DM Mono, monospace" };
const CTRL = {
  fontSize: 12.5, padding: "6px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0",
  background: "#f8fafc", color: "#334155", fontFamily: "inherit",
};

const RESULTADOS_CONTROL = [
  { key: "USADO_OK_CAMPO",   titulo: "Reutilizable, controlado en campo",   detalle: "El técnico lo probó y funciona; se puede volver a instalar." },
  { key: "USADO_OK_OFICINA", titulo: "Reutilizable, controlado en oficina", detalle: "Se probó en oficina y funciona; se puede volver a instalar." },
  { key: "FALLA_RMA",        titulo: "Con falla (garantía)",                detalle: "No funciona bien; se envía a garantía o al proveedor." },
  { key: "BAJA",             titulo: "Dado de baja",                        detalle: "No se reutiliza ni se repara." },
];

function Estado({ estado }) {
  const e = ESTADOS_EQUIPO[estado] || { label: estado || "—", bg: "#f1f5f9", color: "#64748b" };
  return (
    <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 10.5, fontWeight: 700, background: e.bg, color: e.color, whiteSpace: "nowrap" }}>
      {e.label}
    </span>
  );
}

export default function EquiposPage() {
  const { user } = useAuth();
  const [equipos,     setEquipos]     = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [aviso,       setAviso]       = useState("");

  const [q,      setQ]      = useState("");
  const [estado, setEstado] = useState("");
  const [ubic,   setUbic]   = useState("");
  const [config, setConfig] = useState("");
  const [limite, setLimite] = useState(100);

  const [abierto,   setAbierto]   = useState(null);
  const [historial, setHistorial] = useState([]);
  const [editando,  setEditando]  = useState(null);
  const [form,      setForm]      = useState({});
  const [controlando, setControlando] = useState(null);
  const [resultado,   setResultado]   = useState("USADO_OK_CAMPO");
  const [nota,        setNota]        = useState("");
  const [guardando,   setGuardando]   = useState(false);
  const [msgModal,    setMsgModal]    = useState("");

  const cargar = async () => {
    setError("");
    try {
      const [eq, ub] = await Promise.all([api.get("/stock/equipos/"), api.get("/stock/ubicaciones/")]);
      setEquipos(eq || []); setUbicaciones(ub || []);
    } catch {
      setError("No se pudieron cargar los equipos. Verificá la conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const conteo = useMemo(() => {
    const c = {};
    equipos.forEach((e) => { c[e.estado] = (c[e.estado] || 0) + 1; });
    return c;
  }, [equipos]);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return equipos.filter((e) => {
      if (estado && e.estado !== estado) return false;
      if (ubic && e.ubicacion_id !== ubic) return false;
      if (config && e.configuracion !== config) return false;
      if (t && !`${e.serial} ${e.patente || ""} ${e.cliente || ""} ${e.productos?.descripcion || ""}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [equipos, q, estado, ubic, config]);

  const alternarHistorial = async (serial) => {
    if (abierto === serial) { setAbierto(null); return; }
    setAbierto(serial); setHistorial([]);
    try {
      const movs = await api.get("/stock/movimientos/", { serial });
      setHistorial(movs || []);
    } catch { setHistorial([]); }
  };

  const abrirEdicion = (e) => {
    setForm({
      estado: e.estado, ubicacion_id: e.ubicacion_id || "", patente: e.patente || "",
      configuracion: e.configuracion || "", cliente: e.cliente || "",
    });
    setMsgModal(""); setEditando(e);
  };

  const guardarEdicion = async () => {
    setGuardando(true); setMsgModal("");
    try {
      // Solo se mandan los campos con valor: el servidor no borra campos, corrige los que llegan
      const cuerpo = {};
      Object.entries(form).forEach(([k, v]) => { if (v !== "" && v !== (editando[k] ?? "")) cuerpo[k] = v; });
      if (Object.keys(cuerpo).length === 0) { setEditando(null); return; }
      await api.patch(`/stock/equipos/${encodeURIComponent(editando.serial)}/`, cuerpo);
      setAviso(`Equipo ${editando.serial} actualizado`);
      setEditando(null);
      await cargar();
    } catch (e) {
      setMsgModal("Error: " + String(e.message).slice(0, 140));
    } finally {
      setGuardando(false);
    }
  };

  const guardarControl = async () => {
    setGuardando(true); setMsgModal("");
    try {
      await api.post(`/stock/equipos/${encodeURIComponent(controlando.serial)}/control/`, {
        resultado, observacion: nota.trim() || null, cargado_por: user || undefined,
      });
      setAviso(`Control registrado para ${controlando.serial}`);
      setControlando(null); setNota("");
      await cargar();
    } catch (e) {
      setMsgModal("Error: " + String(e.message).slice(0, 140));
    } finally {
      setGuardando(false);
    }
  };

  const kpi = (label, value, accent, onClick) => (
    <div key={label} onClick={onClick} style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px",
      position: "relative", overflow: "hidden", cursor: onClick ? "pointer" : "default",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent }} />
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700, lineHeight: 1, ...MONO, color: "#0f172a" }}>{value}</p>
    </div>
  );

  const nombreUbic = (id) => ubicaciones.find((u) => u.id === id)?.nombre;
  const hayFiltros = q || estado || ubic || config;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Equipos por número de serie</h1>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>
          Dónde está cada dispositivo, con qué configuración y para qué cliente. Se actualiza solo al importar tickets.
        </p>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#b91c1c" }}>{error}</div>}
      {aviso && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#166534" }}>{aviso}</div>}

      {!loading && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            {kpi("Equipos registrados", equipos.length, "#0f172a", () => setEstado(""))}
            {kpi("Instalados", conteo.INSTALADO || 0, "#16a34a", () => setEstado("INSTALADO"))}
            {kpi("En stock", conteo.EN_STOCK || 0, "#2563eb", () => setEstado("EN_STOCK"))}
            {kpi("Retirados sin controlar", conteo.RETIRADO_PENDIENTE || 0, (conteo.RETIRADO_PENDIENTE || 0) ? "#ea580c" : "#16a34a", () => setEstado("RETIRADO_PENDIENTE"))}
            {kpi("Con falla o de baja", (conteo.FALLA_RMA || 0) + (conteo.BAJA || 0), "#94a3b8", () => setEstado("FALLA_RMA"))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input value={q} onChange={(e) => { setQ(e.target.value); setLimite(100); }} placeholder="Buscar serie, patente o cliente…" style={{ ...CTRL, flex: 1, minWidth: 220 }} />
            <select value={estado} onChange={(e) => setEstado(e.target.value)} style={CTRL}>
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS_EQUIPO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={ubic} onChange={(e) => setUbic(e.target.value)} style={CTRL}>
              <option value="">Todas las ubicaciones</option>
              {[...ubicaciones].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
            <select value={config} onChange={(e) => setConfig(e.target.value)} style={CTRL}>
              <option value="">Todas las configuraciones</option>
              {CONFIGURACIONES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {hayFiltros && (
              <button onClick={() => { setQ(""); setEstado(""); setUbic(""); setConfig(""); }}
                style={{ ...CTRL, cursor: "pointer", background: "transparent", color: "#2563eb", border: "none", fontWeight: 600 }}>Limpiar</button>
            )}
          </div>

          <p style={{ margin: 0, fontSize: 12.5, color: "#64748b" }}>{filtrados.length} equipo{filtrados.length !== 1 ? "s" : ""}</p>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 940 }}>
              <thead>
                <tr>
                  <th style={TH}>Serie</th><th style={TH}>Modelo</th><th style={TH}>Estado</th>
                  <th style={TH}>Ubicación o patente</th><th style={TH}>Configuración</th><th style={TH}>Cliente</th>
                  <th style={TH}>Actualizado</th><th style={TH}></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={8} style={{ ...TD, color: "#94a3b8" }}>
                    {equipos.length === 0
                      ? "Todavía no hay equipos registrados. Aparecen al importar tickets con número de serie."
                      : "No hay equipos con esos filtros."}
                  </td></tr>
                ) : filtrados.slice(0, limite).map((e) => (
                  <Fragment key={e.id}>
                    <tr>
                      <td style={{ ...TD, ...MONO, fontWeight: 600, color: "#0f172a" }}>{e.serial}</td>
                      <td style={TD}>{e.productos?.codigo} <span style={{ color: "#94a3b8" }}>· {e.productos?.descripcion}</span></td>
                      <td style={TD}><Estado estado={e.estado} /></td>
                      <td style={TD}>
                        {e.estado === "INSTALADO" && e.patente
                          ? <span style={MONO}>{e.patente}</span>
                          : (e.ubicaciones?.nombre || nombreUbic(e.ubicacion_id) || <span style={{ color: "#cbd5e1" }}>—</span>)}
                      </td>
                      <td style={TD}>{e.configuracion || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                      <td style={{ ...TD, fontSize: 11.5 }}>{e.cliente || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                      <td style={{ ...TD, fontSize: 11.5, color: "#94a3b8", whiteSpace: "nowrap" }}>{fmtFecha((e.updated_at || "").slice(0, 10))}</td>
                      <td style={{ ...TD, whiteSpace: "nowrap" }}>
                        {e.estado === "RETIRADO_PENDIENTE" && (
                          <button onClick={() => { setResultado("USADO_OK_CAMPO"); setNota(""); setMsgModal(""); setControlando(e); }}
                            style={{ border: "none", background: "none", color: "#ea580c", fontSize: 12, fontWeight: 700, cursor: "pointer", marginRight: 10 }}>Registrar control</button>
                        )}
                        <button onClick={() => alternarHistorial(e.serial)}
                          style={{ border: "none", background: "none", color: "#2563eb", fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 10 }}>
                          {abierto === e.serial ? "Ocultar historial" : "Historial"}
                        </button>
                        <button onClick={() => abrirEdicion(e)}
                          style={{ border: "none", background: "none", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Corregir</button>
                      </td>
                    </tr>
                    {abierto === e.serial && (
                      <tr>
                        <td colSpan={8} style={{ ...TD, background: "#f8fafc" }}>
                          {historial.length === 0 ? (
                            <span style={{ color: "#94a3b8", fontSize: 12 }}>Sin movimientos registrados para esta serie.</span>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                              {historial.map((m) => {
                                const ti = tipoInfo(m.tipo);
                                return (
                                  <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 12 }}>
                                    <span style={{ ...MONO, color: "#64748b", minWidth: 78 }}>{fmtFecha(m.fecha)}</span>
                                    <span style={{ padding: "1px 8px", borderRadius: 999, fontSize: 10.5, fontWeight: 700, background: ti.bg, color: ti.color }}>{ti.label}</span>
                                    <span style={{ color: "#475569" }}>{m.observacion || ""}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {filtrados.length > limite && (
            <button onClick={() => setLimite((l) => l + 100)} style={{ ...CTRL, cursor: "pointer", alignSelf: "center", fontWeight: 600 }}>
              Mostrar más ({filtrados.length - limite} restantes)
            </button>
          )}
        </>
      )}
      {loading && <p style={{ color: "#94a3b8", fontSize: 13 }}>Cargando equipos…</p>}

      <Modal open={!!controlando} onClose={() => { if (!guardando) setControlando(null); }} title="Registrar control del equipo" width="520px"
        footer={
          <>
            <span style={{ fontSize: 12, color: msgModal.startsWith("Error") ? "#dc2626" : "#94a3b8" }}>{msgModal}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <BtnSecondary onClick={() => setControlando(null)}>Cancelar</BtnSecondary>
              <BtnPrimary onClick={guardarControl} loading={guardando}>Guardar control</BtnPrimary>
            </div>
          </>
        }>
        {controlando && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>
              Equipo <strong style={MONO}>{controlando.serial}</strong> — ¿en qué estado quedó después de controlarlo?
            </p>
            {RESULTADOS_CONTROL.map((r) => (
              <label key={r.key} style={{
                display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                border: resultado === r.key ? "1.5px solid #2563eb" : "1.5px solid #e2e8f0", background: resultado === r.key ? "#eff6ff" : "#fff",
              }}>
                <input type="radio" name="control" checked={resultado === r.key} onChange={() => setResultado(r.key)} style={{ marginTop: 3, accentColor: "#2563eb" }} />
                <span>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{r.titulo}</span>
                  <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>{r.detalle}</span>
                </span>
              </label>
            ))}
            <div>
              <FieldLabel>Observación</FieldLabel>
              <FieldInput value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Opcional (por ejemplo, qué falla tenía)" />
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!editando} onClose={() => { if (!guardando) setEditando(null); }} title="Corregir datos del equipo" width="520px"
        footer={
          <>
            <span style={{ fontSize: 12, color: msgModal.startsWith("Error") ? "#dc2626" : "#94a3b8" }}>{msgModal || "Corrige el dato sin generar movimientos."}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <BtnSecondary onClick={() => setEditando(null)}>Cancelar</BtnSecondary>
              <BtnPrimary onClick={guardarEdicion} loading={guardando}>Guardar</BtnPrimary>
            </div>
          </>
        }>
        {editando && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1", fontSize: 13, color: "#334155" }}>
              Equipo <strong style={MONO}>{editando.serial}</strong> · {editando.productos?.descripcion}
            </div>
            <div>
              <FieldLabel>Estado</FieldLabel>
              <FieldSelect value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                {Object.entries(ESTADOS_EQUIPO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </FieldSelect>
            </div>
            <div>
              <FieldLabel>Configuración</FieldLabel>
              <FieldSelect value={form.configuracion} onChange={(e) => setForm({ ...form, configuracion: e.target.value })}>
                <option value="">Sin configuración</option>
                {CONFIGURACIONES.map((c) => <option key={c} value={c}>{c}</option>)}
              </FieldSelect>
            </div>
            <div>
              <FieldLabel>Ubicación</FieldLabel>
              <FieldSelect value={form.ubicacion_id} onChange={(e) => setForm({ ...form, ubicacion_id: e.target.value })}>
                <option value="">Sin ubicación</option>
                {[...ubicaciones].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </FieldSelect>
            </div>
            <div>
              <FieldLabel>Patente</FieldLabel>
              <FieldInput value={form.patente} onChange={(e) => setForm({ ...form, patente: e.target.value.toUpperCase().replace(/[\s.\-]/g, "") })} style={MONO} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel>Cliente</FieldLabel>
              <FieldInput value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} placeholder="Por ejemplo, La Serenisima LD" />
              <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "#94a3b8" }}>
                Cuando un equipo se reconfigura para otro cliente, cambiá acá la configuración y el cliente.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
