"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const MODULOS = [
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
    nombre: "Directorio",
    icon: "👥",
    subs: [
      { href: "/dashboard/directorio?tab=personal", label: "Personal" },
      { href: "/dashboard/directorio?tab=clientes", label: "Clientes" },
      { href: "/dashboard/directorio?tab=proveedores", label: "Proveedores" },
    ],
  },
  {
    nombre: "Estadísticas",
    icon: "📊",
    subs: [
      { href: "/dashboard/estadisticas?tab=horas", label: "Horas trabajadas" },
      { href: "/dashboard/estadisticas?tab=clientes", label: "Servicios por cliente" },
      { href: "/dashboard/estadisticas?tab=cruzado", label: "Reporte cruzado" },
    ],
  },
  {
    nombre: "Stock",
    icon: "📦",
    subs: [
      { href: "/dashboard/stock?tab=actual", label: "Stock actual" },
      { href: "/dashboard/stock?tab=entradas", label: "Entradas" },
      { href: "/dashboard/stock?tab=transferencias", label: "Transferencias" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [openModulo, setOpenModulo] = useState("");

  return (
    <aside className="w-60 min-h-screen bg-slate-800 text-slate-300 flex flex-col shrink-0">
      {/* Header */}
      <div className="px-5 py-5 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">App Logic</h1>
        <p className="text-xs text-slate-400 mt-0.5">Bienvenido, {user}</p>
      </div>

      {/* Navigation */}
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
            {openModulo === mod.nombre && (
              <div className="ml-9 border-l border-slate-600">
                {mod.subs.map((sub) => {
                  const isActive = pathname + (typeof window !== "undefined" ? window.location.search : "") === sub.href
                    || pathname === sub.href.split("?")[0];
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
          </div>
        ))}
      </nav>

      {/* Footer */}
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
