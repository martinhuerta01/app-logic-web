"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const MODULOS_BASE = [
  {
    key: "servicios",
    nombre: "Servicios",
    icon: "📋",
    subs: [
      { href: "/dashboard/carga-dia",  label: "Carga del día" },
      { href: "/dashboard/vista-dia",  label: "Vista del día" },
      { href: "/dashboard/historial",  label: "Historial" },
    ],
  },
  {
    key: "personal",
    nombre: "Personal",
    icon: "👷",
    subs: [
      { href: "/dashboard/personal/horario-tecnico",    label: "Horario Técnico" },
      { href: "/dashboard/personal/historial-camioneta", label: "Historial" },
    ],
  },
  {
    key: "contactos",
    nombre: "Contactos",
    icon: "📒",
    subs: [
      { href: "/dashboard/contactos/clientes",          label: "Clientes" },
      { href: "/dashboard/contactos/proveedores",       label: "Proveedores" },
      { href: "/dashboard/contactos/tecnicos-talleres", label: "Técnicos / Talleres" },
    ],
  },
  {
    key: "estadisticas",
    nombre: "Estadísticas",
    icon: "📊",
    subs: [
      { href: "/dashboard/estadisticas?tab=horas",       label: "Horas trabajadas" },
      { href: "/dashboard/estadisticas?tab=responsable", label: "Servicios por Responsable" },
      { href: "/dashboard/estadisticas?tab=clientes",    label: "Servicios por Cliente" },
      { href: "/dashboard/estadisticas?tab=cruzado",     label: "Reporte cruzado" },
    ],
  },
  {
    key: "stock",
    nombre: "Stock",
    icon: "📦",
    isDynamic: true,
  },
  {
    key: "configuracion",
    nombre: "Configuración",
    icon: "⚙️",
    subs: [
      { href: "/dashboard/configuracion", label: "Equipos, Ubicaciones, Productos" },
    ],
  },
  {
    key: "exportar",
    nombre: "Exportar / Importar",
    icon: "📥",
    subs: [
      { href: "/dashboard/exportar-importar", label: "Exportar / Importar" },
    ],
  },
];

const MODULO_ADMIN = {
  key: "admin",
  nombre: "Administración",
  icon: "🔐",
  subs: [
    { href: "/dashboard/admin/usuarios", label: "Usuarios" },
  ],
};

function buildStockGrupos(ubicaciones) {
  const cds      = ubicaciones.filter(u => u.tipo === "cd");
  const generales = ubicaciones.filter(u => u.tipo === "camioneta" || u.tipo === "tecnico");
  return [
    {
      nombre: "Oficina",
      subs: [
        { href: "/dashboard/stock/oficina?tab=actual",   label: "Actual"   },
        { href: "/dashboard/stock/oficina?tab=entradas", label: "Entradas" },
        { href: "/dashboard/stock/oficina?tab=salidas",  label: "Salidas"  },
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

export default function Sidebar() {
  const pathname = usePathname();
  const { user, rol, modulos, logout } = useAuth();

  const [stockGrupos, setStockGrupos] = useState([
    { nombre: "Oficina", subs: [
      { href: "/dashboard/stock/oficina?tab=actual",   label: "Actual"   },
      { href: "/dashboard/stock/oficina?tab=entradas", label: "Entradas" },
      { href: "/dashboard/stock/oficina?tab=salidas",  label: "Salidas"  },
    ]},
    { nombre: "La Serenísima", subs: [] },
    { nombre: "General",       subs: [] },
  ]);

  useEffect(() => {
    api.get("/stock/ubicaciones/")
      .then(ubics => setStockGrupos(buildStockGrupos(ubics)))
      .catch(err  => console.warn("No se pudieron cargar las ubicaciones de stock:", err));
  }, []);

  // Filtrar módulos según permisos (null = acceso total)
  const modulosVisibles = MODULOS_BASE
    .map(mod => mod.isDynamic ? { ...mod, grupos: stockGrupos } : mod)
    .filter(mod => !modulos || modulos.includes(mod.key));

  // Admin ve todo + sección Administración
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

  return (
    <aside className="w-60 min-h-screen flex flex-col shrink-0"
      style={{ background: "linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)" }}>

      {/* Logo / título → vuelve al dashboard */}
      <Link href="/dashboard"
        className="block px-5 py-5 border-b border-indigo-700/50 hover:bg-white/10 transition">
        <h1 className="text-base font-bold text-white">Depto. Operaciones</h1>
        <p className="text-xs text-indigo-300 mt-0.5">Bienvenido, {user}</p>
      </Link>

      {/* Navegación */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {todosModulos.map(mod => (
          <div key={mod.nombre}>
            <button
              onClick={() => setOpenModulo(openModulo === mod.nombre ? "" : mod.nombre)}
              className={`w-full flex items-center gap-2.5 px-5 py-2.5 text-sm transition text-left
                ${openModulo === mod.nombre
                  ? "bg-white/10 text-white"
                  : "text-indigo-200 hover:bg-white/8 hover:text-white"
                }`}
            >
              <span>{mod.icon}</span>
              <span className="flex-1 font-medium">{mod.nombre}</span>
              <span className="text-xs text-indigo-400">{openModulo === mod.nombre ? "▾" : "▸"}</span>
            </button>

            {openModulo === mod.nombre && mod.subs && (
              <div className="ml-9 border-l border-indigo-600/50">
                {mod.subs.map(sub => {
                  const isActive = pathname === sub.href.split("?")[0];
                  return (
                    <Link key={sub.href} href={sub.href}
                      className={`block px-4 py-2 text-sm transition
                        ${isActive
                          ? "text-white bg-white/15 font-medium border-l-2 border-indigo-300 -ml-px"
                          : "text-indigo-300 hover:text-white hover:bg-white/8"
                        }`}>
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {openModulo === mod.nombre && mod.grupos && (
              <div className="ml-9 border-l border-indigo-600/50">
                {mod.grupos.map(grupo => (
                  <div key={grupo.nombre}>
                    <button
                      onClick={() => setOpenGrupo(openGrupo === grupo.nombre ? "" : grupo.nombre)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm transition text-left text-indigo-300 hover:text-white hover:bg-white/8 font-medium">
                      <span className="flex-1">{grupo.nombre}</span>
                      <span className="text-xs text-indigo-500">{openGrupo === grupo.nombre ? "▾" : "▸"}</span>
                    </button>
                    {openGrupo === grupo.nombre && (
                      <div className="ml-4 border-l border-indigo-700/50">
                        {grupo.subs.length === 0 ? (
                          <span className="block px-4 py-1.5 text-xs text-indigo-600 italic">Sin ubicaciones</span>
                        ) : grupo.subs.map(sub => {
                          const isActive = pathname === sub.href.split("?")[0];
                          return (
                            <Link key={sub.href} href={sub.href}
                              className={`block px-4 py-1.5 text-xs transition
                                ${isActive
                                  ? "text-white bg-white/15 font-medium border-l-2 border-indigo-300 -ml-px"
                                  : "text-indigo-300 hover:text-white hover:bg-white/8"
                                }`}>
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Cerrar sesión */}
      <div className="px-5 py-4 border-t border-indigo-700/50">
        <button onClick={logout}
          className="w-full text-sm text-indigo-300 hover:text-red-400 transition text-left">
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
