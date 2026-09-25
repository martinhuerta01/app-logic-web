"use client";
import { useState, useEffect } from "react";
import { fetchOpciones, persistOpciones } from "@/lib/opciones";
import { IconChevron } from "./CrudSection";

// ─── OPCIONES DE CARGA ────────────────────────────────────────────

export default function OpcionesCarga() {
  const [abierto,  setAbierto]  = useState(false);
  const [opciones, setOpciones] = useState({ tipos: [], dispositivos: [], estados: [] });
  const [nuevos,   setNuevos]   = useState({ tipos: "", dispositivos: "", estados: "" });
  const [msg,      setMsg]      = useState("");

  useEffect(() => {
    fetchOpciones().then(setOpciones);
  }, []);

  const save = async (nuevas) => {
    await persistOpciones(nuevas);
    setOpciones(nuevas);
    setMsg("✓ Guardado");
    setTimeout(() => setMsg(""), 2000);
  };

  const agregar = (campo) => {
    const val = nuevos[campo].trim().toUpperCase();
    if (!val || opciones[campo].includes(val)) return;
    save({ ...opciones, [campo]: [...opciones[campo], val] });
    setNuevos(prev => ({ ...prev, [campo]: "" }));
  };

  const eliminar = (campo, valor) => {
    if (!confirm(`¿Eliminar "${valor}"?`)) return;
    save({ ...opciones, [campo]: opciones[campo].filter(x => x !== valor) });
  };

  const SECCIONES = [
    { campo: "tipos",        titulo: "Tipos de Servicio",  placeholder: "Ej: MANTENIMIENTO" },
    { campo: "dispositivos", titulo: "Dispositivos",       placeholder: "Ej: RADAR"         },
    { campo: "estados",      titulo: "Estados",            placeholder: "Ej: EN REVISIÓN"   },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <button type="button" onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition">
        <div className="text-left">
          <h2 className="text-base font-semibold text-slate-700">Opciones de Carga de Servicios</h2>
          <p className="text-xs text-slate-400 mt-0.5">Personalizá las opciones disponibles en el formulario de Carga del Día</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-green-600 text-sm font-medium">{msg}</span>}
          <IconChevron open={abierto} />
        </div>
      </button>

      {abierto && (
        <div className="border-t border-slate-100 p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SECCIONES.map(({ campo, titulo, placeholder }) => (
              <div key={campo}>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{titulo}</h3>
                <div className="space-y-1 mb-2">
                  {opciones[campo].length === 0 && (
                    <p className="text-xs text-slate-400 italic px-2">Sin opciones</p>
                  )}
                  {opciones[campo].map(v => (
                    <div key={v} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-3 py-1.5">
                      <span className="text-xs font-medium text-slate-700">{v}</span>
                      <button type="button" onClick={() => eliminar(campo, v)}
                        className="text-red-400 hover:text-red-600 text-xs leading-none ml-2 transition">✕</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input type="text"
                    value={nuevos[campo]}
                    onChange={e => setNuevos(prev => ({ ...prev, [campo]: e.target.value.toUpperCase() }))}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), agregar(campo))}
                    placeholder={placeholder}
                    className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-xs" />
                  <button type="button" onClick={() => agregar(campo)}
                    className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1.5 rounded text-xs font-medium transition">
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
