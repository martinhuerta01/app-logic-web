"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

// ─── SVG Icons (Tabler-style, 1.5 stroke) ───────────────────────────────────
function Ico({ children, size = 15 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

const ICONS = {
  servicios: (
    <Ico>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="2"/>
      <path d="M9 12h6M9 16h4"/>
    </Ico>
  ),
  personal: (
    <Ico>
      <circle cx="8" cy="7" r="4"/>
      <path d="M2 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      <path d="M17 11a3 3 0 1 0 0-6M22 21v-2a4 4 0 0 0-3-3.87"/>
    </Ico>
  ),
  contactos: (
    <Ico>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <circle cx="9" cy="10" r="3"/>
      <path d="M5 20v-.5a4 4 0 0 1 8 0V20M15 8h4M15 12h4"/>
    </Ico>
  ),
  estadisticas: (
    <Ico>
      <rect x="3" y="12" width="4" height="9" rx="1"/>
      <rect x="10" y="7" width="4" height="14" rx="1"/>
      <rect x="17" y="3" width="4" height="18" rx="1"/>
    </Ico>
  ),
  stock: (
    <Ico>
      <path d="M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3z"/>
      <path d="M12 12l9-4.5M12 12v9M12 12L3 7.5"/>
    </Ico>
  ),
  tareas: (
    <Ico>
      <rect x="5" y="3" width="14" height="18" rx="2"/>
      <path d="M9 7h6M9 11h6M9 15h4"/>
      <circle cx="16.5" cy="15.5" r="2.5" fill="currentColor" stroke="none" opacity="0"/>
    </Ico>
  ),
  recibos: (
    <Ico>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="13" y2="17"/>
    </Ico>
  ),
  configuracion: (
    <Ico>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </Ico>
  ),
  exportar: (
    <Ico>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </Ico>
  ),
  admin: (
    <Ico>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </Ico>
  ),
};

const CHEVRON = (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const LOGOUT_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

// ─── Data ────────────────────────────────────────────────────────────────────
const MODULOS_BASE = [
  {
    key: "servicios", nombre: "Servicios",
    subs: [
      { key: "carga-dia",  href: "/dashboard/carga-dia",  label: "Carga del día" },
      { key: "vista-dia",  href: "/dashboard/vista-dia",  label: "Vista del día" },
      { key: "historial",  href: "/dashboard/historial",  label: "Historial" },
    ],
  },
  {
    key: "personal", nombre: "Personal",
    subs: [
      { key: "horario-tecnico",     href: "/dashboard/personal/horario-tecnico",     label: "Horario Técnico" },
      { key: "historial-camioneta", href: "/dashboard/personal/historial-camioneta", label: "Historial" },
    ],
  },
  {
    key: "contactos", nombre: "Contactos",
    subs: [
      { key: "clientes",          href: "/dashboard/contactos/clientes",          label: "Clientes" },
      { key: "proveedores",       href: "/dashboard/contactos/proveedores",       label: "Proveedores" },
      { key: "tecnicos-talleres", href: "/dashboard/contactos/tecnicos-talleres", label: "Técnicos / Talleres" },
    ],
  },
  {
    key: "estadisticas", nombre: "Estadísticas",
    subs: [
      { key: "dashboard",   href: "/dashboard/estadisticas?tab=dashboard",   label: "Dashboard" },
      { key: "horas",       href: "/dashboard/estadisticas?tab=horas",       label: "Horas trabajadas" },
      { key: "responsable", href: "/dashboard/estadisticas?tab=responsable", label: "Por Responsable" },
      { key: "clientes",    href: "/dashboard/estadisticas?tab=clientes",    label: "Por Cliente" },
      { key: "cruzado",     href: "/dashboard/estadisticas?tab=cruzado",     label: "Reporte cruzado" },
      { key: "stock-kpi",   href: "/dashboard/estadisticas?tab=stock",       label: "Stock KPI" },
      { key: "patentes",    href: "/dashboard/estadisticas?tab=patentes",    label: "Revisiones frecuentes" },
    ],
  },
  {
    key: "stock", nombre: "Stock",
    isDynamic: true,
    subs: [
      { href: "/dashboard/stock/overview", label: "Dashboard" },
    ],
  },
  {
    key: "tareas", nombre: "Tickets",
    subs: [
      { key: "tickets",   href: "/dashboard/tareas",           label: "Tickets" },
      { key: "historial", href: "/dashboard/tareas/historial", label: "Historial" },
    ],
  },
  {
    key: "recibos", nombre: "Recibos",
    subs: [
      { key: "recibos", href: "/dashboard/recibos", label: "Recibos de Sueldo" },
    ],
  },
  {
    key: "configuracion", nombre: "Configuración",
    subs: [
      { key: "configuracion", href: "/dashboard/configuracion", label: "Equipos, Ubicaciones, Productos" },
    ],
  },
  {
    key: "exportar", nombre: "Exportar",
    subs: [
      { key: "exportar", href: "/dashboard/exportar-importar", label: "Exportar" },
    ],
  },
];

const MODULO_ADMIN = {
  key: "admin", nombre: "Administración",
  subs: [{ href: "/dashboard/admin/usuarios", label: "Usuarios" }],
};

function buildStockGrupos(ubicaciones) {
  const cds      = ubicaciones.filter(u => u.tipo === "cd");
  const generales = ubicaciones.filter(u => u.tipo === "general");
  return [
    {
      nombre: "Oficina",
      subs: [
        { href: "/dashboard/stock/oficina?tab=actual",   label: "Actual" },
        { href: "/dashboard/stock/oficina?tab=entradas", label: "Entradas" },
        { href: "/dashboard/stock/oficina?tab=salidas",  label: "Salidas" },
        { href: "/dashboard/stock/oficina?tab=busqueda", label: "Búsqueda" },
      ],
    },
    {
      nombre: "La Serenísima",
      subs: cds.map(u => ({ href: `/dashboard/stock/serenisima?cd=${encodeURIComponent(u.nombre)}`, label: u.nombre })),
    },
    {
      nombre: "General",
      subs: generales.map(u => ({ href: `/dashboard/stock/general?ub=${encodeURIComponent(u.nombre)}`, label: u.nombre })),
    },
  ];
}

// ─── Sub-link atom ────────────────────────────────────────────────────────────
function SubLink({ href, label, pathname }) {
  const base = href.split("?")[0];
  const isActive = pathname === base || (base !== "/dashboard" && pathname.startsWith(base));
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        paddingLeft: 50,
        paddingRight: 10,
        paddingTop: 5,
        paddingBottom: 5,
        borderRadius: 6,
        fontSize: 12.5,
        color: isActive ? "#60a5fa" : "rgba(255,255,255,0.32)",
        fontWeight: isActive ? 500 : 400,
        background: isActive ? "rgba(37,99,235,0.09)" : "transparent",
        textDecoration: "none",
        transition: "color 120ms, background 120ms",
      }}
    >
      <span style={{
        display: "inline-block",
        width: 4, height: 4, borderRadius: "50%", flexShrink: 0,
        background: isActive ? "#2563eb" : "rgba(255,255,255,0.14)",
        boxShadow: isActive ? "0 0 6px rgba(37,99,235,0.65)" : "none",
        transition: "background 120ms, box-shadow 120ms",
      }}/>
      {label}
    </Link>
  );
}

// ─── Module button + accordion ────────────────────────────────────────────────
function ModuleItem({ mod, isOpen, onToggle, pathname, openGrupo, setOpenGrupo }) {
  const icon = ICONS[mod.key] || ICONS.admin;

  return (
    <div>
      {/* Module trigger */}
      <button
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "calc(100% - 16px)",
          margin: "0 8px",
          padding: "6px 8px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          background: isOpen ? "var(--sidebar-item-active)" : "transparent",
          transition: "background 150ms",
          textAlign: "left",
        }}
        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = "var(--sidebar-item-hover)"; }}
        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}
      >
        {/* Icon container */}
        <span style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28, height: 28,
          borderRadius: 7,
          flexShrink: 0,
          background: isOpen ? "var(--sidebar-icon-active)" : "var(--sidebar-icon-bg)",
          color: isOpen ? "#60a5fa" : "rgba(255,255,255,0.32)",
          transition: "background 150ms, color 150ms",
        }}>
          {icon}
        </span>

        {/* Label */}
        <span style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 500,
          color: isOpen ? "#e2e8f0" : "rgba(255,255,255,0.30)",
          transition: "color 150ms",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {mod.nombre}
        </span>

        {/* Chevron */}
        <span style={{
          color: "rgba(255,255,255,0.18)",
          transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 250ms cubic-bezier(0.4,0,0.2,1)",
          display: "flex",
          flexShrink: 0,
        }}>
          {CHEVRON}
        </span>
      </button>

      {/* Sub-items panel */}
      <div className={`sub-panel ${isOpen ? "open" : "closed"}`} style={{ marginTop: isOpen ? 2 : 0 }}>
        {/* Regular subs */}
        {mod.subs && (
          <div style={{ paddingBottom: 4, position: "relative" }}>
            {/* Vertical guide line */}
            <div style={{
              position: "absolute",
              left: 40,
              top: 2,
              bottom: 2,
              width: 1,
              background: "var(--sidebar-sub-line)",
            }}/>
            {mod.subs.map(sub => (
              <SubLink key={sub.href} href={sub.href} label={sub.label} pathname={pathname} />
            ))}
          </div>
        )}

        {/* Dynamic stock grupos */}
        {mod.grupos && (
          <div style={{ paddingBottom: 4 }}>
            {mod.grupos.map(grupo => (
              <div key={grupo.nombre}>
                <button
                  onClick={() => setOpenGrupo(openGrupo === grupo.nombre ? "" : grupo.nombre)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    width: "100%",
                    paddingLeft: 50, paddingRight: 10,
                    paddingTop: 5, paddingBottom: 5,
                    border: "none", background: "transparent", cursor: "pointer",
                    fontSize: 12.5, fontWeight: 500,
                    color: "rgba(255,255,255,0.40)",
                    textAlign: "left",
                    transition: "color 120ms",
                  }}
                >
                  <span style={{ flex: 1 }}>{grupo.nombre}</span>
                  <span style={{
                    color: "rgba(255,255,255,0.15)",
                    transform: openGrupo === grupo.nombre ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 200ms ease",
                    display: "flex",
                  }}>{CHEVRON}</span>
                </button>

                <div className={`sub-panel ${openGrupo === grupo.nombre ? "open" : "closed"}`}>
                  <div style={{ position: "relative" }}>
                    <div style={{
                      position: "absolute", left: 58, top: 2, bottom: 2,
                      width: 1, background: "var(--sidebar-sub-line)",
                    }}/>
                    {grupo.subs.length === 0 ? (
                      <span style={{
                        display: "block", paddingLeft: 66, paddingTop: 4, paddingBottom: 4,
                        fontSize: 11.5, color: "rgba(255,255,255,0.15)", fontStyle: "italic",
                      }}>Sin ubicaciones</span>
                    ) : (
                      grupo.subs.map(sub => (
                        <SubLink key={sub.href} href={sub.href} label={sub.label} pathname={pathname}/>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const { user, rol, modulos, submodulos, logout } = useAuth();

  const [stockGrupos, setStockGrupos] = useState([
    { nombre: "Oficina", subs: [
      { href: "/dashboard/stock/oficina?tab=actual",   label: "Actual" },
      { href: "/dashboard/stock/oficina?tab=entradas", label: "Entradas" },
      { href: "/dashboard/stock/oficina?tab=salidas",  label: "Salidas" },
    ]},
    { nombre: "La Serenísima", subs: [] },
    { nombre: "General",       subs: [] },
  ]);

  useEffect(() => {
    api.get("/stock/ubicaciones/")
      .then(ubics => setStockGrupos(buildStockGrupos(ubics)))
      .catch(err  => console.warn("No se pudieron cargar ubicaciones de stock:", err));
  }, []);

  // Filtrar módulos según permisos
  const modulosVisibles = MODULOS_BASE
    .map(mod => mod.isDynamic ? { ...mod, grupos: stockGrupos } : mod)
    .filter(mod => !modulos || modulos.includes(mod.key))
    .map(mod => {
      if (!submodulos || !submodulos[mod.key] || !mod.subs) return mod;
      const permitidos = submodulos[mod.key];
      return { ...mod, subs: mod.subs.filter(s => permitidos.includes(s.key)) };
    });

  const todosModulos = rol === "admin"
    ? [...modulosVisibles, MODULO_ADMIN]
    : modulosVisibles;

  const [openModulo, setOpenModulo] = useState(() => {
    if (pathname.startsWith("/dashboard/stock")) return "Stock";
    if (pathname.startsWith("/dashboard/admin")) return "Administración";
    for (const mod of MODULOS_BASE) {
      if (mod.subs?.some(s => pathname.startsWith(s.href.split("?")[0]))) return mod.nombre;
    }
    return "Servicios";
  });

  const [openGrupo, setOpenGrupo] = useState(() => {
    if (pathname.includes("/stock/oficina"))    return "Oficina";
    if (pathname.includes("/stock/serenisima")) return "La Serenísima";
    if (pathname.includes("/stock/general"))    return "General";
    return "";
  });

  // Avatar initials
  const initials = user
    ? user.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "AL";

  return (
    <aside
      className="sidebar-scroll"
      style={{
        width: 240, minHeight: "100vh",
        background: "var(--color-sidebar-bg, #0a0f1a)",
        display: "flex", flexDirection: "column",
        flexShrink: 0,
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* ── Header / Logo ── */}
      <Link
        href="/dashboard"
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "16px 14px 14px",
          borderBottom: "1px solid var(--sidebar-border)",
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        {/* Logo square */}
        <span style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, borderRadius: 9,
          background: "#2563eb",
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </span>

        <div style={{ minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: 13, fontWeight: 600,
            color: "#e2e8f0", lineHeight: 1.2,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            Depto. Operaciones
          </p>
          <p style={{
            margin: 0, fontSize: 10.5, marginTop: 1,
            color: "rgba(255,255,255,0.25)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            App Logic
          </p>
        </div>
      </Link>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, paddingTop: 8, paddingBottom: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {todosModulos.map(mod => (
            <ModuleItem
              key={mod.nombre}
              mod={mod}
              isOpen={openModulo === mod.nombre}
              onToggle={() => setOpenModulo(openModulo === mod.nombre ? "" : mod.nombre)}
              pathname={pathname}
              openGrupo={openGrupo}
              setOpenGrupo={setOpenGrupo}
            />
          ))}
        </div>
      </nav>

      {/* ── Footer / User ── */}
      <div style={{
        padding: "12px 12px 14px",
        borderTop: "1px solid var(--sidebar-border)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {/* Avatar */}
          <span style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: "rgba(37,99,235,0.28)",
            color: "#60a5fa",
            fontSize: 11, fontWeight: 700,
            fontFamily: "var(--font-mono, monospace)",
            letterSpacing: "0.03em",
          }}>
            {initials}
          </span>

          {/* Name + role */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0, fontSize: 12.5, fontWeight: 500,
              color: "#c8d3e0",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {user}
            </p>
            <p style={{
              margin: 0, fontSize: 10, marginTop: 1,
              color: "rgba(255,255,255,0.22)",
              textTransform: "capitalize",
            }}>
              {rol}
            </p>
          </div>

          {/* Logout button */}
          <button
            onClick={logout}
            title="Cerrar sesión"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
              border: "none", background: "transparent", cursor: "pointer",
              color: "rgba(255,255,255,0.18)",
              transition: "color 150ms, background 150ms",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "#f87171";
              e.currentTarget.style.background = "rgba(239,68,68,0.10)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = "rgba(255,255,255,0.18)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            {LOGOUT_ICON}
          </button>
        </div>

        {/* Version */}
        <p style={{
          margin: "8px 0 0",
          textAlign: "right",
          fontSize: 9,
          color: "rgba(255,255,255,0.10)",
          fontFamily: "var(--font-mono, monospace)",
          letterSpacing: "0.05em",
        }}>
          v1.7
        </p>
      </div>
    </aside>
  );
}
