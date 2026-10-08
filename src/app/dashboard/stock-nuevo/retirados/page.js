"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import BotonExportar from "@/components/BotonExportar";
import { descargarTabla } from "@/lib/exportaciones";
import Modal, { BtnPrimary, BtnSecondary } from "@/components/Modal";
import { norm, piezasDeRetiro } from "@/lib/tickets";
import { fmtFecha, mensajeDeError } from "@/lib/stockNuevo";

const BASE = "/stock-nuevo";
const MONO = { fontFamily: "DM Mono, monospace" };
const TH = {
  textAlign: "left", padding: "9px 12px", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.07em",
  textTransform: "uppercase", color: "#94a3b8", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
};
const TD = { padding: "10px 12px", fontSize: 13, color: "#334155", verticalAlign: "top", borderBottom: "1px solid #f1f5f9" };

const piezasEsperadas = (r) => {
  const piezas = piezasDeRetiro(norm(r.descripcion || ""));
  piezas[0] = r.modelo ? `Dispositivo ${r.modelo}` : "Dispositivo";
  return piezas;
};

const tiempo = (dias) => (dias === null || dias === undefined ? "Sin fecha" : dias === 0 ? "Hoy" : dias === 1 ? "1 día" : `${dias} días`);

export default function Retirados() {
  const { rol } = useAuth();
  const [datos, setDatos] = useState({ dias_alerta: 15, retirados: [] });
  const [faltantes, setFaltantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);
  const [recibiendo, setRecibiendo] = useState(null);
  const [llego, setLlego] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [dias, setDias] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [soloAtrasados, setSoloAtrasados] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [r, f] = await Promise.all([api.get(`${BASE}/retirados/`), api.get(`${BASE}/faltantes/`)]);
      setDatos(r); setFaltantes(f || []); setDias(String(r.dias_alerta));
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e) });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const atrasados = datos.retirados.filter((r) => (r.dias ?? 0) > datos.dias_alerta);
  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return datos.retirados
      .filter((r) => !soloAtrasados || (r.dias ?? 0) > datos.dias_alerta)
      .filter((r) => !q || [r.serial, r.modelo, r.ubicacion, r.ticket_numero, r.cliente].some((x) => String(x || "").toLowerCase().includes(q)));
  }, [datos, busqueda, soloAtrasados]);

  const exportarRetirados = () => descargarTabla(
    `Retirados_pendientes_${new Date().toLocaleDateString("sv-SE")}.xlsx`, "Retirados pendientes",
    ["Número de serie", "Modelo", "Dónde está", "Ticket", "Cliente", "Fecha del retiro", "Días", "Piezas esperadas", "Texto del ticket"],
    lista.map((r) => [r.serial, r.modelo || "", (r.ubicacion || "").trim(), r.ticket_numero || "", r.cliente || "", r.fecha ? fmtFecha(r.fecha) : "",
      r.dias ?? "", piezasEsperadas(r).join(", "), r.descripcion || ""]),
    [20, 28, 22, 10, 28, 14, 8, 40, 60]
  );

  const exportarFaltantes = () => descargarTabla(
    `Faltantes_${new Date().toLocaleDateString("sv-SE")}.xlsx`, "Faltantes",
    ["Número de serie", "Ticket", "Dónde estaba", "Pieza que falta", "Registrado"],
    faltantes.map((f) => [f.serial, f.ticket_numero || "", (f.ubicaciones?.nombre || "").trim(), f.pieza, f.creado_en ? fmtFecha(f.creado_en.slice(0, 10)) : ""]),
    [20, 10, 22, 30, 14]
  );

  const abrirRecepcion = (r) => {
    setRecibiendo(r);
    setLlego(Object.fromEntries(piezasEsperadas(r).map((p) => [p, true])));
  };

  const confirmarRecepcion = async () => {
    setGuardando(true); setMensaje(null);
    try {
      const r = await api.post(`${BASE}/retirados/${encodeURIComponent(recibiendo.serial)}/recibir/`, {
        piezas: Object.entries(llego).map(([pieza, ok]) => ({ pieza, llego: ok })),
      });
      setMensaje({ tipo: "ok", texto: `Equipo ${recibiendo.serial} recibido en la Oficina.${r?.faltantes ? ` Quedaron ${r.faltantes} faltante${r.faltantes !== 1 ? "s" : ""} registrado${r.faltantes !== 1 ? "s" : ""}.` : ""}` });
      setRecibiendo(null);
      await cargar();
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e) });
    } finally {
      setGuardando(false);
    }
  };

  const resolver = async (id) => {
    try { await api.patch(`${BASE}/faltantes/${id}/resolver/`); await cargar(); }
    catch (e) { setMensaje({ tipo: "error", texto: mensajeDeError(e) }); }
  };

  const guardarDias = async () => {
    try {
      await api.put(`${BASE}/retirados/dias-alerta/`, { dias: parseInt(dias, 10) });
      setMensaje({ tipo: "ok", texto: "Días de alerta guardados." });
      await cargar();
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e) });
    }
  };

  const tarjeta = (titulo, valor, color) => (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px" }}>
      <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>{titulo}</div>
      <div style={{ ...MONO, fontSize: 24, fontWeight: 700, color, marginTop: 6 }}>{valor}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c2410c" }}>Stock</div>
        <h1 style={{ margin: "2px 0 0", fontSize: 24, color: "#0f172a" }}>Retirados pendientes de bajar</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b", maxWidth: 800 }}>
          Equipos que se desinstalaron y todavía están en una camioneta o taller. Hasta que se reciban en la Oficina no se pueden volver a instalar, y mientras tanto no suman al stock disponible.
        </p>
      </div>

      {mensaje && (
        <div role={mensaje.tipo === "ok" ? "status" : "alert"} style={{
          background: mensaje.tipo === "ok" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${mensaje.tipo === "ok" ? "#bbf7d0" : "#fecaca"}`,
          color: mensaje.tipo === "ok" ? "#166534" : "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: 13,
        }}>{mensaje.texto}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
        {tarjeta("Pendientes de bajar", datos.retirados.length, "#0f172a")}
        {tarjeta(`Con más de ${datos.dias_alerta} días`, atrasados.length, atrasados.length ? "#b91c1c" : "#15803d")}
        {tarjeta("Faltantes sin resolver", faltantes.length, faltantes.length ? "#b45309" : "#15803d")}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label htmlFor="buscar-retirado" style={{ fontSize: 12.5, color: "#64748b" }}>Buscar</label>
        <input id="buscar-retirado" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Serie, modelo, ubicación o ticket"
          style={{ width: 280, fontSize: 13.5, border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px" }} />
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
          <input type="checkbox" checked={soloAtrasados} onChange={(e) => setSoloAtrasados(e.target.checked)} style={{ accentColor: "#1d4e89", width: 16, height: 16 }} />
          Solo los atrasados
        </label>
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 10, flexWrap: "wrap" }}>
          <BotonExportar onExportar={exportarRetirados}>Exportar retirados</BotonExportar>
          {faltantes.length > 0 && <BotonExportar onExportar={exportarFaltantes}>Exportar faltantes</BotonExportar>}
        </span>
        {rol === "admin" && (
          <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, color: "#64748b" }}>
            <label htmlFor="dias-alerta">Alertar después de</label>
            <input id="dias-alerta" type="number" min="1" max="365" value={dias} onChange={(e) => setDias(e.target.value)}
              style={{ ...MONO, width: 64, textAlign: "right", border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px" }} />
            <span>días</span>
            <button type="button" onClick={guardarDias} style={{ border: "none", borderRadius: 8, background: "#1d4e89", color: "#ffffff", fontWeight: 700, fontSize: 12.5, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}>Guardar</button>
          </span>
        )}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflowX: "auto" }}>
        {cargando ? (
          <div style={{ padding: 24, fontSize: 13, color: "#64748b" }}>Cargando…</div>
        ) : lista.length === 0 ? (
          <div style={{ padding: 24, fontSize: 13, color: "#64748b" }}>No hay retirados pendientes de bajar.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr>
                <th style={TH}>Equipo</th><th style={TH}>Dónde está</th><th style={TH}>Ticket</th>
                <th style={TH}>Tiempo</th><th style={TH}>Piezas esperadas</th><th style={TH}><span className="sr-only">Acción</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => {
                const atrasado = (r.dias ?? 0) > datos.dias_alerta;
                return (
                  <tr key={r.serial}>
                    <td style={TD}><div style={{ ...MONO, fontWeight: 600 }}>{r.serial}</div><div style={{ fontSize: 12, color: "#64748b" }}>{r.modelo || "—"}</div></td>
                    <td style={TD}>{r.ubicacion ? r.ubicacion.trim() : <span style={{ color: "#94a3b8" }}>Sin dato</span>}</td>
                    <td style={TD}>
                      <div style={MONO}>{r.ticket_numero ? `#${r.ticket_numero}` : "—"}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{r.fecha ? fmtFecha(r.fecha) : ""}</div>
                      {r.descripcion && <div style={{ fontSize: 12, color: "#94a3b8", maxWidth: 260, marginTop: 2 }}>{r.descripcion}</div>}
                    </td>
                    <td style={{ ...TD, fontWeight: 700, color: atrasado ? "#b91c1c" : "#334155" }}>{tiempo(r.dias)}{atrasado ? " ⚠" : ""}</td>
                    <td style={TD}>{piezasEsperadas(r).join(", ")}</td>
                    <td style={TD}>
                      <button type="button" onClick={() => abrirRecepcion(r)}
                        style={{ border: "none", borderRadius: 8, background: "#1d4e89", color: "#ffffff", fontWeight: 700, fontSize: 12.5, padding: "8px 14px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                        Recibir en la Oficina
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {faltantes.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Faltantes registrados</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {faltantes.map((f) => (
              <div key={f.id} style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", fontSize: 13, borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                <span style={{ ...MONO, fontWeight: 600 }}>{f.serial}</span>
                <span style={{ color: "#64748b" }}>{f.ubicaciones?.nombre?.trim() || "Sin dato"}{f.ticket_numero ? ` · ticket ${f.ticket_numero}` : ""}</span>
                <span>Falta: <b>{f.pieza}</b></span>
                <button type="button" onClick={() => resolver(f.id)}
                  style={{ marginLeft: "auto", border: "none", borderRadius: 8, background: "#15803d", color: "#ffffff", fontWeight: 700, fontSize: 12.5, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}>
                  Marcar como resuelto
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={!!recibiendo} onClose={() => { if (!guardando) setRecibiendo(null); }} width="480px"
        title={recibiendo ? `Recibir equipo ${recibiendo.serial}` : ""}
        footer={<><span /><div style={{ display: "flex", gap: 8 }}><BtnSecondary onClick={() => setRecibiendo(null)}>Cancelar</BtnSecondary><BtnPrimary onClick={confirmarRecepcion} loading={guardando}>Confirmar recepción</BtnPrimary></div></>}>
        {recibiendo && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              Viene de {recibiendo.ubicacion ? recibiendo.ubicacion.trim() : "una ubicación sin dato"}. Marcá lo que llegó. Lo que quede como &ldquo;No llegó&rdquo; se registra como faltante.
            </p>
            {Object.keys(llego).map((pieza) => (
              <div key={pieza} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: 14 }}>{pieza}</span>
                <button type="button" aria-pressed={llego[pieza]} onClick={() => setLlego((l) => ({ ...l, [pieza]: !l[pieza] }))}
                  style={{ minWidth: 96, border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "#ffffff", background: llego[pieza] ? "#15803d" : "#b91c1c" }}>
                  {llego[pieza] ? "Llegó" : "No llegó"}
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
