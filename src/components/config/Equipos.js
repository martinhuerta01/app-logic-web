"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { CrudSection } from "./CrudSection";

function FormEquipo({ onDone }) {
  const [nombre, setNombre] = useState("");
  const [patente, setPatente] = useState("");

  const guardar = async (e) => {
    e.preventDefault();
    await api.post("/equipos/", { nombre, patente });
    onDone();
  };

  return (
    <form onSubmit={guardar} className="flex gap-2 items-end flex-wrap bg-slate-50 p-3 rounded-lg">
      <div>
        <label className="block text-xs text-slate-500 mb-1">Nombre</label>
        <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Equipo 3" className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" required />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Patente</label>
        <input type="text" value={patente} onChange={e => setPatente(e.target.value.toUpperCase())}
          placeholder="Ej: AB123CD" className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
      </div>
      <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">Guardar</button>
    </form>
  );
}

function EditFormEquipo({ item, onDone, onCancel }) {
  const [nombre, setNombre] = useState(item.nombre || "");
  const [patente, setPatente] = useState(item.patente || "");

  const guardar = async (e) => {
    e.preventDefault();
    await api.put(`/equipos/${item.id}`, { nombre, patente });
    onDone();
  };

  return (
    <form onSubmit={guardar} className="flex gap-2 items-end flex-wrap">
      <div>
        <label className="block text-xs text-slate-500 mb-1">Nombre</label>
        <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" required />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Patente</label>
        <input type="text" value={patente} onChange={e => setPatente(e.target.value.toUpperCase())}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
      </div>
      <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">Guardar</button>
      <button type="button" onClick={onCancel} className="text-slate-500 hover:underline text-sm">Cancelar</button>
    </form>
  );
}

// ─── UBICACIONES DE STOCK ─────────────────────────────────────────

export default function Equipos() {
  const [equipos, setEquipos] = useState([]);
  const [errorCarga, setErrorCarga] = useState("");

  const cargarEquipos = () => api.get("/equipos/").then(setEquipos).catch(() => setErrorCarga("No se pudieron cargar los equipos."));
  useEffect(() => { cargarEquipos(); }, []);

  const eliminarEquipo = async (id) => {
    if (!confirm("¿Eliminar?")) return;
    await api.put(`/equipos/${id}`, { activo: false });
    cargarEquipos();
  };

  return (
    <>
      {errorCarga && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:10, padding:"10px 16px", fontSize:13 }}>{errorCarga}</div>}
      <CrudSection
        titulo="Equipos"
        items={equipos}
        columnas={[
          { key: "nombre", label: "Nombre" },
          { key: "patente", label: "Patente" },
        ]}
        onAdd={cargarEquipos}
        onDelete={eliminarEquipo}
        onEdit={cargarEquipos}
        FormComponent={FormEquipo}
        EditFormComponent={EditFormEquipo}
      />
    </>
  );
}
