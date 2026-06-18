"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";

const MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const TH = { textAlign:"left", padding:"8px 16px", fontSize:9.5, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:"#94a3b8", background:"#f8fafc", borderBottom:"1px solid #f1f5f9" };

export default function RecibosPage() {
  const [tab, setTab]             = useState("empleados");
  const [empleados, setEmpleados] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [busqueda, setBusqueda]   = useState("");
  const [expandidos, setExpandidos] = useState(new Set());
  const [descargando, setDescargando] = useState({});

  // Upload state
  const [archivo, setArchivo]     = useState(null);
  const [drag, setDrag]           = useState(false);
  const [subiendo, setSubiendo]   = useState(false);
  const [resultado, setResultado] = useState(null);
  const inputRef = useRef();

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await api.get("/recibos/empleados");
      setEmpleados(data || []);
    } catch {}
    setCargando(false);
  };

  const toggleExpandir = (nombre) =>
    setExpandidos(prev => { const n = new Set(prev); n.has(nombre) ? n.delete(nombre) : n.add(nombre); return n; });

  const filtrados = empleados.filter(e =>
    !busqueda.trim() || e.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const descargar = async (id, nombre, periodo) => {
    setDescargando(d => ({ ...d, [id]: true }));
    try {
      const { url } = await api.get(`/recibos/${id}/url`);
      window.open(url, "_blank");
    } catch {
      alert("No se pudo obtener el archivo.");
    }
    setDescargando(d => ({ ...d, [id]: false }));
  };

  // — Upload handlers —
  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") { alert("Solo se aceptan archivos PDF"); return; }
    setArchivo(f);
    setResultado(null);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  }, []);

  const subirPDF = async () => {
    if (!archivo || subiendo) return;
    setSubiendo(true);
    setResultado(null);
    try {
      const form = new FormData();
      form.append("file", archivo);
      const data = await api.upload("/recibos/upload", form);
      setResultado({ ok: true, ...data });
      setArchivo(null);
      await cargar();
      if (data.procesados > 0) setTab("empleados");
    } catch (e) {
      setResultado({ ok: false, msg: e.message || "Error al procesar el PDF" });
    }
    setSubiendo(false);
  };

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{
      padding:"7px 16px", borderRadius:7, border:"none", cursor:"pointer",
      fontSize:13, fontWeight:500,
      background: tab === key ? "#fff" : "transparent",
      color: tab === key ? "#1e293b" : "#64748b",
      boxShadow: tab === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
    }}>{label}</button>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, maxWidth:860 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#0f172a" }}>Recibos de Sueldo</h1>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"#64748b" }}>
            {empleados.length > 0 ? `${empleados.length} empleado${empleados.length !== 1 ? "s" : ""} con recibos cargados` : "Cargá un PDF para empezar"}
          </p>
        </div>
        {/* Tab pills */}
        <div style={{ display:"flex", gap:4, background:"#f1f5f9", borderRadius:9, padding:4, flexShrink:0 }}>
          {tabBtn("empleados", "Empleados")}
          {tabBtn("subir", "Subir PDF")}
        </div>
      </div>

      {/* ── TAB: Empleados ── */}
      {tab === "empleados" && (
        <>
          {/* Buscador */}
          <input
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar empleado…"
            style={{ border:"1.5px solid #e2e8f0", borderRadius:9, padding:"9px 14px", fontSize:13, outline:"none", background:"#fff", color:"#1e293b", width:"100%", boxSizing:"border-box" }}
          />

          {cargando ? (
            <div style={{ textAlign:"center", padding:"40px 0", fontSize:13, color:"#94a3b8" }}>Cargando…</div>
          ) : filtrados.length === 0 ? (
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"48px 16px", textAlign:"center" }}>
              <p style={{ fontSize:13, color:"#94a3b8", margin:0 }}>
                {empleados.length === 0 ? "No hay recibos cargados. Usá la pestaña \"Subir PDF\" para cargar el primer lote." : "Sin resultados para la búsqueda."}
              </p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:0, background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, overflow:"hidden" }}>
              {filtrados.map((emp, idx) => {
                const open = expandidos.has(emp.nombre);
                const isLast = idx === filtrados.length - 1;
                return (
                  <div key={emp.nombre} style={{ borderBottom: isLast ? "none" : "1px solid #f1f5f9" }}>
                    {/* Fila del empleado */}
                    <button
                      onClick={() => toggleExpandir(emp.nombre)}
                      style={{
                        width:"100%", display:"flex", alignItems:"center", gap:14,
                        padding:"14px 20px", background:"none", border:"none", cursor:"pointer",
                        textAlign:"left",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = open ? "transparent" : "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Chevron */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round"
                        style={{ flexShrink:0, transform: open ? "rotate(90deg)" : "rotate(0deg)", transition:"transform 0.15s" }}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>

                      {/* Avatar / inicial */}
                      <div style={{ width:34, height:34, borderRadius:8, background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:"#2563eb" }}>{emp.nombre.charAt(0)}</span>
                      </div>

                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:0, fontSize:14, fontWeight:600, color:"#1e293b" }}>{emp.nombre}</p>
                        {emp.legajo && <p style={{ margin:"1px 0 0", fontSize:11, color:"#94a3b8" }}>Legajo {emp.legajo}</p>}
                      </div>

                      <span style={{ fontSize:12, color:"#64748b", background:"#f1f5f9", padding:"3px 10px", borderRadius:999, flexShrink:0 }}>
                        {emp.periodos.length} {emp.periodos.length === 1 ? "recibo" : "recibos"}
                      </span>
                    </button>

                    {/* Períodos expandidos */}
                    {open && (
                      <div style={{ borderTop:"1px solid #f1f5f9" }}>
                        <table style={{ width:"100%", borderCollapse:"collapse" }}>
                          <thead>
                            <tr>
                              <th style={TH}>Período</th>
                              <th style={{ ...TH, width:120, textAlign:"right" }}>Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {emp.periodos.map(p => (
                              <tr key={p.id}
                                style={{ borderBottom:"1px solid #f8fafc" }}
                                onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                                onMouseLeave={e => e.currentTarget.style.background="transparent"}
                              >
                                <td style={{ padding:"10px 20px 10px 54px" }}>
                                  <span style={{ fontSize:13, fontWeight:500, color:"#1e293b" }}>
                                    {p.periodo_texto || `${MESES[p.mes]} ${p.anio}`}
                                  </span>
                                </td>
                                <td style={{ padding:"8px 20px", textAlign:"right" }}>
                                  <button
                                    onClick={() => descargar(p.id, emp.nombre, p.periodo_texto)}
                                    disabled={descargando[p.id]}
                                    style={{
                                      background: descargando[p.id] ? "#f1f5f9" : "#eff6ff",
                                      color: descargando[p.id] ? "#94a3b8" : "#2563eb",
                                      border:"1.5px solid", borderColor: descargando[p.id] ? "#e2e8f0" : "#bfdbfe",
                                      borderRadius:7, padding:"5px 12px", fontSize:12, fontWeight:600,
                                      cursor: descargando[p.id] ? "not-allowed" : "pointer", whiteSpace:"nowrap",
                                    }}
                                    onMouseEnter={e => { if (!descargando[p.id]) { e.currentTarget.style.background="#dbeafe"; e.currentTarget.style.borderColor="#93c5fd"; }}}
                                    onMouseLeave={e => { if (!descargando[p.id]) { e.currentTarget.style.background="#eff6ff"; e.currentTarget.style.borderColor="#bfdbfe"; }}}
                                  >
                                    {descargando[p.id] ? "Abriendo…" : "↓ Descargar"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── TAB: Subir PDF ── */}
      {tab === "subir" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border:`2px dashed ${drag ? "#2563eb" : archivo ? "#86efac" : "#cbd5e1"}`,
              borderRadius:12, padding:"40px 24px", textAlign:"center", cursor:"pointer",
              background: drag ? "#eff6ff" : archivo ? "#f0fdf4" : "#f8fafc",
              transition:"all 0.15s",
            }}
          >
            <input ref={inputRef} type="file" accept=".pdf" style={{ display:"none" }}
              onChange={e => handleFile(e.target.files?.[0])} />

            {archivo ? (
              <>
                <div style={{ fontSize:32, marginBottom:8 }}>📄</div>
                <p style={{ margin:0, fontSize:14, fontWeight:600, color:"#16a34a" }}>{archivo.name}</p>
                <p style={{ margin:"4px 0 0", fontSize:12, color:"#64748b" }}>
                  {(archivo.size / 1024).toFixed(0)} KB — hacé clic para cambiar el archivo
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize:32, marginBottom:8 }}>📂</div>
                <p style={{ margin:0, fontSize:14, fontWeight:600, color:"#475569" }}>Arrastrá el PDF acá o hacé clic para elegirlo</p>
                <p style={{ margin:"4px 0 0", fontSize:12, color:"#94a3b8" }}>PDF con todos los recibos del período (una página por empleado)</p>
              </>
            )}
          </div>

          {/* Botón subir */}
          {archivo && !subiendo && (
            <button onClick={subirPDF} style={{
              background:"#2563eb", color:"#fff", border:"none", borderRadius:9,
              padding:"11px 24px", fontSize:13, fontWeight:700, cursor:"pointer",
            }}
              onMouseEnter={e => e.currentTarget.style.background="#1d4ed8"}
              onMouseLeave={e => e.currentTarget.style.background="#2563eb"}
            >
              Procesar y guardar recibos
            </button>
          )}

          {/* Progreso */}
          {subiendo && (
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"24px 20px", textAlign:"center" }}>
              <div style={{ fontSize:24, marginBottom:8 }}>⚙️</div>
              <p style={{ margin:0, fontSize:13, fontWeight:600, color:"#1e293b" }}>Procesando PDF…</p>
              <p style={{ margin:"4px 0 0", fontSize:12, color:"#64748b" }}>Extrayendo recibos y guardando en la base de datos</p>
            </div>
          )}

          {/* Resultado */}
          {resultado && (
            <div style={{ background:"#fff", border:`1px solid ${resultado.ok ? "#bbf7d0" : "#fecaca"}`, borderRadius:10, padding:"20px 20px", display:"flex", flexDirection:"column", gap:12 }}>
              {resultado.ok ? (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:20 }}>✅</span>
                    <div>
                      <p style={{ margin:0, fontSize:14, fontWeight:700, color:"#15803d" }}>
                        {resultado.procesados} recibo{resultado.procesados !== 1 ? "s" : ""} guardado{resultado.procesados !== 1 ? "s" : ""}
                      </p>
                      {resultado.errores > 0 && (
                        <p style={{ margin:"2px 0 0", fontSize:12, color:"#64748b" }}>
                          {resultado.errores} página{resultado.errores !== 1 ? "s" : ""} no procesada{resultado.errores !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {resultado.detalle?.length > 0 && (
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {resultado.detalle.map((d, i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#475569" }}>
                          <span style={{ color:"#16a34a", fontWeight:700 }}>✓</span>
                          <span style={{ fontWeight:600 }}>Pág. {d.pagina}</span>
                          <span>{d.nombre}</span>
                          <span style={{ color:"#94a3b8" }}>·</span>
                          <span style={{ color:"#2563eb" }}>{d.periodo}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {resultado.detalle_errores?.length > 0 && (
                    <div style={{ borderTop:"1px solid #e2e8f0", paddingTop:12, display:"flex", flexDirection:"column", gap:4 }}>
                      <p style={{ margin:0, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", color:"#94a3b8" }}>No procesados</p>
                      {resultado.detalle_errores.map((e, i) => (
                        <div key={i} style={{ display:"flex", gap:8, fontSize:12, color:"#dc2626" }}>
                          <span style={{ fontWeight:600 }}>Pág. {e.pagina}:</span>
                          <span>{e.msg}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:20 }}>❌</span>
                  <p style={{ margin:0, fontSize:13, fontWeight:600, color:"#dc2626" }}>{resultado.msg}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
