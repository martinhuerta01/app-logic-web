"use client";
import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { api } from "@/lib/api";
import Modal, { BtnPrimary, BtnSecondary } from "@/components/Modal";
import { parsearFilas, clasificarTicket, ESTADO_CERRADO } from "@/lib/tickets";
import { CONFIGURACIONES } from "@/lib/stockTipos";
import { fmtFecha, mensajeDeError } from "@/lib/stockNuevo";

const BASE = "/stock-nuevo";
const MONO = { fontFamily: "DM Mono, monospace" };
const TH = {
  textAlign: "left", padding: "9px 12px", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.07em",
  textTransform: "uppercase", color: "#94a3b8", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
};
const TD = { padding: "10px 12px", fontSize: 12.5, color: "#334155", verticalAlign: "top", borderBottom: "1px solid #f1f5f9" };

const ESTADOS = {
  listo: { texto: "Listo", fondo: "#dcfce7", color: "#166534" },
  revisar: { texto: "Para revisar", fondo: "#fef3c7", color: "#92400e" },
  omitido: { texto: "Se omite", fondo: "#e2e8f0", color: "#475569" },
  importado: { texto: "Ya importado", fondo: "#dbeafe", color: "#1e40af" },
};

function Chip({ item, origen, onQuitar }) {
  return (
    <span title={item.descripcion || ""} style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 4px 2px 8px", borderRadius: 999, fontSize: 11,
      fontWeight: 600, fontFamily: "DM Mono, monospace", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe",
    }}>
      {item.codigo || "?"} ×{item.cantidad}
      {origen && <span style={{ fontWeight: 500, opacity: 0.8 }}>desde {origen}</span>}
      <button type="button" onClick={onQuitar} aria-label={`Quitar ${item.codigo}`}
        style={{ border: "none", background: "none", color: "inherit", cursor: "pointer", fontSize: 12, padding: "0 3px", lineHeight: 1 }}>×</button>
    </span>
  );
}

export default function ImportarTickets() {
  const [productos, setProductos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [mapeoTalleres, setMapeoTalleres] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [contexto, setContexto] = useState({ importados: [], ultimos_conteos: {}, equipos: [] });
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  const [archivo, setArchivo] = useState("");
  const [filas, setFilas] = useState([]);
  const [omitidos, setOmitidos] = useState([]);
  const [verOmitidos, setVerOmitidos] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState("");
  const [abierto, setAbierto] = useState(null); // número de ticket con la edición abierta

  const [confirmando, setConfirmando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState({ hechos: 0, total: 0 });
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [prods, ubics, talleres, rec, ctx] = await Promise.all([
          api.get("/stock/productos/"), api.get("/stock/ubicaciones/"), api.get("/stock/mapeo-talleres/"),
          api.get("/stock/recetas/"), api.get(`${BASE}/tickets/contexto/`),
        ]);
        setProductos(prods || []); setUbicaciones(ubics || []); setMapeoTalleres(talleres || []); setRecetas(rec || []);
        setContexto(ctx || { importados: [], ultimos_conteos: {}, equipos: [] });
      } catch (e) {
        setErrorCarga(mensajeDeError(e));
      } finally {
        setCargandoDatos(false);
      }
    })();
  }, []);

  const productosActivos = useMemo(() => productos.filter((p) => p.activo !== false && p.categoria !== "Herramientas"), [productos]);
  const ubicPorId = useMemo(() => new Map(ubicaciones.map((u) => [u.id, u])), [ubicaciones]);
  const yaImportado = useMemo(() => new Set(contexto.importados), [contexto.importados]);
  const equipoPorSerie = useMemo(() => new Map(contexto.equipos.map((e) => [String(e.serial), e])), [contexto.equipos]);
  const nombreUbic = (id) => ubicPorId.get(id)?.nombre.trim() || "?";

  // Los materiales de instalación salen de la ubicación configurada para la del ticket (por ejemplo, la camioneta)
  const origenDeItem = (f, it) => (it.esMaterial && ubicPorId.get(f.ubicacionId)?.ubicacion_materiales_id) || f.ubicacionId;

  // Avisos que dependen de lo que ya hay en el sistema (no bloquean)
  const avisosDeContexto = (f) => {
    const avisos = [];
    const ultimo = contexto.ultimos_conteos[f.ubicacionId];
    if (ultimo && f.fecha && f.fecha <= ultimo) {
      avisos.push(`Es anterior al último conteo de ${nombreUbic(f.ubicacionId)} (${fmtFecha(ultimo)}): ya está reflejado en lo contado`);
    }
    if (f.productoGpsId && f.serialInstalado) {
      const e = equipoPorSerie.get(String(f.serialInstalado));
      if (!e) avisos.push(`El número de serie ${f.serialInstalado} no figura en el sistema: se descuenta la cantidad y queda para revisar`);
      else if (e.estado === "EN_STOCK" && e.ubicacion_id && e.ubicacion_id !== f.ubicacionId) {
        avisos.push(`El número de serie ${f.serialInstalado} figura en ${nombreUbic(e.ubicacion_id)}, no en ${nombreUbic(f.ubicacionId)}`);
      } else if (e.estado === "INSTALADO") avisos.push(`El número de serie ${f.serialInstalado} ya figura instalado en otro vehículo`);
    }
    return avisos;
  };

  const estadoDe = (f) => {
    if (f.yaImportado) return "importado";
    if (!f.ubicacionId || f.advertencias.length > 0) return "revisar";
    return f.incluir ? "listo" : "omitido";
  };

  const cargarArchivo = async (file) => {
    if (!file) return;
    setErrorArchivo(""); setResultado(null); setAbierto(null);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
      const tickets = parsearFilas(rows);
      if (tickets.length === 0) { setErrorArchivo('No se encontraron tickets. ¿Es la planilla "Ticket de Soporte"?'); return; }
      // En orden cronológico: un equipo retirado en un ticket y reinstalado en otro posterior no descuenta unidad nueva
      const serialesUsados = new Set(contexto.equipos.filter((e) => e.estado !== "EN_STOCK").map((e) => String(e.serial)));
      const ordenados = [...tickets].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "") || Number(a.ticket) - Number(b.ticket));
      const ctx = { ubicaciones, mapeoTalleres, recetas, productos, serialesUsados };
      const nuevas = [], omit = [];
      for (const t of ordenados) {
        const c = clasificarTicket(t, ctx);
        if (c.serialRetirado) serialesUsados.add(String(c.serialRetirado));
        if (c.omitir) { omit.push({ ...t, motivo: c.omitir }); continue; }
        nuevas.push({ ...t, ...c, yaImportado: yaImportado.has(t.ticket), incluir: false });
      }
      // Dos cambios de equipo del mismo vehículo el mismo día: vale el más reciente
      const cambios = new Map();
      nuevas.filter((f) => f.accion === "CONSUMO_Y_RETIRO" && f.serialInstalado).forEach((f) => {
        const k = `${f.patente}|${f.fecha}`;
        cambios.set(k, [...(cambios.get(k) || []), f]);
      });
      cambios.forEach((lista) => {
        if (lista.length < 2) return;
        lista.forEach((f, i) => {
          if (i < lista.length - 1) f.informativas = [...(f.informativas || []), `Hay otro cambio de equipo del mismo vehículo ese día (ticket #${lista[lista.length - 1].ticket}): vale el más reciente, revisá si este corresponde`];
        });
      });
      nuevas.forEach((f) => {
        f.avisosContexto = avisosDeContexto(f);
        const anteriorAlConteo = f.avisosContexto.some((a) => a.startsWith("Es anterior"));
        f.incluir = !f.yaImportado && !!f.ubicacionId && f.advertencias.length === 0
          && (f.items.length > 0 || !!f.serialRetirado) && !anteriorAlConteo && f.estado === ESTADO_CERRADO;
      });
      setArchivo(file.name); setFilas(nuevas); setOmitidos(omit);
    } catch {
      setErrorArchivo("No se pudo leer el archivo.");
    }
  };

  const patchFila = (ticket, fn) => setFilas((fs) => fs.map((f) => (f.ticket === ticket ? fn(f) : f)));
  const quitarItem = (ticket, producto_id) => patchFila(ticket, (f) => ({ ...f, items: f.items.filter((i) => i.producto_id !== producto_id) }));
  const cambiarCantidad = (ticket, producto_id, d) => patchFila(ticket, (f) => ({
    ...f, items: f.items.map((i) => (i.producto_id === producto_id ? { ...i, cantidad: Math.max(0, i.cantidad + d) } : i)).filter((i) => i.cantidad > 0 || i.reutilizado),
  }));
  const agregarItem = (ticket, codigo) => {
    const cod = codigo.trim().toUpperCase();
    const prod = productosActivos.find((p) => String(p.codigo).trim().toUpperCase() === cod);
    if (!prod) return;
    patchFila(ticket, (f) => (f.items.some((i) => i.producto_id === prod.id) ? f : {
      ...f, items: [...f.items, { producto_id: prod.id, cantidad: 1, codigo: prod.codigo.trim(), descripcion: prod.descripcion, esMaterial: prod.categoria === "Insumos" }],
    }));
  };
  const cambiarUbicacion = (ticket, ubicacionId) => patchFila(ticket, (f) => {
    const nueva = { ...f, ubicacionId };
    nueva.avisosContexto = avisosDeContexto(nueva);
    return nueva;
  });

  const ops = useMemo(
    () => filas.filter((f) => f.incluir && f.ubicacionId && !f.yaImportado)
      .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "") || Number(a.ticket) - Number(b.ticket)),
    [filas]
  );

  const conteos = useMemo(() => {
    const c = { listo: 0, revisar: 0, omitido: omitidos.length, importado: 0 };
    filas.forEach((f) => { c[estadoDe(f)]++; });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, omitidos]);

  const resumenDestinos = useMemo(() => {
    const m = new Map();
    ops.forEach((f) => m.set(nombreUbic(f.ubicacionId), (m.get(nombreUbic(f.ubicacionId)) || 0) + 1));
    return [...m];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ops, ubicPorId]);

  const armarMovimientos = (f) => {
    const base = { fecha: f.fecha, observacion: `Ticket #${f.ticket} · ${f.patente || ""} · ${f.servicio}` };
    const movimientos = f.items.map((it) => ({
      ...base, tipo: "INSTALACION", producto_id: it.producto_id, origen_id: origenDeItem(f, it), cantidad: it.cantidad,
      serial: it.producto_id === f.productoGpsId ? (f.serialInstalado || null) : null,
      configuracion: it.producto_id === f.productoGpsId ? (f.configuracion || null) : null,
    }));
    if (f.serialRetirado && (f.productoRetiroId || f.productoGpsId)) {
      movimientos.push({ ...base, tipo: "RETIRO", producto_id: f.productoRetiroId || f.productoGpsId, cantidad: 1, serial: f.serialRetirado, patente: f.patente });
    }
    return movimientos;
  };

  const ejecutar = async () => {
    setProcesando(true); setResultado(null); setProgreso({ hechos: 0, total: ops.length });
    let ok = 0, duplicados = 0; const errores = [];
    for (let i = 0; i < ops.length; i++) {
      const f = ops[i];
      try {
        const resp = await api.post(`${BASE}/tickets/confirmar/`, {
          ticket_numero: f.ticket, distrito: f.distrito, archivo_nombre: archivo,
          fila_excel: { descripcion: f.descripcion, patente: f.patente, distrito: f.distrito, base: f.base, fecha: f.fecha, dispositivo: f.dispositivo, incidencia: f.incidencia },
          movimientos: armarMovimientos(f), serial_retirado: f.serialRetirado || null, retirado_ubicacion_id: f.serialRetirado ? f.ubicacionId : null,
        });
        if (resp?.duplicado) duplicados++; else ok++;
      } catch (e) {
        errores.push(`#${f.ticket}: ${mensajeDeError(e).slice(0, 160)}`);
      }
      setProgreso({ hechos: i + 1, total: ops.length });
    }
    try { setContexto(await api.get(`${BASE}/tickets/contexto/`)); } catch { /* la próxima carga refresca */ }
    setFilas((fs) => fs.map((f) => (ops.some((o) => o.ticket === f.ticket) ? { ...f, yaImportado: true, incluir: false } : f)));
    setResultado({ ok, duplicados, errores });
    setProcesando(false); setConfirmando(false);
  };

  const tarjeta = (titulo, valor, color) => (
    <div key={titulo} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px" }}>
      <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>{titulo}</div>
      <div style={{ ...MONO, fontSize: 24, fontWeight: 700, color, marginTop: 6 }}>{valor}</div>
    </div>
  );

  const fAbierta = filas.find((f) => f.ticket === abierto);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c2410c" }}>Stock nuevo</div>
        <h1 style={{ margin: "2px 0 0", fontSize: 24, color: "#0f172a" }}>Importar tickets</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b", maxWidth: 800 }}>
          Subís el Excel de tickets. El sistema interpreta cada descripción y propone de qué ubicación sale cada insumo. Confirmás los claros y revisás los dudosos. Nada se descuenta hasta que confirmes.
        </p>
      </div>

      {errorCarga && <div role="alert" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#b91c1c" }}>{errorCarga}</div>}

      <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); cargarArchivo(e.dataTransfer.files?.[0]); }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "22px 16px", border: "1.5px dashed #cbd5e1", borderRadius: 12, background: "#fff", cursor: cargandoDatos ? "wait" : "pointer" }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1d4e89" }}>{archivo ? `Cargado: ${archivo} — hacé clic para cambiar` : "Arrastrá el .xlsx acá o hacé clic para elegirlo"}</span>
        <span style={{ fontSize: 12, color: "#64748b" }}>Se lee en tu navegador; no se guarda nada hasta que confirmes</span>
        <input type="file" accept=".xlsx,.xls" disabled={cargandoDatos} style={{ display: "none" }} onChange={(e) => { cargarArchivo(e.target.files?.[0]); e.target.value = ""; }} />
      </label>

      {errorArchivo && <div role="alert" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#b91c1c" }}>{errorArchivo}</div>}

      {resultado && (
        <div role="status" style={{ background: resultado.errores.length ? "#fff7ed" : "#f0fdf4", border: `1px solid ${resultado.errores.length ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: resultado.errores.length ? "#9a3412" : "#166534" }}>
          <strong>{resultado.ok} ticket{resultado.ok !== 1 ? "s" : ""} confirmado{resultado.ok !== 1 ? "s" : ""}.</strong>
          {resultado.duplicados > 0 && <> {resultado.duplicados} ya estaban importados.</>}
          {resultado.errores.length > 0 && (
            <> {resultado.errores.length} con error (podés reintentar, solo se reintentan los que faltan):
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12 }}>{resultado.errores.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </>
          )}
        </div>
      )}

      {filas.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {tarjeta("Listos para confirmar", ops.length, "#15803d")}
            {tarjeta("Para revisar", conteos.revisar, "#b45309")}
            {tarjeta("Se omiten", conteos.omitido, "#64748b")}
            {tarjeta("Ya importados", conteos.importado, "#1d4e89")}
          </div>

          <datalist id="codigos-productos">
            {productosActivos.map((p) => <option key={p.id} value={p.codigo.trim()}>{p.descripcion}</option>)}
          </datalist>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: 36 }}><span className="sr-only">Incluir</span></th>
                  <th style={TH}>Ticket</th>
                  <th style={TH}>Cliente y descripción</th>
                  <th style={TH}>Sale de</th>
                  <th style={TH}>Insumos</th>
                  <th style={TH}>Estado</th>
                  <th style={TH}><span className="sr-only">Editar</span></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => {
                  const est = ESTADOS[estadoDe(f)];
                  return (
                    <tr key={f.ticket} style={{ opacity: f.yaImportado ? 0.6 : 1 }}>
                      <td style={TD}>
                        <input type="checkbox" checked={f.incluir} disabled={!f.ubicacionId || f.yaImportado} aria-label={`Incluir el ticket ${f.ticket}`}
                          onChange={(e) => patchFila(f.ticket, (x) => ({ ...x, incluir: e.target.checked }))} style={{ accentColor: "#1d4e89", width: 16, height: 16 }} />
                      </td>
                      <td style={TD}>
                        <div style={{ ...MONO, fontWeight: 600 }}>#{f.ticket}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{fmtFecha(f.fecha)}</div>
                        <div style={{ ...MONO, fontSize: 11, color: "#94a3b8" }}>{f.patente || "—"}</div>
                      </td>
                      <td style={{ ...TD, maxWidth: 380 }}>
                        <div style={{ fontWeight: 600 }}>{f.distrito}{f.base ? ` · ${f.base}` : ""}</div>
                        <div style={{ whiteSpace: "pre-wrap", color: "#475569", marginTop: 2 }}>{f.descripcion}</div>
                        {[...f.advertencias, ...(f.avisosContexto || [])].map((a, i) => <div key={i} style={{ fontSize: 11.5, color: "#b45309", marginTop: 3 }}>⚠ {a}</div>)}
                        {(f.informativas || []).map((a, i) => <div key={"i" + i} style={{ fontSize: 11.5, color: "#64748b", marginTop: 3 }}>ℹ {a}</div>)}
                      </td>
                      <td style={TD}>{f.ubicacionId ? nombreUbic(f.ubicacionId) : <span style={{ color: "#b45309" }}>Elegir</span>}</td>
                      <td style={TD}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {f.items.length === 0 && !f.serialRetirado && <span style={{ color: "#94a3b8" }}>No descuenta</span>}
                          {f.items.map((it) => (
                            <span key={it.producto_id} style={{ ...MONO, fontSize: 11, fontWeight: 600, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 999, padding: "1px 8px" }}>{it.codigo} ×{it.cantidad}</span>
                          ))}
                          {f.serialRetirado && <span style={{ ...MONO, fontSize: 11, color: "#b91c1c" }}>sale {f.serialRetirado}</span>}
                        </div>
                      </td>
                      <td style={TD}><span style={{ background: est.fondo, color: est.color, fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: "2px 10px", whiteSpace: "nowrap" }}>{est.texto}</span></td>
                      <td style={TD}>
                        {!f.yaImportado && (
                          <button type="button" onClick={() => setAbierto(f.ticket)}
                            style={{ border: "none", borderRadius: 8, background: "#1d4e89", color: "#ffffff", fontSize: 12.5, fontWeight: 700, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit" }}>
                            {estadoDe(f) === "revisar" ? "Revisar" : "Editar"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {omitidos.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 16px" }}>
              <button type="button" onClick={() => setVerOmitidos((v) => !v)} aria-expanded={verOmitidos}
                style={{ border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#475569", padding: 0, fontFamily: "inherit" }}>
                {verOmitidos ? "▼" : "▶"} No descuentan ({omitidos.length})
              </button>
              {verOmitidos && (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12.5, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
                  {omitidos.map((o) => (
                    <li key={o.ticket}><span style={MONO}>#{o.ticket}</span> · {o.patente} · {o.motivo} — <span style={{ color: "#94a3b8" }}>{o.descripcion}</span></li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: "#64748b" }}>Los dudosos quedan aparte hasta que los resuelvas. Nada se descuenta sin que confirmes.</span>
            <BtnPrimary disabled={ops.length === 0} onClick={() => setConfirmando(true)}>Confirmar los tickets listos ({ops.length})</BtnPrimary>
          </div>
        </>
      )}

      {/* Edición de un ticket */}
      <Modal open={!!fAbierta} onClose={() => setAbierto(null)} width="680px"
        title={fAbierta ? `Ticket #${fAbierta.ticket} · ${fAbierta.distrito}` : ""}
        footer={<><span /><BtnPrimary onClick={() => setAbierto(null)}>Listo</BtnPrimary></>}>
        {fAbierta && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13, color: "#334155" }}>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>Lo que dice el ticket</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{fAbierta.descripcion}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", marginTop: 8, fontSize: 12, color: "#64748b" }}>
                <span>Fecha: <b>{fmtFecha(fAbierta.fecha)}</b></span>
                <span>Incidencia: <b>{fAbierta.incidencia || "—"}</b></span>
                <span>Base: <b>{fAbierta.base || "—"}</b></span>
                <span>Vehículo: <b>{fAbierta.patente || "—"}</b></span>
                <span>Dispositivo: <b style={MONO}>{fAbierta.dispositivo || "—"}</b></span>
              </div>
            </div>
            <div style={{ fontSize: 12.5 }}><b>Lo que propuso el sistema:</b> {fAbierta.servicio}</div>
            {[...fAbierta.advertencias, ...(fAbierta.avisosContexto || [])].map((a, i) => <div key={i} style={{ fontSize: 12.5, color: "#b45309" }}>⚠ {a}</div>)}
            {(fAbierta.informativas || []).map((a, i) => <div key={"i" + i} style={{ fontSize: 12.5, color: "#64748b" }}>ℹ {a}</div>)}

            {fAbierta.productoGpsId && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                  Equipo que entra (columna Dispositivo)
                  <input value={fAbierta.serialInstalado || ""} onChange={(e) => patchFila(fAbierta.ticket, (x) => ({ ...x, serialInstalado: e.target.value }))}
                    style={{ ...MONO, fontSize: 12.5, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 6 }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                  Equipo que sale (queda retirado pendiente)
                  <input value={fAbierta.serialRetirado || ""} onChange={(e) => patchFila(fAbierta.ticket, (x) => ({ ...x, serialRetirado: e.target.value }))}
                    style={{ ...MONO, fontSize: 12.5, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 6 }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                  Configuración
                  <select value={fAbierta.configuracion || ""} onChange={(e) => patchFila(fAbierta.ticket, (x) => ({ ...x, configuracion: e.target.value || null }))}
                    style={{ fontSize: 12.5, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 6 }}>
                    <option value="">—</option>
                    {CONFIGURACIONES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>
            )}

            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              Se descuenta de
              <select value={fAbierta.ubicacionId || ""} onChange={(e) => cambiarUbicacion(fAbierta.ticket, e.target.value)}
                style={{ fontSize: 13, padding: "7px 8px", border: "1px solid #cbd5e1", borderRadius: 6, maxWidth: 320 }}>
                <option value="">Elegir…</option>
                {[...ubicaciones].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((u) => <option key={u.id} value={u.id}>{u.nombre.trim()}</option>)}
              </select>
            </label>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Insumos</div>
              {fAbierta.items.length === 0 && <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 6 }}>Este ticket no descuenta nada. Podés agregar productos abajo.</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {fAbierta.items.map((it) => (
                  <div key={it.producto_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div>{it.descripcion}</div>
                      <div style={{ ...MONO, fontSize: 11, color: "#94a3b8" }}>
                        {it.codigo}{origenDeItem(fAbierta, it) !== fAbierta.ubicacionId ? ` · sale de ${nombreUbic(origenDeItem(fAbierta, it))}` : ""}{it.reutilizado ? " · equipo reutilizado, no descuenta" : ""}
                      </div>
                    </div>
                    <button type="button" onClick={() => cambiarCantidad(fAbierta.ticket, it.producto_id, -1)} aria-label={`Restar uno a ${it.descripcion}`}
                      style={{ width: 32, height: 32, border: "none", borderRadius: 8, background: "#4a5463", color: "#ffffff", fontSize: 17, fontWeight: 700, cursor: "pointer" }}>−</button>
                    <span style={{ ...MONO, minWidth: 24, textAlign: "center", fontWeight: 700 }}>{it.cantidad}</span>
                    <button type="button" onClick={() => cambiarCantidad(fAbierta.ticket, it.producto_id, 1)} aria-label={`Sumar uno a ${it.descripcion}`}
                      style={{ width: 32, height: 32, border: "none", borderRadius: 8, background: "#4a5463", color: "#ffffff", fontSize: 17, fontWeight: 700, cursor: "pointer" }}>+</button>
                    <button type="button" onClick={() => quitarItem(fAbierta.ticket, it.producto_id)}
                      style={{ border: "none", borderRadius: 8, background: "#b91c1c", color: "#ffffff", fontSize: 12, fontWeight: 700, padding: "7px 10px", cursor: "pointer" }}>Quitar</button>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <input list="codigos-productos" placeholder="Agregar producto por código (Enter)" aria-label="Agregar producto por código"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarItem(fAbierta.ticket, e.target.value); e.target.value = ""; } }}
                  style={{ ...MONO, width: 280, fontSize: 12.5, padding: "7px 8px", border: "1px dashed #94a3b8", borderRadius: 6 }} />
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={fAbierta.incluir} disabled={!fAbierta.ubicacionId}
                onChange={(e) => patchFila(fAbierta.ticket, (x) => ({ ...x, incluir: e.target.checked }))} style={{ accentColor: "#1d4e89", width: 16, height: 16 }} />
              Confirmar este ticket (si lo destildás, se omite)
            </label>
          </div>
        )}
      </Modal>

      <Modal open={confirmando} onClose={() => { if (!procesando) setConfirmando(false); }} title="Confirmar descuento de stock" width="460px"
        footer={
          <>
            <span style={{ fontSize: 11.5, color: "#94a3b8" }}>{procesando ? `Registrando ${progreso.hechos} de ${progreso.total}…` : ""}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <BtnSecondary onClick={() => setConfirmando(false)}>Cancelar</BtnSecondary>
              <BtnPrimary onClick={ejecutar} loading={procesando}>Confirmar {ops.length}</BtnPrimary>
            </div>
          </>
        }>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "#334155" }}>Se van a confirmar <strong>{ops.length}</strong> tickets, de la fecha más vieja a la más nueva:</p>
        <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 13, color: "#334155" }}>
          {resumenDestinos.map(([n, c]) => <li key={n}>{n}: {c} ticket{c !== 1 ? "s" : ""}</li>)}
        </ul>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748b" }}>Cada ticket queda registrado por número. Si volvés a subir la misma planilla, lo ya confirmado no se repite.</p>
      </Modal>
    </div>
  );
}
