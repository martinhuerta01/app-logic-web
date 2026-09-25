"use client";
import Equipos from "@/components/config/Equipos";

export default function Pagina() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#0f172a" }}>Equipos</h1>
        <p style={{ margin:"4px 0 0", fontSize:13, color:"#64748b" }}>Vehículos y equipos de trabajo que usan Servicios y Personal.</p>
      </div>
      <Equipos />
    </div>
  );
}
