"use client";
import { useEffect, useRef } from "react";

/**
 * Modal compartido — App Logic Design System
 *
 * Props:
 *   open       {boolean}   — controla visibilidad
 *   onClose    {function}  — callback al cerrar (Esc + clic en overlay)
 *   title      {string}    — título del header
 *   icon       {ReactNode} — ícono SVG al lado del título (opcional)
 *   width      {string}    — ancho CSS del modal (default "520px")
 *   footer     {ReactNode} — contenido del footer (botones, hints)
 *   children   {ReactNode} — body del modal
 */
export default function Modal({ open, onClose, title, icon, width = "520px", footer, children }) {
  const panelRef = useRef(null);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(8,15,30,0.50)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={panelRef}
        style={{
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 14,
          background: "#ffffff",
          boxShadow: "0 32px 80px rgba(0,0,0,0.18)",
          overflow: "hidden",
          animation: "modal-enter 220ms cubic-bezier(0.34,1.56,0.64,1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          background: "linear-gradient(135deg, #1e3a8a, #1d4ed8)",
          padding: "13px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}>
          {icon && (
            <span style={{ color: "rgba(255,255,255,0.85)", display: "flex", flexShrink: 0 }}>
              {icon}
            </span>
          )}
          <h2 style={{
            flex: 1, margin: 0,
            fontSize: 13, fontWeight: 600,
            color: "#ffffff",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {title}
          </h2>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
              border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.80)",
              transition: "background 150ms",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.20)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.10)"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 4px" }}>
          {children}
        </div>

        {/* ── Footer ── */}
        {footer && (
          <div style={{
            padding: "12px 20px",
            background: "#fafbfc",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modal-enter {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/**
 * Botón primario estándar para footer de modales
 */
export function BtnPrimary({ children, onClick, type = "button", disabled = false, loading = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 16px",
        borderRadius: 8, border: "none", cursor: disabled || loading ? "not-allowed" : "pointer",
        background: disabled || loading ? "#93c5fd" : "#2563eb",
        color: "#ffffff",
        fontSize: 12.5, fontWeight: 600,
        transition: "background 150ms",
        opacity: disabled ? 0.7 : 1,
      }}
      onMouseEnter={e => { if (!disabled && !loading) e.currentTarget.style.background = "#1d4ed8"; }}
      onMouseLeave={e => { if (!disabled && !loading) e.currentTarget.style.background = "#2563eb"; }}
    >
      {loading && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ animation: "spin 0.8s linear infinite" }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      )}
      {children}
    </button>
  );
}

/**
 * Botón secundario estándar para footer de modales
 */
export function BtnSecondary({ children, onClick, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px",
        borderRadius: 8, border: "1.5px solid #e2e8f0", cursor: "pointer",
        background: "#f1f5f9",
        color: "#475569",
        fontSize: 12.5, fontWeight: 500,
        transition: "background 150ms, border-color 150ms",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "#e9edf1"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "#f1f5f9"; }}
    >
      {children}
    </button>
  );
}

/**
 * Hint de teclado para footer (izquierda)
 */
export function KeyboardHint({ label = "Esc para cerrar" }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "#cbd5e1" }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2"/>
        <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>
      </svg>
      {label}
    </span>
  );
}

/**
 * Label de campo de formulario (9.5px uppercase)
 */
export function FieldLabel({ children, required }) {
  return (
    <label style={{
      display: "block", marginBottom: 5,
      fontSize: 9.5, fontWeight: 600,
      letterSpacing: "0.07em", textTransform: "uppercase",
      color: "#94a3b8",
    }}>
      {children}
      {required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
    </label>
  );
}

/**
 * Input estándar
 */
export function FieldInput({ style, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "8px 11px",
        borderRadius: 7,
        border: "1.5px solid #e2e8f0",
        background: "#f8fafc",
        fontSize: 13,
        color: "#1e293b",
        outline: "none",
        transition: "border-color 150ms, box-shadow 150ms",
        fontFamily: "inherit",
        ...style,
      }}
      onFocus={e => {
        e.target.style.borderColor = "#2563eb";
        e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)";
        e.target.style.background = "#ffffff";
      }}
      onBlur={e => {
        e.target.style.borderColor = "#e2e8f0";
        e.target.style.boxShadow = "none";
        e.target.style.background = "#f8fafc";
      }}
    />
  );
}

/**
 * Textarea estándar
 */
export function FieldTextarea({ style, ...props }) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%",
        padding: "8px 11px",
        borderRadius: 7,
        border: "1.5px solid #e2e8f0",
        background: "#f8fafc",
        fontSize: 13,
        color: "#1e293b",
        outline: "none",
        resize: "vertical",
        minHeight: 72,
        transition: "border-color 150ms, box-shadow 150ms",
        fontFamily: "inherit",
        lineHeight: 1.5,
        ...style,
      }}
      onFocus={e => {
        e.target.style.borderColor = "#2563eb";
        e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)";
        e.target.style.background = "#ffffff";
      }}
      onBlur={e => {
        e.target.style.borderColor = "#e2e8f0";
        e.target.style.boxShadow = "none";
        e.target.style.background = "#f8fafc";
      }}
    />
  );
}

/**
 * Select estándar
 */
export function FieldSelect({ style, children, ...props }) {
  return (
    <select
      {...props}
      style={{
        width: "100%",
        padding: "8px 11px",
        borderRadius: 7,
        border: "1.5px solid #e2e8f0",
        background: "#f8fafc",
        fontSize: 13,
        color: "#1e293b",
        outline: "none",
        cursor: "pointer",
        transition: "border-color 150ms, box-shadow 150ms",
        fontFamily: "inherit",
        ...style,
      }}
      onFocus={e => {
        e.target.style.borderColor = "#2563eb";
        e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)";
        e.target.style.background = "#ffffff";
      }}
      onBlur={e => {
        e.target.style.borderColor = "#e2e8f0";
        e.target.style.boxShadow = "none";
        e.target.style.background = "#f8fafc";
      }}
    >
      {children}
    </select>
  );
}

/**
 * Chips para opciones cortas (tipo, estado, prioridad)
 */
export function ChipGroup({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(opt => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: "5px 11px",
              borderRadius: 6,
              border: `1.5px solid ${isActive ? "#2563eb" : "#e2e8f0"}`,
              background: isActive ? "#2563eb" : "transparent",
              color: isActive ? "#ffffff" : "#94a3b8",
              fontSize: 12, fontWeight: isActive ? 500 : 400,
              cursor: "pointer",
              transition: "all 150ms",
            }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = "#93c5fd"; e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.background = "#eff6ff"; } }}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "transparent"; } }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
