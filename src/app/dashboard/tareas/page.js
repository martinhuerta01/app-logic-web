"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Modal, { BtnPrimary, BtnSecondary, KeyboardHint, FieldLabel, FieldInput, FieldTextarea, ChipGroup } from "@/components/Modal";

// ── Constantes ────────────────────────────────────────────────────────
const TIPOS = {
  tarea:         { label: "Tarea",         color: "bg-slate-100 text-slate-600 border-slate-200" },
  investigacion: { label: "Investigación", color: "bg-blue-100 text-blue-700 border-blue-200" },
  bug:           { label: "Bug",           color: "bg-red-100 text-red-700 border-red-200" },
  mejora:        { label: "Mejora",        color: "bg-violet-100 text-violet-700 border-violet-200" },
};

const PRIORIDADES = {
  alta:  { label: "Alta",  color: "bg-red-100 text-red-700" },
  media: { label: "Media", color: "bg-amber-100 text-amber-700" },
  baja:  { label: "Baja",  color: "bg-green-100 text-green-700" },
};

const ESTADOS = [
  { key: "pendiente",   label: "Pendiente",   dot: "bg-slate-400" },
  { key: "en_progreso", label: "En Progreso", dot: "bg-blue-500"  },
  { key: "completada",  label: "Resuelto",    dot: "bg-green-500" },
];
const ESTADO_IDX = { pendiente: 0, en_progreso: 1, completada: 2 };
const ESTADO_COLOR = {
  pendiente:   "bg-slate-100 text-slate-600",
  en_progreso: "bg-blue-100 text-blue-700",
  completada:  "bg-green-100 text-green-700",
};

function fmtFecha(str) {
  if (!str) return "";
  return str.split("-").reverse().join("/");
}

function diasVenc(fecha) {
  if (!fecha) return 999;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(fecha + "T00:00:00") - hoy) / 86400000);
}

function numStr(n) {
  return n != null ? `#${String(n).padStart(3, "0")}` : "#---";
}


// ── Modal crear / editar ──────────────────────────────────────────────
function ModalTicket({ ticket, onClose, onSave }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    titulo:            ticket?.titulo            || "",
    descripcion:       ticket?.descripcion       || "",
    tipo:              ticket?.tipo              || "tarea",
    categoria:         ticket?.categoria         || "",
    prioridad:         ticket?.prioridad         || "media",
    estado:            ticket?.estado            || "pendiente",
    asignado_a:        ticket?.asignado_a        || "",
    fecha_vencimiento: ticket?.fecha_vencimiento || "",
  });
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const guardar = async () => {
    if (!form.titulo.trim()) return;
    setGuardando(true);
    const body = {
      ...form,
      fecha_vencimiento: form.fecha_vencimiento || null,
      categoria:         form.categoria.trim()  || null,
      asignado_a:        form.asignado_a.trim() || null,
    };
    if (!ticket) body.cargado_por = user;
    const ok = await onSave(ticket?.id, body);
    if (ok) onClose();
    setGuardando(false);
  };

  const TICKET_ICON = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/>
    </svg>
  );

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={ticket ? `Editar ${numStr(ticket.numero)}` : "Nuevo ticket"}
      icon={TICKET_ICON}
      width="520px"
      footer={
        <>
          <KeyboardHint />
          <div style={{ display: "flex", gap: 8 }}>
            <BtnSecondary onClick={onClose}>Cancelar</BtnSecondary>
            <BtnPrimary onClick={guardar} disabled={!form.titulo.trim()} loading={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </BtnPrimary>
          </div>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Título */}
        <div>
          <FieldLabel required>Título</FieldLabel>
          <FieldInput
            type="text" value={form.titulo}
            onChange={e => set("titulo", e.target.value)}
            placeholder="Descripción breve del ticket…"
            autoFocus
          />
        </div>

        {/* Tipo + Categoría */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FieldLabel>Tipo</FieldLabel>
            <ChipGroup
              options={Object.entries(TIPOS).map(([k, v]) => ({ value: k, label: v.label }))}
              value={form.tipo}
              onChange={v => set("tipo", v)}
            />
          </div>
          <div>
            <FieldLabel>Categoría</FieldLabel>
            <FieldInput
              type="text" value={form.categoria}
              onChange={e => set("categoria", e.target.value)}
              placeholder="GPS, Stock, Sistema…"
            />
          </div>
        </div>

        {/* Prioridad */}
        <div>
          <FieldLabel>Prioridad</FieldLabel>
          <ChipGroup
            options={Object.entries(PRIORIDADES).map(([k, v]) => ({ value: k, label: v.label }))}
            value={form.prioridad}
            onChange={v => set("prioridad", v)}
          />
        </div>

        {/* Estado + Vencimiento */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FieldLabel>Estado</FieldLabel>
            <ChipGroup
              options={ESTADOS.map(e => ({ value: e.key, label: e.label }))}
              value={form.estado}
              onChange={v => set("estado", v)}
            />
          </div>
          <div>
            <FieldLabel>Vencimiento</FieldLabel>
            <FieldInput
              type="date" value={form.fecha_vencimiento}
              onChange={e => set("fecha_vencimiento", e.target.value)}
            />
          </div>
        </div>

        {/* Descripción */}
        <div>
          <FieldLabel>Descripción</FieldLabel>
          <FieldTextarea
            value={form.descripcion}
            onChange={e => set("descripcion", e.target.value)}
            rows={3}
            placeholder="Detalle adicional…"
          />
        </div>

        {/* Asignado a */}
        <div>
          <FieldLabel>Asignado a</FieldLabel>
          <FieldInput
            type="text" value={form.asignado_a}
            onChange={e => set("asignado_a", e.target.value)}
            placeholder="Nombre (opcional)"
          />
        </div>
      </div>
    </Modal>
  );
}


// ── Panel de detalle (slide-over derecho) ─────────────────────────────
function PanelDetalle({ ticket, onClose, onEdit, onDelete, onMover }) {
  const { user } = useAuth();
  const [notas,        setNotas]        = useState([]);
  const [nuevaNota,    setNuevaNota]    = useState("");
  const [guardandoN,   setGuardandoN]   = useState(false);
  const [cargandoN,    setCargandoN]    = useState(false);
  const [errorNota,    setErrorNota]    = useState("");

  useEffect(() => {
    if (ticket?.id) cargarNotas();
  }, [ticket?.id]);

  const cargarNotas = async () => {
    setCargandoN(true);
    try {
      const data = await api.get(`/tareas/${ticket.id}/notas/`);
      setNotas(data || []);
    } catch (e) {
      setErrorNota("No se pudieron cargar las notas.");
    }
    setCargandoN(false);
  };

  const agregarNota = async () => {
    if (!nuevaNota.trim()) return;
    setErrorNota("");
    setGuardandoN(true);
    try {
      await api.post(`/tareas/${ticket.id}/notas/`, { texto: nuevaNota.trim(), cargado_por: user });
      setNuevaNota("");
      cargarNotas();
    } catch (e) {
      setErrorNota("Error al guardar la nota. Verificá que la tabla ticket_notas exista en Supabase.");
    }
    setGuardandoN(false);
  };

  const eliminarNota = async (id) => {
    try {
      await api.delete(`/tareas/${ticket.id}/notas/${id}`);
      cargarNotas();
    } catch {
      setErrorNota("Error al eliminar la nota.");
    }
  };

  const tipo     = TIPOS[ticket.tipo]           || TIPOS.tarea;
  const prio     = PRIORIDADES[ticket.prioridad] || PRIORIDADES.media;
  const estadoObj = ESTADOS[ESTADO_IDX[ticket.estado]] || ESTADOS[0];
  const idx      = ESTADO_IDX[ticket.estado] ?? 0;
  const dias     = diasVenc(ticket.fecha_vencimiento);

  const TIPO_STYLE = {
    tarea:         { bg: "#f1f5f9", color: "#475569" },
    investigacion: { bg: "#eff6ff", color: "#2563eb" },
    bug:           { bg: "#fef2f2", color: "#dc2626" },
    mejora:        { bg: "#f5f3ff", color: "#7c3aed" },
  };
  const PRIO_STYLE = {
    alta:  { bg: "#fef2f2", color: "#dc2626" },
    media: { bg: "#fffbeb", color: "#d97706" },
    baja:  { bg: "#f0fdf4", color: "#16a34a" },
  };
  const ESTADO_STYLE = {
    pendiente:   { bg: "#f1f5f9", color: "#64748b" },
    en_progreso: { bg: "#eff6ff", color: "#2563eb" },
    completada:  { bg: "#f0fdf4", color: "#16a34a" },
  };
  const tipoSt  = TIPO_STYLE[ticket.tipo]      || TIPO_STYLE.tarea;
  const prioSt  = PRIO_STYLE[ticket.prioridad] || PRIO_STYLE.media;
  const estadoSt = ESTADO_STYLE[ticket.estado] || ESTADO_STYLE.pendiente;

  return (
    <>
      {/* Overlay */}
      <div style={{ position:"fixed", inset:0, background:"rgba(8,15,30,0.35)", zIndex:40, backdropFilter:"blur(2px)" }} onClick={onClose} />

      {/* Slide-over */}
      <div style={{
        position:"fixed", right:0, top:0, height:"100%",
        width:"100%", maxWidth:420,
        background:"#ffffff",
        borderLeft:"1px solid #e2e8f0",
        zIndex:50, display:"flex", flexDirection:"column",
        boxShadow:"-12px 0 48px rgba(0,0,0,0.10)",
      }}>

        {/* Header */}
        <div style={{
          background:"linear-gradient(135deg, #1e3a8a, #1d4ed8)",
          padding:"14px 16px", flexShrink:0,
        }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6, flexWrap:"wrap" }}>
                <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.5)", fontFamily:"DM Mono, monospace" }}>
                  {numStr(ticket.numero)}
                </span>
                <span style={{ fontSize:10, padding:"2px 8px", borderRadius:999, fontWeight:500, background:"rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.9)" }}>
                  {tipo.label}
                </span>
                <span style={{ fontSize:10, padding:"2px 8px", borderRadius:999, fontWeight:500, background:"rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.85)" }}>
                  {prio.label}
                </span>
              </div>
              <h2 style={{ margin:0, fontSize:14, fontWeight:600, color:"#ffffff", lineHeight:1.3 }}>
                {ticket.titulo}
              </h2>
            </div>
            <button onClick={onClose} style={{
              display:"flex", alignItems:"center", justifyContent:"center",
              width:26, height:26, borderRadius:7, flexShrink:0,
              border:"none", cursor:"pointer",
              background:"rgba(255,255,255,0.10)", color:"rgba(255,255,255,0.80)",
              transition:"background 150ms",
            }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.20)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.10)"}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto" }}>

          {/* Metadata */}
          <div style={{ padding:"16px", borderBottom:"1px solid #f1f5f9" }}>

            {/* Estado + navegación */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <span style={{
                fontSize:11, padding:"3px 10px", borderRadius:999, fontWeight:600,
                background: estadoSt.bg, color: estadoSt.color,
              }}>
                {estadoObj.label}
              </span>
              <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
                {idx > 0 && (
                  <button onClick={() => onMover(ticket.id, ESTADOS[idx-1].key)} style={{
                    fontSize:11, padding:"4px 10px", borderRadius:7,
                    border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#475569",
                    cursor:"pointer", transition:"background 120ms",
                  }}>
                    ← {ESTADOS[idx-1].label}
                  </button>
                )}
                {idx < 2 && (
                  <button onClick={() => onMover(ticket.id, ESTADOS[idx+1].key)} style={{
                    fontSize:11, padding:"4px 10px", borderRadius:7,
                    border:"1.5px solid #2563eb", background:"#eff6ff", color:"#2563eb",
                    cursor:"pointer", fontWeight:500, transition:"background 120ms",
                  }}>
                    {ESTADOS[idx+1].label} →
                  </button>
                )}
              </div>
            </div>

            {/* Meta grid */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 12px", marginBottom:12 }}>
              {[
                ticket.categoria && { label:"Categoría", value: ticket.categoria },
                ticket.asignado_a && { label:"Asignado a", value: ticket.asignado_a },
                ticket.cargado_por && { label:"Creado por", value: ticket.cargado_por },
                ticket.fecha_vencimiento && {
                  label:"Vencimiento",
                  value: `${fmtFecha(ticket.fecha_vencimiento)}${dias < 0 ? ` (hace ${Math.abs(dias)}d)` : dias === 0 ? " (hoy)" : dias === 1 ? " (mañana)" : ""}`,
                  color: dias < 0 ? "#dc2626" : dias <= 2 ? "#d97706" : undefined,
                },
              ].filter(Boolean).map((item, i) => (
                <div key={i}>
                  <p style={{ margin:0, fontSize:9, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8" }}>{item.label}</p>
                  <p style={{ margin:"2px 0 0", fontSize:12, color: item.color || "#334155", fontWeight: item.color ? 600 : 400 }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Descripción */}
            {ticket.descripcion && (
              <div style={{ background:"#f8fafc", border:"1px solid #f1f5f9", borderRadius:8, padding:"10px 12px", marginBottom:12 }}>
                <p style={{ margin:0, fontSize:12.5, color:"#475569", lineHeight:1.6, whiteSpace:"pre-wrap" }}>
                  {ticket.descripcion}
                </p>
              </div>
            )}

            {/* Acciones */}
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => onEdit(ticket)} style={{
                flex:1, padding:"7px", borderRadius:8, fontSize:12,
                border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#334155",
                cursor:"pointer", fontWeight:500, transition:"background 120ms",
              }}>
                ✎ Editar
              </button>
              <button onClick={() => { if (window.confirm("¿Eliminar este ticket?")) { onDelete(ticket.id); onClose(); } }} style={{
                flex:1, padding:"7px", borderRadius:8, fontSize:12,
                border:"1.5px solid #fecaca", background:"#fef2f2", color:"#dc2626",
                cursor:"pointer", fontWeight:500, transition:"background 120ms",
              }}>
                Eliminar
              </button>
            </div>
          </div>

          {/* Notas */}
          <div style={{ padding:"16px" }}>
            <p style={{ margin:"0 0 12px", fontSize:9.5, fontWeight:600, letterSpacing:"0.07em", textTransform:"uppercase", color:"#94a3b8" }}>
              Notas / Historial
            </p>

            {cargandoN ? (
              <p style={{ fontSize:12, color:"#94a3b8", fontStyle:"italic" }}>Cargando…</p>
            ) : notas.length === 0 ? (
              <p style={{ fontSize:12, color:"#94a3b8", fontStyle:"italic", marginBottom:16 }}>Sin notas aún.</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                {notas.map(n => (
                  <div key={n.id} style={{
                    background:"#f8fafc", border:"1px solid #f1f5f9", borderRadius:8, padding:"10px 12px",
                  }}
                    onMouseEnter={e=>e.currentTarget.querySelector(".nota-del")?.style && (e.currentTarget.querySelector(".nota-del").style.opacity="1")}
                    onMouseLeave={e=>e.currentTarget.querySelector(".nota-del")?.style && (e.currentTarget.querySelector(".nota-del").style.opacity="0")}
                  >
                    <p style={{ margin:0, fontSize:12.5, color:"#334155", whiteSpace:"pre-wrap", lineHeight:1.6 }}>{n.texto}</p>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:6 }}>
                      <span style={{ fontSize:10, color:"#94a3b8", fontFamily:"DM Mono, monospace" }}>
                        {n.cargado_por && `${n.cargado_por} · `}
                        {n.created_at ? new Date(n.created_at).toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit" }) : ""}
                      </span>
                      <button className="nota-del" onClick={() => eliminarNota(n.id)} style={{
                        fontSize:10, color:"#ef4444", background:"none", border:"none",
                        cursor:"pointer", opacity:0, transition:"opacity 150ms",
                      }}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {errorNota && (
              <div style={{ fontSize:12, color:"#dc2626", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"8px 12px", marginBottom:10 }}>
                {errorNota}
              </div>
            )}

            <textarea
              value={nuevaNota}
              onChange={e => setNuevaNota(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) agregarNota(); }}
              placeholder="Agregar nota… (Ctrl+Enter para guardar)"
              rows={3}
              style={{
                width:"100%", padding:"8px 11px", borderRadius:8,
                border:"1.5px solid #e2e8f0", background:"#f8fafc",
                fontSize:12.5, resize:"none", outline:"none",
                fontFamily:"inherit", lineHeight:1.5, marginBottom:8,
                boxSizing:"border-box",
              }}
              onFocus={e=>{e.target.style.borderColor="#2563eb"; e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,0.08)"; e.target.style.background="#fff";}}
              onBlur={e=>{e.target.style.borderColor="#e2e8f0"; e.target.style.boxShadow="none"; e.target.style.background="#f8fafc";}}
            />
            <button onClick={agregarNota} disabled={!nuevaNota.trim() || guardandoN} style={{
              width:"100%", padding:"8px", borderRadius:8, fontSize:12.5,
              border:"none", background: (!nuevaNota.trim() || guardandoN) ? "#93c5fd" : "#2563eb",
              color:"#fff", fontWeight:600, cursor: (!nuevaNota.trim() || guardandoN) ? "not-allowed" : "pointer",
              transition:"background 150ms",
            }}>
              {guardandoN ? "Guardando…" : "Agregar nota"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


// ── Tarjeta Kanban ────────────────────────────────────────────────────
const TIPO_BADGE = {
  tarea:         { bg:"#f1f5f9", color:"#475569" },
  investigacion: { bg:"#eff6ff", color:"#2563eb" },
  bug:           { bg:"#fef2f2", color:"#dc2626" },
  mejora:        { bg:"#f5f3ff", color:"#7c3aed" },
};
const PRIO_BADGE = {
  alta:  { bg:"#fef2f2", color:"#dc2626" },
  media: { bg:"#fffbeb", color:"#d97706" },
  baja:  { bg:"#f0fdf4", color:"#16a34a" },
};

function KanbanCard({ ticket, onDetalle, onMover }) {
  const tipo = TIPOS[ticket.tipo] || TIPOS.tarea;
  const prio = PRIORIDADES[ticket.prioridad] || PRIORIDADES.media;
  const idx  = ESTADO_IDX[ticket.estado] ?? 0;
  const dias = diasVenc(ticket.fecha_vencimiento);
  const vencida = dias < 0 && ticket.estado !== "completada";
  const tipoBadge = TIPO_BADGE[ticket.tipo] || TIPO_BADGE.tarea;
  const prioBadge = PRIO_BADGE[ticket.prioridad] || PRIO_BADGE.media;

  return (
    <div
      style={{
        background: vencida ? "#fff8f8" : "#ffffff",
        border: `1px solid ${vencida ? "#fecaca" : "#e2e8f0"}`,
        borderRadius:10, padding:"12px", cursor:"pointer",
        transition:"border-color 150ms, box-shadow 150ms",
      }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor=vencida?"#fca5a5":"#93c5fd"; e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.06)"; e.currentTarget.querySelector(".kanban-arrows").style.opacity="1"; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor=vencida?"#fecaca":"#e2e8f0"; e.currentTarget.style.boxShadow="none"; e.currentTarget.querySelector(".kanban-arrows").style.opacity="0"; }}
      onClick={() => onDetalle(ticket)}
    >
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
        <span style={{ fontSize:9.5, fontWeight:700, color:"#94a3b8", fontFamily:"DM Mono, monospace" }}>{numStr(ticket.numero)}</span>
        <span style={{ fontSize:9.5, padding:"2px 7px", borderRadius:999, fontWeight:500, background:tipoBadge.bg, color:tipoBadge.color }}>{tipo.label}</span>
      </div>

      <p style={{ margin:"0 0 10px", fontSize:12.5, fontWeight:500, color:"#1e293b", lineHeight:1.4 }}>{ticket.titulo}</p>

      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
        <span style={{ fontSize:9.5, padding:"2px 7px", borderRadius:999, fontWeight:600, background:prioBadge.bg, color:prioBadge.color }}>{prio.label}</span>
        {ticket.categoria && (
          <span style={{ fontSize:9.5, padding:"2px 7px", borderRadius:999, background:"#f1f5f9", color:"#64748b" }}>{ticket.categoria}</span>
        )}
        {ticket.asignado_a && (
          <span style={{ fontSize:9.5, color:"#94a3b8", marginLeft:"auto" }}>→ {ticket.asignado_a}</span>
        )}
      </div>

      {ticket.fecha_vencimiento && (
        <p style={{ margin:"8px 0 0", fontSize:9.5, color: vencida?"#dc2626": dias<=2?"#d97706":"#94a3b8", fontWeight: (vencida||dias<=2)?600:400, fontFamily:"DM Mono, monospace" }}>
          {vencida ? `⚠ ${fmtFecha(ticket.fecha_vencimiento)}` : `📅 ${fmtFecha(ticket.fecha_vencimiento)}`}
        </p>
      )}

      {/* Flechas de mover */}
      <div className="kanban-arrows"
        style={{ display:"flex", gap:6, marginTop:10, opacity:0, transition:"opacity 150ms" }}
        onClick={e => e.stopPropagation()}>
        {idx > 0 && (
          <button onClick={() => onMover(ticket.id, ESTADOS[idx-1].key)} style={{
            flex:1, fontSize:10, padding:"4px 0", borderRadius:6,
            border:"1px solid #e2e8f0", background:"#f8fafc", color:"#475569",
            cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          }}>
            ← {ESTADOS[idx-1].label}
          </button>
        )}
        {idx < 2 && (
          <button onClick={() => onMover(ticket.id, ESTADOS[idx+1].key)} style={{
            flex:1, fontSize:10, padding:"4px 0", borderRadius:6,
            border:"1px solid #bfdbfe", background:"#eff6ff", color:"#2563eb",
            cursor:"pointer", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          }}>
            {ESTADOS[idx+1].label} →
          </button>
        )}
      </div>
    </div>
  );
}


const ESTADO_DOT = { pendiente:"#94a3b8", en_progreso:"#2563eb", completada:"#16a34a" };

// ── Vista Kanban ──────────────────────────────────────────────────────
function VistaKanban({ tickets, onDetalle, onMover }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
      {ESTADOS.map(estado => {
        const col = tickets.filter(t => t.estado === estado.key);
        return (
          <div key={estado.key} style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {/* Column header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 2px", marginBottom:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background: ESTADO_DOT[estado.key], display:"inline-block" }}/>
                <span style={{ fontSize:12.5, fontWeight:600, color:"#334155" }}>{estado.label}</span>
              </div>
              <span style={{ fontSize:11, color:"#94a3b8", fontWeight:600, background:"#f1f5f9", padding:"1px 8px", borderRadius:999, fontFamily:"DM Mono, monospace" }}>{col.length}</span>
            </div>
            {/* Column body */}
            <div style={{
              background:"#f8fafc", borderRadius:10, padding:8,
              border:"1px solid #f1f5f9", minHeight:200,
              display:"flex", flexDirection:"column", gap:8,
            }}>
              {col.length === 0 && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:80, fontSize:11.5, color:"#cbd5e1", fontStyle:"italic" }}>
                  Sin tickets
                </div>
              )}
              {col.map(t => (
                <KanbanCard key={t.id} ticket={t} onDetalle={onDetalle} onMover={onMover} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ── Vista Lista ───────────────────────────────────────────────────────
function VistaLista({ tickets, onDetalle }) {
  const [filtroEstado,    setFiltroEstado]    = useState("todos");
  const [filtroTipo,      setFiltroTipo]      = useState("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todos");
  const [busqueda,        setBusqueda]        = useState("");

  const filtrados = tickets.filter(t => {
    if (filtroEstado    !== "todos" && t.estado    !== filtroEstado)    return false;
    if (filtroTipo      !== "todos" && t.tipo      !== filtroTipo)      return false;
    if (filtroPrioridad !== "todos" && t.prioridad !== filtroPrioridad) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!t.titulo.toLowerCase().includes(q) &&
          !(t.descripcion?.toLowerCase().includes(q)) &&
          !(t.categoria?.toLowerCase().includes(q)) &&
          !(t.asignado_a?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  function PillGroup({ options, value, onChange }) {
    return (
      <div style={{ display:"flex", gap:2, background:"#f1f5f9", borderRadius:8, padding:3 }}>
        {options.map(o => (
          <button key={o.k} onClick={() => onChange(o.k)} style={{
            padding:"5px 12px", borderRadius:6, border:"none", fontSize:11.5, fontWeight:500,
            background: value===o.k ? "#ffffff" : "transparent",
            color: value===o.k ? "#1e293b" : "#64748b",
            boxShadow: value===o.k ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            cursor:"pointer", transition:"all 120ms",
          }}>{o.l}</button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Filtros */}
      <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:8 }}>
        <PillGroup
          options={[{ k:"todos", l:"Todos" }, ...ESTADOS.map(e => ({ k:e.key, l:e.label }))]}
          value={filtroEstado} onChange={setFiltroEstado}
        />
        <PillGroup
          options={[{ k:"todos", l:"Tipo" }, ...Object.entries(TIPOS).map(([k,v]) => ({ k, l:v.label }))]}
          value={filtroTipo} onChange={setFiltroTipo}
        />
        <PillGroup
          options={[{ k:"todos", l:"Prioridad" }, ...Object.entries(PRIORIDADES).map(([k,v]) => ({ k, l:v.label }))]}
          value={filtroPrioridad} onChange={setFiltroPrioridad}
        />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar…"
          style={{ padding:"6px 11px", borderRadius:8, border:"1.5px solid #e2e8f0", background:"#f8fafc", fontSize:12.5, outline:"none", minWidth:160, fontFamily:"inherit" }}
          onFocus={e=>{e.target.style.borderColor="#2563eb"; e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,0.08)";}}
          onBlur={e=>{e.target.style.borderColor="#e2e8f0"; e.target.style.boxShadow="none";}}
        />
      </div>

      {filtrados.length === 0 ? (
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", padding:"40px 20px", textAlign:"center", fontSize:13, color:"#94a3b8" }}>
          No hay tickets con los filtros seleccionados
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {filtrados.map(t => {
            const tipo      = TIPOS[t.tipo]            || TIPOS.tarea;
            const prio      = PRIORIDADES[t.prioridad] || PRIORIDADES.media;
            const estadoObj = ESTADOS[ESTADO_IDX[t.estado]] || ESTADOS[0];
            const dias      = diasVenc(t.fecha_vencimiento);
            const vencida   = dias < 0 && t.estado !== "completada";
            const tipoBadge = TIPO_BADGE[t.tipo]      || TIPO_BADGE.tarea;
            const prioBadge = PRIO_BADGE[t.prioridad] || PRIO_BADGE.media;
            const estadoBadge = { pendiente:{bg:"#f1f5f9",color:"#64748b"}, en_progreso:{bg:"#eff6ff",color:"#2563eb"}, completada:{bg:"#f0fdf4",color:"#16a34a"} }[t.estado] || {bg:"#f1f5f9",color:"#64748b"};

            return (
              <div key={t.id}
                onClick={() => onDetalle(t)}
                style={{
                  background: vencida ? "#fff8f8" : "#ffffff",
                  border: `1px solid ${vencida ? "#fecaca" : "#e2e8f0"}`,
                  borderRadius:10, padding:"12px 16px",
                  display:"flex", alignItems:"center", gap:14, cursor:"pointer",
                  transition:"border-color 150ms, box-shadow 150ms",
                }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=vencida?"#fca5a5":"#93c5fd"; e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.06)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=vencida?"#fecaca":"#e2e8f0"; e.currentTarget.style.boxShadow="none";}}
              >
                <span style={{ fontSize:10, fontWeight:700, color:"#94a3b8", flexShrink:0, width:36, fontFamily:"DM Mono, monospace" }}>{numStr(t.numero)}</span>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:4 }}>
                    <span style={{ fontSize:9.5, padding:"2px 7px", borderRadius:999, fontWeight:500, background:tipoBadge.bg, color:tipoBadge.color }}>{tipo.label}</span>
                    <span style={{ fontSize:13, fontWeight:500, color: t.estado==="completada" ? "#94a3b8" : "#1e293b", textDecoration: t.estado==="completada" ? "line-through" : "none" }}>
                      {t.titulo}
                    </span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    <span style={{ fontSize:9.5, padding:"1px 7px", borderRadius:999, fontWeight:600, background:prioBadge.bg, color:prioBadge.color }}>{prio.label}</span>
                    <span style={{ fontSize:9.5, padding:"1px 7px", borderRadius:999, background:estadoBadge.bg, color:estadoBadge.color }}>{estadoObj.label}</span>
                    {t.categoria && <span style={{ fontSize:9.5, padding:"1px 7px", borderRadius:999, background:"#f1f5f9", color:"#64748b" }}>{t.categoria}</span>}
                    {t.asignado_a && <span style={{ fontSize:11, color:"#94a3b8" }}>→ {t.asignado_a}</span>}
                    {t.fecha_vencimiento && (
                      <span style={{ fontSize:11, color: vencida?"#dc2626":dias<=2?"#d97706":"#94a3b8", fontWeight:(vencida||dias<=2)?600:400, fontFamily:"DM Mono, monospace" }}>
                        📅 {fmtFecha(t.fecha_vencimiento)}
                        {vencida && ` (hace ${Math.abs(dias)}d)`}
                        {!vencida && dias === 0 && " (hoy)"}
                        {!vencida && dias === 1 && " (mañana)"}
                      </span>
                    )}
                  </div>
                </div>

                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── Página principal ──────────────────────────────────────────────────
export default function TareasPage() {
  const [vista,   setVista]   = useState("kanban");
  const [tickets, setTickets] = useState([]);
  const [modal,   setModal]   = useState(null);   // null | "nuevo" | ticket
  const [detalle, setDetalle] = useState(null);   // ticket | null
  const [msg,     setMsg]     = useState("");

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const data = await api.get("/tareas/");
      setTickets(data || []);
    } catch { setMsg("Error al cargar tickets."); }
  };

  const guardar = async (id, form) => {
    try {
      if (id) await api.put(`/tareas/${id}`, form);
      else    await api.post("/tareas/", form);
      cargar();
      return true;
    } catch { setMsg("Error al guardar."); return false; }
  };

  const eliminar = async (id) => {
    try { await api.delete(`/tareas/${id}`); cargar(); }
    catch { setMsg("Error al eliminar."); }
  };

  const moverEstado = async (ticketId, nuevoEstado) => {
    try {
      await api.put(`/tareas/${ticketId}`, { estado: nuevoEstado });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, estado: nuevoEstado } : t));
      if (detalle?.id === ticketId) setDetalle(prev => ({ ...prev, estado: nuevoEstado }));
    } catch { setMsg("Error al actualizar estado."); }
  };

  // Stats
  const abiertos   = tickets.filter(t => t.estado === "pendiente").length;
  const enProgreso = tickets.filter(t => t.estado === "en_progreso").length;
  const resueltos  = tickets.filter(t => t.estado === "completada").length;

  // Ticket en el panel usa la versión más reciente del array
  const ticketDetalle = detalle ? tickets.find(t => t.id === detalle.id) || detalle : null;

  return (
    <div className="space-y-5">
      {/* Modal crear/editar */}
      {modal !== null && (
        <ModalTicket
          ticket={modal === "nuevo" ? null : modal}
          onClose={() => setModal(null)}
          onSave={guardar}
        />
      )}

      {/* Panel de detalle */}
      {ticketDetalle && (
        <PanelDetalle
          ticket={ticketDetalle}
          onClose={() => setDetalle(null)}
          onEdit={t => { setDetalle(null); setModal(t); }}
          onDelete={id => { eliminar(id); setDetalle(null); }}
          onMover={moverEstado}
        />
      )}

      {msg && (
        <div style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:10, padding:"10px 16px", fontSize:13 }}>
          {msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#0f172a" }}>Tickets</h1>
          <div style={{ display:"flex", alignItems:"center", gap:16, marginTop:4 }}>
            <span style={{ fontSize:12, color:"#64748b" }}>
              <span style={{ fontWeight:700, color:"#1e293b" }}>{abiertos}</span> pendientes
            </span>
            <span style={{ fontSize:12, color:"#64748b" }}>
              <span style={{ fontWeight:700, color:"#2563eb" }}>{enProgreso}</span> en progreso
            </span>
            <span style={{ fontSize:12, color:"#64748b" }}>
              <span style={{ fontWeight:700, color:"#16a34a" }}>{resueltos}</span> resueltos
            </span>
          </div>
        </div>
        <button onClick={() => setModal("nuevo")} style={{
          display:"flex", alignItems:"center", gap:7,
          background:"#2563eb", color:"#ffffff", border:"none",
          borderRadius:9, padding:"9px 18px", fontSize:13, fontWeight:600,
          cursor:"pointer", transition:"background 150ms",
        }}
          onMouseEnter={e=>e.currentTarget.style.background="#1d4ed8"}
          onMouseLeave={e=>e.currentTarget.style.background="#2563eb"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo ticket
        </button>
      </div>

      {/* Tabs de vista */}
      <div style={{ display:"flex", gap:3, background:"#f1f5f9", borderRadius:10, padding:4, width:"fit-content" }}>
        <button onClick={() => setVista("kanban")} style={{
          display:"flex", alignItems:"center", gap:6,
          padding:"7px 16px", borderRadius:7, border:"none", fontSize:12.5, fontWeight:500,
          background: vista==="kanban" ? "#ffffff" : "transparent",
          color: vista==="kanban" ? "#1e293b" : "#64748b",
          boxShadow: vista==="kanban" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          cursor:"pointer", transition:"all 120ms",
        }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          Kanban
        </button>
        <button onClick={() => setVista("lista")} style={{
          display:"flex", alignItems:"center", gap:6,
          padding:"7px 16px", borderRadius:7, border:"none", fontSize:12.5, fontWeight:500,
          background: vista==="lista" ? "#ffffff" : "transparent",
          color: vista==="lista" ? "#1e293b" : "#64748b",
          boxShadow: vista==="lista" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          cursor:"pointer", transition:"all 120ms",
        }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
          </svg>
          Lista
        </button>
      </div>

      {/* Contenido */}
      {vista === "kanban" ? (
        <VistaKanban
          tickets={tickets}
          onDetalle={t => setDetalle(t)}
          onMover={moverEstado}
        />
      ) : (
        <VistaLista
          tickets={tickets}
          onDetalle={t => setDetalle(t)}
        />
      )}
    </div>
  );
}
