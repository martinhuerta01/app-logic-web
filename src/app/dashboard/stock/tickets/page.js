"use client";
import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Modal, { BtnPrimary, BtnSecondary } from "@/components/Modal";
import { parsearFilas, clasificarTicket, ESTADO_CERRADO } from "@/lib/tickets";
import { CONFIGURACIONES } from "@/lib/stockTipos";

const fmtFecha = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");

const TH = {
  textAlign: "left", padding: "9px 12px", fontSize: 9.5, fontWeight: 600,
  letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8",
  background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
};
const TD = { padding: "10px 12px", fontSize: 12.5, color: "#334155", verticalAlign: "top", borderBottom: "1px solid #f1f5f9" };
const MONO = { fontFamily: "DM Mono, monospace" };

function Chip({ item, origen, onQuitar }) {
  return (
    <span title={item.descripcion || ""} style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 4px 2px 8px",
      borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: "DM Mono, monospace",
      background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe",
    }}>
      {item.codigo || "?"} ×{item.cantidad}
      {origen && <span style={{ fontWeight: 500, opacity: 0.8 }}>desde {origen}</span>}
      <button type="button" onClick={onQuitar} title="Quitar"
        style={{ border: "none", background: "none", color: "inherit", cursor: "pointer", fontSize: 12, padding: "0 3px", lineHeight: 1 }}>×</button>
    </span>
  );
}

export default function DescontarPorTickets() {
  const { user } = useAuth();
  const [productos,     setProductos]     = useState([]);
  const [ubicaciones,   setUbicaciones]   = useState([]);
  const [mapeoTalleres, setMapeoTalleres] = useState([]);
  const [recetas,       setRecetas]       = useState([]);
  const [importados,    setImportados]    = useState([]);
  const [equipos,       setEquipos]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [errorCarga,    setErrorCarga]    = useState("");

  const [archivo,   setArchivo]   = useState("");
  const [filas,     setFilas]     = useState([]);
  const [omitidos,  setOmitidos]  = useState([]);
  const [verOmit,   setVerOmit]   = useState(false);
  const [errorArch, setErrorArch] = useState("");

  const [confirmando, setConfirmando] = useState(false);
  const [procesando,  setProcesando]  = useState(false);
  const [progreso,    setProgreso]    = useState({ hechos: 0, total: 0 });
  const [resultado,   setResultado]   = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [prods, ubics, talleres, rec, imp, eqs] = await Promise.all([
          api.get("/stock/productos/"),
          api.get("/stock/ubicaciones/"),
          api.get("/stock/mapeo-talleres/"),
          api.get("/stock/recetas/"),
          api.get("/stock/tickets/importados/"),
          api.get("/stock/equipos/"),
        ]);
        setProductos(prods || []); setUbicaciones(ubics || []);
        setMapeoTalleres(talleres || []); setRecetas(rec || []); setImportados(imp || []); setEquipos(eqs || []);
      } catch {
        setErrorCarga("No se pudieron cargar productos y ubicaciones. Verificá la conexión con el servidor.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const productosActivos = useMemo(() => productos.filter((p) => p.activo !== false), [productos]);
  const ubicPorId = useMemo(() => new Map(ubicaciones.map((u) => [u.id, u])), [ubicaciones]);
  const yaImportado = useMemo(() => new Set(importados.map((i) => i.ticket_numero)), [importados]);
  const ctx = useMemo(() => ({ ubicaciones, mapeoTalleres, recetas, productos }), [ubicaciones, mapeoTalleres, recetas, productos]);

  const cargarArchivo = async (file) => {
    if (!file) return;
    setErrorArch(""); setResultado(null);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
      const tickets = parsearFilas(rows);
      if (tickets.length === 0) {
        setErrorArch('No se encontraron tickets. ¿Es la planilla "Ticket de Soporte"?');
        return;
      }
      const nuevas = [], omit = [];
      // En orden cronológico: un equipo retirado en un ticket y reinstalado en otro posterior no descuenta unidad nueva
      const serialesUsados = new Set(equipos.filter((e) => e.estado !== "EN_STOCK").map((e) => String(e.serial)));
      const ordenados = [...tickets].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "") || Number(a.ticket) - Number(b.ticket));
      for (const t of ordenados) {
        const c = clasificarTicket(t, { ...ctx, serialesUsados });
        if (c.serialRetirado) serialesUsados.add(String(c.serialRetirado));
        if (c.omitir) { omit.push({ ...t, motivo: c.omitir }); continue; }
        nuevas.push({
          ...t, ...c,
          incluir: c.incluir && !yaImportado.has(t.ticket),
          yaImportado: yaImportado.has(t.ticket),
        });
      }
      setArchivo(file.name); setFilas(nuevas); setOmitidos(omit);
    } catch {
      setErrorArch("No se pudo leer el archivo.");
    }
  };

  const patchFila = (ticket, fn) => setFilas((fs) => fs.map((f) => (f.ticket === ticket ? fn(f) : f)));

  const quitarItem = (ticket, producto_id) =>
    patchFila(ticket, (f) => ({ ...f, items: f.items.filter((i) => i.producto_id !== producto_id) }));

  const agregarItem = (ticket, codigo) => {
    const cod = codigo.trim().toUpperCase();
    if (!cod) return;
    const prod = productosActivos.find((p) => String(p.codigo).trim().toUpperCase() === cod);
    if (!prod) return;
    patchFila(ticket, (f) =>
      f.items.some((i) => i.producto_id === prod.id)
        ? f
        : { ...f, items: [...f.items, { producto_id: prod.id, cantidad: 1, codigo: prod.codigo, descripcion: prod.descripcion, esMaterial: prod.categoria === "Insumos" }] }
    );
  };

  // Se confirman de la fecha más vieja a la más nueva: el estado final de cada número de serie
  // (instalado, retirado) tiene que reflejar el último ticket, sin importar el orden del archivo.
  const ops = useMemo(
    () => filas
      .filter((f) => f.incluir && f.ubicacionId && !f.yaImportado)
      .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "") || Number(a.ticket) - Number(b.ticket)),
    [filas]
  );

  const conSerial = ops.filter((f) => f.serialInstalado || f.serialRetirado).length;

  const resumenDestinos = useMemo(() => {
    const m = new Map();
    ops.forEach((f) => {
      const nombre = ubicPorId.get(f.ubicacionId)?.nombre || "?";
      m.set(nombre, (m.get(nombre) || 0) + 1);
    });
    return [...m];
  }, [ops, ubicPorId]);

  // Los materiales de instalación salen de la ubicación configurada para la del ticket (por ejemplo, la camioneta)
  const origenDeItem = (f, it) =>
    (it.esMaterial && ubicPorId.get(f.ubicacionId)?.ubicacion_materiales_id) || f.ubicacionId;

  const armarMovimientos = (f) => {
    const base = { fecha: f.fecha, observacion: `Ticket #${f.ticket} · ${f.patente || ""} · ${f.servicio}` };
    const movimientos = f.items.map((it) => ({
      ...base,
      tipo: "INSTALACION",
      producto_id: it.producto_id,
      origen_id: origenDeItem(f, it),
      cantidad: it.cantidad,
      serial: it.producto_id === f.productoGpsId ? (f.serialInstalado || null) : null,
      configuracion: it.producto_id === f.productoGpsId ? (f.configuracion || null) : null,
    }));
    if (f.serialRetirado && (f.productoRetiroId || f.productoGpsId)) {
      movimientos.push({
        ...base, tipo: "RETIRO", producto_id: f.productoRetiroId || f.productoGpsId, cantidad: 1,
        serial: f.serialRetirado, patente: f.patente,
      });
    }
    return movimientos;
  };

  const ejecutar = async () => {
    setProcesando(true); setResultado(null);
    setProgreso({ hechos: 0, total: ops.length });
    let ok = 0, duplicados = 0; const errores = [];
    for (let i = 0; i < ops.length; i++) {
      const f = ops[i];
      try {
        const resp = await api.post("/stock/tickets/confirmar/", {
          ticket_numero: f.ticket, distrito: f.distrito, archivo_nombre: archivo,
          cargado_por: user || undefined, movimientos: armarMovimientos(f),
        });
        if (resp?.duplicado) duplicados++; else ok++;
      } catch (e) {
        errores.push(`#${f.ticket}: ${String(e.message).slice(0, 160)}`);
      }
      setProgreso({ hechos: i + 1, total: ops.length });
    }
    try {
      const imp = await api.get("/stock/tickets/importados/");
      setImportados(imp || []);
    } catch { /* la próxima carga refresca */ }
    setResultado({ ok, duplicados, errores });
    setProcesando(false); setConfirmando(false);
  };

  const kpi = (label, value, accent) => (
    <div key={label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent }} />
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700, lineHeight: 1, ...MONO, color: "#0f172a" }}>{value}</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Descontar stock por tickets</h1>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>
          Subí la planilla &ldquo;Ticket de Soporte&rdquo; y descontá lo instalado del stock de cada destino
        </p>
      </div>

      {errorCarga && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#b91c1c" }}>{errorCarga}</div>
      )}

      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); cargarArchivo(e.dataTransfer.files?.[0]); }}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "22px 16px",
          border: "1.5px dashed #cbd5e1", borderRadius: 12, background: "#fff", cursor: loading ? "wait" : "pointer",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#2563eb" }}>
          {archivo ? `Cargado: ${archivo} — hacé clic para cambiar` : "Arrastrá el .xlsx acá o hacé clic para elegirlo"}
        </span>
        <span style={{ fontSize: 11.5, color: "#94a3b8" }}>Se lee en tu navegador; no se guarda nada hasta que confirmes</span>
        <input type="file" accept=".xlsx,.xls" disabled={loading} style={{ display: "none" }}
          onChange={(e) => { cargarArchivo(e.target.files?.[0]); e.target.value = ""; }} />
      </label>

      {errorArch && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#b91c1c" }}>{errorArch}</div>
      )}

      {resultado && (
        <div style={{
          background: resultado.errores.length ? "#fff7ed" : "#f0fdf4",
          border: `1px solid ${resultado.errores.length ? "#fed7aa" : "#bbf7d0"}`,
          borderRadius: 10, padding: "12px 16px", fontSize: 13, color: resultado.errores.length ? "#9a3412" : "#166534",
        }}>
          <strong>{resultado.ok} ticket{resultado.ok !== 1 ? "s" : ""} confirmado{resultado.ok !== 1 ? "s" : ""}.</strong>
          {resultado.duplicados > 0 && <> {resultado.duplicados} ya estaban importados (no se repitieron).</>}
          {resultado.errores.length > 0 && (
            <>
              {" "}{resultado.errores.length} con error (podés reintentar, solo se reintentan los que faltan):
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12 }}>
                {resultado.errores.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      {filas.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            {kpi("Tickets leídos", filas.length + omitidos.length, "#0f172a")}
            {kpi("A confirmar", ops.length, "#2563eb")}
            {kpi("Con serial", conSerial, "#7c3aed")}
            {kpi("Ya importados", filas.filter((f) => f.yaImportado).length, "#16a34a")}
            {kpi("Omitidos", omitidos.length, "#94a3b8")}
          </div>

          <datalist id="codigos-productos">
            {productosActivos.map((p) => <option key={p.id} value={p.codigo}>{p.descripcion}</option>)}
          </datalist>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1180 }}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: 36 }}></th>
                  <th style={TH}>Ticket</th>
                  <th style={TH}>Destino</th>
                  <th style={TH}>Servicio</th>
                  <th style={TH}>Insumos a descontar</th>
                  <th style={{ ...TH, color: "#7c3aed" }}>Serial instalado</th>
                  <th style={{ ...TH, color: "#dc2626" }}>Serial retirado</th>
                  <th style={TH}>Config.</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.ticket} style={{ opacity: f.incluir ? 1 : 0.6 }}>
                    <td style={TD}>
                      <input type="checkbox" checked={f.incluir} disabled={!f.ubicacionId || f.yaImportado}
                        onChange={(e) => patchFila(f.ticket, (x) => ({ ...x, incluir: e.target.checked }))}
                        style={{ accentColor: "#2563eb", width: 14, height: 14 }} />
                    </td>
                    <td style={TD}>
                      <div style={{ ...MONO, fontWeight: 600 }}>#{f.ticket}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtFecha(f.fecha)} · {f.patente || "—"}</div>
                      {f.yaImportado && <div style={{ fontSize: 10.5, color: "#16a34a", marginTop: 2 }}>ya importado</div>}
                    </td>
                    <td style={TD}>
                      <select value={f.ubicacionId || ""}
                        onChange={(e) => patchFila(f.ticket, (x) => ({ ...x, ubicacionId: e.target.value, incluir: !!e.target.value && x.estado === ESTADO_CERRADO && !x.yaImportado }))}
                        style={{ fontSize: 12, padding: "4px 6px", borderRadius: 6, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#334155" }}>
                        <option value="">Elegir…</option>
                        {[...ubicaciones].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((u) =>
                          <option key={u.id} value={u.id}>{u.nombre}</option>)}
                      </select>
                    </td>
                    <td style={{ ...TD, maxWidth: 170 }}>
                      <div style={{ fontWeight: 500 }}>{f.servicio}</div>
                      {f.advertencias.map((a, i) => (
                        <div key={i} style={{ fontSize: 10.5, color: "#d97706", marginTop: 2 }}>⚠ {a}</div>
                      ))}
                      {(f.informativas || []).map((a, i) => (
                        <div key={"i" + i} style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>ℹ {a}</div>
                      ))}
                    </td>
                    <td style={TD}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                        {f.items.map((it) => (
                          <Chip key={it.producto_id} item={it}
                            origen={origenDeItem(f, it) !== f.ubicacionId ? ubicPorId.get(origenDeItem(f, it))?.nombre : null}
                            onQuitar={() => quitarItem(f.ticket, it.producto_id)} />
                        ))}
                        <input list="codigos-productos" placeholder="+ código"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarItem(f.ticket, e.target.value); e.target.value = ""; } }}
                          style={{ width: 78, fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "1.5px dashed #cbd5e1", background: "transparent", fontFamily: "DM Mono, monospace" }} />
                      </div>
                    </td>
                    <td style={TD}>
                      {f.productoGpsId ? (
                        <input type="text" value={f.serialInstalado || ""} placeholder="—"
                          onChange={(e) => patchFila(f.ticket, (x) => ({ ...x, serialInstalado: e.target.value }))}
                          style={{ width: 118, fontSize: 11, padding: "4px 6px", borderRadius: 6, border: "1.5px solid #ddd6fe", background: "#f5f3ff", color: "#6d28d9", fontFamily: "DM Mono, monospace" }} />
                      ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={TD}>
                      {f.productoGpsId ? (
                        <input type="text" value={f.serialRetirado || ""} placeholder="—"
                          onChange={(e) => patchFila(f.ticket, (x) => ({ ...x, serialRetirado: e.target.value }))}
                          style={{ width: 118, fontSize: 11, padding: "4px 6px", borderRadius: 6, border: "1.5px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontFamily: "DM Mono, monospace" }} />
                      ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={TD}>
                      {f.productoGpsId ? (
                        <select value={f.configuracion || ""}
                          onChange={(e) => patchFila(f.ticket, (x) => ({ ...x, configuracion: e.target.value || null }))}
                          style={{ fontSize: 11, padding: "4px 6px", borderRadius: 6, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#334155" }}>
                          <option value="">—</option>
                          {CONFIGURACIONES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {omitidos.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 16px" }}>
              <button type="button" onClick={() => setVerOmit((v) => !v)}
                style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#64748b", padding: 0 }}>
                {verOmit ? "▼" : "▶"} No descuentan ({omitidos.length})
              </button>
              {verOmit && (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "#64748b", display: "flex", flexDirection: "column", gap: 3 }}>
                  {omitidos.map((o) => (
                    <li key={o.ticket}><span style={{ fontFamily: "DM Mono, monospace" }}>#{o.ticket}</span> · {o.patente} · {o.motivo}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <BtnPrimary disabled={ops.length === 0} onClick={() => setConfirmando(true)}>
              Revisar y confirmar ({ops.length})
            </BtnPrimary>
          </div>
        </>
      )}

      <Modal
        open={confirmando}
        onClose={() => { if (!procesando) setConfirmando(false); }}
        title="Confirmar descuento de stock"
        width="460px"
        footer={
          <>
            <span style={{ fontSize: 11.5, color: "#94a3b8" }}>
              {procesando ? `Registrando ${progreso.hechos} de ${progreso.total}…` : ""}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <BtnSecondary onClick={() => setConfirmando(false)}>Cancelar</BtnSecondary>
              <BtnPrimary onClick={ejecutar} loading={procesando}>Confirmar {ops.length}</BtnPrimary>
            </div>
          </>
        }
      >
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "#334155" }}>
          Se van a confirmar <strong>{ops.length}</strong> tickets:
        </p>
        <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 13, color: "#334155" }}>
          {resumenDestinos.map(([n, c]) => <li key={n}>{n}: {c} ticket{c !== 1 ? "s" : ""}</li>)}
        </ul>
        <p style={{ margin: "0 0 16px", fontSize: 11.5, color: "#94a3b8" }}>
          Cada ticket queda registrado por número. Si volvés a subir la misma planilla, lo ya confirmado no se repite.
        </p>
      </Modal>
    </div>
  );
}
