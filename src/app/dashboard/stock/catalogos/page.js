"use client";
import CatalogosStock from "@/components/config/CatalogosStock";

export default function Pagina() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#0f172a" }}>Catálogos de stock</h1>
        <p style={{ margin:"4px 0 0", fontSize:13, color:"#64748b" }}>Ubicaciones, productos y el mapeo de códigos de La Serenísima.</p>
      </div>
      <CatalogosStock />
    </div>
  );
}
