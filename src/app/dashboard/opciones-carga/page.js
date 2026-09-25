"use client";
import OpcionesCarga from "@/components/config/OpcionesCarga";

export default function Pagina() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#0f172a" }}>Opciones de carga</h1>
        <p style={{ margin:"4px 0 0", fontSize:13, color:"#64748b" }}>Tipos de servicio, dispositivos y estados que se ofrecen en la carga del día.</p>
      </div>
      <OpcionesCarga />
    </div>
  );
}
