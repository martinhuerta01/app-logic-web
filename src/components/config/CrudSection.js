"use client";
import { useState } from "react";

// Tabla genérica con alta, edición y baja, compartida por las pantallas de catálogos.
export const IconChevron = ({ open }) => (
  <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export function CrudSection({ titulo, subtitulo, items, columnas, onAdd, onDelete, onEdit, FormComponent, EditFormComponent }) {
  const [abierto,   setAbierto]   = useState(false);
  const [adding,    setAdding]    = useState(false);
  const [editingId, setEditingId] = useState(null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* ── Header clickeable ── */}
      <button type="button"
        onClick={() => { setAbierto(v => !v); if (!abierto) { setAdding(false); setEditingId(null); } }}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition">
        <div className="text-left">
          <h2 className="text-base font-semibold text-slate-700">{titulo}</h2>
          {subtitulo && <p className="text-xs text-slate-400 mt-0.5">{subtitulo}</p>}
          {!abierto && items.length > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">{items.length} registro{items.length !== 1 ? "s" : ""}</p>
          )}
        </div>
        <IconChevron open={abierto} />
      </button>

      {/* ── Contenido colapsable ── */}
      {abierto && (
        <div className="border-t border-slate-100 p-5 space-y-3">
          <div className="flex justify-end">
            <button onClick={() => { setAdding(!adding); setEditingId(null); }}
              className="text-sm text-blue-600 hover:underline">
              {adding ? "Cancelar" : "+ Agregar"}
            </button>
          </div>

          {adding && <FormComponent onDone={() => { setAdding(false); onAdd(); }} />}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs">
                {columnas.map(c => <th key={c.key} className="text-left py-2 px-2">{c.label}</th>)}
                <th className="text-left py-2 px-2 w-32">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={columnas.length + 1} className="py-3 text-slate-400 text-xs px-2">Sin registros</td></tr>
              ) : items.map(item => (
                editingId === item.id ? (
                  <tr key={item.id} className="border-b border-slate-100 bg-blue-50">
                    <td colSpan={columnas.length + 1} className="py-2 px-2">
                      {EditFormComponent && (
                        <EditFormComponent
                          item={item}
                          onDone={() => { setEditingId(null); onEdit(); }}
                          onCancel={() => setEditingId(null)}
                        />
                      )}
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className="border-b border-slate-100">
                    {columnas.map(c => (
                      <td key={c.key} className="py-2 px-2 text-xs">{c.render ? c.render(item) : (item[c.key] || "—")}</td>
                    ))}
                    <td className="py-2 px-2 space-x-2">
                      {EditFormComponent && (
                        <button onClick={() => { setEditingId(item.id); setAdding(false); }}
                          className="text-blue-500 hover:underline text-xs">Editar</button>
                      )}
                      <button onClick={() => onDelete(item.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── EQUIPOS ──────────────────────────────────────────────────────
