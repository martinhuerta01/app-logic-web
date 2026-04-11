"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const MODULOS_BASE = [
  {
    nombre: "Servicios",
    icon: "📋",
    subs: [
      { href: "/dashboard/carga-dia", label: "Carga del día" },
      { href: "/dashboard/vista-dia", label: "Vista del día" },
      { href: "/dashboard/historial", label: "Historial" },
    ],
  },
  {
    nombre: "Personal",
    icon: "👷",
    subs: [
      { href: "/dashboard/personal/horario-tecnico", label: "Horario Técnico" },
    ],
  },
  {
    nombre: "Contactos",
    icon: "📒",
    subs: [
      { href: "/dashboard/contactos/clientes", label: "Clientes" },
      { href: "/dashboard/contactos/proveedores", label: "Proveedores" },
      { href: "/dashboard/contactos/tecnicos-talleres", label: "Técnicos / Talleres" },
    ],
  },
  {
    nombre: "Estadísticas",
    icon: "📊",
    subs: [
      { href: "/dashboard/estadisticas?tab=horas", label: "Horas trabajadas" },
      { href: "/dashboard/estadisticas?tab=responsable", label: "Servicios por Responsable" },
      { href: "/dashboard/estadisticas?tab=clientes", label: "Servicios por Cliente" },
      { href: "/dashboard/estadisticas?tab=cruzado", label: "Reporte cruzado" },
    ],
  },
  {
    nombre: "Stock",
    icon: "📦",
    isDynamic: true,
  },
  {
    nombre: "Configuración",
    icon: "⚙️",
    subs: [
      { href: "/dashboard/configuracion", label: "Equipos, Ubicaciones, Productos" },
    ],
  },
  {
    nombre: "Exportar / Importar",
    icon: "📥",
    subs: [
      { href: "/dashboard/exportar-importar", label: "Exportar / Importar" },
    ],
  },
];

function buildStockGrupos(ubicaciones) {
  const cds = ubicaciones.filter((u) => u.tipo === "cd");
  const generales = ubicaciones.filter(
    (u) => u.tipo === "camioneta" || u.tipo === "tecnico"
  );

  return [
    {
      nombre: "Oficina",
      subs: [
        { href: "/dashboard/stock/oficina?tab=actual", label: "Actual" },
        { href: "/dashboard/stock/oficina?tab=entradas", label: "Entradas" },
        { href: "/dashboard/stock/oficina?tab=salidas", label: "Salidas" },
      ],
    },
    {
      nombre: "La Serenísima",
      subs: cds.map((u) => ({
        href: `/dashboard/stock/serenisima?cd=${encodeURIComponent(u.nombre)}`,
        label: u.nombre,
      })),
    },
    {
      nombre: "General",
      subs: generales.map((u) => ({
        href: `/dashboard/stock/general?ub=${encodeURIComponent(u.nombre)}`,
        label: u.nombre,
      })),
    },
  ];
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [stockGrupos, setStockGrupos] = useState([
    { nombre: "Oficina", subs: [
      { href: "/dashboard/stock/oficina?tab=actual", label: "Actual" },
      { href: "/dashboard/stock/oficina?tab=entradas", label: "Entradas" },
      { href: "/dashboard/stock/oficina?tab=salidas", label: "Salidas" },
    ]},
    { nombre: "La Serenísima", subs: [] },
    { nombre: "General", subs: [] },
  ]);

  useEffect(() => {
    api.get("/stock/ubicaciones/")
      .then((ubics) => setStockGrupos(buildStockGrupos(ubics)))
      .catch(() => {});
  }, []);

  const MODULOS = MODULOS_BASE.map((mod) =>
    mod.isDynamic ? { ...mod, grupos: stockGrupos } : mod
  );

  const [openModulo, setOpenModulo] = useState(() => {
    if (pathname.startsWith("/dashboard/stock")) return "Stock";
    for (const mod of MODULOS_BASE) {
      if (mod.subs?.some((s) => pathname.startsWith(s.href.split("?")[0]))) {
        return mod.nombre;
      }
    }
    return "Servicios";
  });

  const [openGrupo, setOpenGrupo] = useState(() => {
    if (pathname.includes("/stock/oficina")) return "Oficina";
    if (pathname.includes("/stock/serenisima")) return "La Serenísima";
    if (pathname.includes("/stock/general")) return "General";
    return "";
  });

  return (
    <aside className="w-60 min-h-screen bg-slate-800 text-slate-300 flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">App Logic</h1>
        <p className="text-xs text-slate-400 mt-0.5">Bienvenido, {user}</p>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {MODULOS.map((mod) => (
          <div key={mod.nombre}>
            <button
              onClick={() => setOpenModulo(openModulo === mod.nombre ? "" : mod.nombre)}
              className="w-full flex items-center gap-2.5 px-5 py-2.5 text-sm hover:bg-slate-700 transition text-left"
            >
              <span>{mod.icon}</span>
              <span className="flex-1 font-medium">{mod.nombre}</span>
              <span className="text-xs text-slate-500">{openModulo === mod.nombre ? "▾" : "▸"}</span>
            </button>

            {openModulo === mod.nombre && mod.subs && (
              <div className="ml-9 border-l border-slate-600">
                {mod.subs.map((sub) => {
                  const isActive = pathname === sub.href.split("?")[0];
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`block px-4 py-2 text-sm transition ${
                        isActive
                          ? "text-blue-400 bg-slate-700/50 font-medium"
                          : "hover:text-white hover:bg-slate-700/30"
                      }`}
                    >
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {openModulo === mod.nombre && mod.grupos && (
              <div className="ml-9 border-l border-slate-600">
                {mod.grupos.map((grupo) => (
                  <div key={grupo.nombre}>
                    <button
                      onClick={() =>
                        setOpenGrupo(openGrupo === grupo.nombre ? "" : grupo.nombre)
                      }
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-700/30 transition text-left text-slate-400 font-medium"
                    >
                      <span className="flex-1">{grupo.nombre}</span>
                      <span className="text-xs text-slate-500">
                        {openGrupo === grupo.nombre ? "▾" : "▸"}
                      </span>
                    </button>
                    {openGrupo === grupo.nombre && (
                      <div className="ml-4 border-l border-slate-700">
                        {grupo.subs.length === 0 ? (
                          <span className="block px-4 py-1.5 text-xs text-slate-600 italic">
                            Sin ubicaciones
                          </span>
                        ) : (
                          grupo.subs.map((sub) => {
                            const isActive = pathname === sub.href.split("?")[0];
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                className={`block px-4 py-1.5 text-xs transition ${
                                  isActive
                                    ? "text-blue-400 bg-slate-700/50 font-medium"
                                    : "hover:text-white hover:bg-slate-700/30"
                                }`}
                              >
                                {sub.label}
                              </Link>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-slate-700">
        <button
          onClick={logout}
          className="w-full text-sm text-slate-400 hover:text-red-400 transition text-left"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
