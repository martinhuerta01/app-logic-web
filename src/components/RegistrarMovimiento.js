"use client";
import { useState, useMemo, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Modal, { BtnPrimary, BtnSecondary, FieldLabel, FieldInput, FieldSelect, ChipGroup } from "@/components/Modal";

const hoyAR = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
let seq = 0;
const filaVacia = () => ({ _id: ++seq, codigo: "", cantidad: "" });

const TIPOS = [
  { value: "entrada", label: "Entrada" },
  { value: "salida",  label: "Salida a destino" },
  { value: "ajuste",  label: "Ajuste" },
];

export default function RegistrarMovimiento({ open, onClose, productos, ubicaciones, stockActual = [], onGuardado }) {
  const { user } = useAuth();
  const oficina = ubicaciones.find(u => u.tipo === "oficina" || u.nombre.toLowerCase() === "oficina");

  const [tipo, setTipo]         = useState("entrada");
  const [ubic, setUbic]         = useState("");
  const [origen, setOrigen]     = useState("");
  const [destino, setDestino]   = useState("");
  const [sentido, setSentido]   = useState("sumar");
  const [fecha, setFecha]       = useState(hoyAR());
  const [nota, setNota]         = useState("");
  const [filas, setFilas]       = useState([filaVacia()]);
  const [msg, setMsg]           = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open || !oficina) return;
    setUbic(v => v || oficina.id);
    setOrigen(v => v || oficina.id);
  }, [open, oficina?.id]);

  const productosActivos = useMemo(() => productos.filter(p => p.activo !== false), [productos]);

  const porCodigo = useMemo(() => {
    const m = new Map();
    productosActivos.forEach(p => m.set(String(p.codigo || "").trim().toUpperCase(), p));
    return m;
  }, [productosActivos]);

  const disp = useMemo(
    () => new Map(stockActual.map(s => [`${s.ubicacion_id}|${s.producto_id}`, s.cantidad])),
    [stockActual]
  );
  const ubicDisp = tipo === "salida" ? origen : (tipo === "ajuste" && sentido === "restar" ? ubic : "");

  const setFila = (id, campo, valor) => setFilas(fs => fs.map(f => f._id === id ? { ...f, [campo]: valor } : f));
  const quitar  = (id) => setFilas(fs => fs.length === 1 ? [filaVacia()] : fs.filter(f => f._id !== id));
  const agregar = () => setFilas(fs => [...fs, filaVacia()]);

  const analizadas = filas.map(f => {
    const prod = porCodigo.get(f.codigo.trim().toUpperCase());
    const cant = parseInt(f.cantidad);
    return { f, prod, cant, ok: !!prod && cant > 0, vacia: !f.codigo && !f.cantidad };
  });
  const listas = analizadas.filter(a => a.ok);

  const cerrar = () => { if (!guardando) onClose(); };

  const guardar = async () => {
    setMsg("");
    if (analizadas.some(a => !a.vacia && !a.ok)) { setMsg("Error: hay filas con código inexistente o cantidad inválida"); return; }
    if (listas.length === 0) { setMsg("Error: agregá al menos un insumo con cantidad"); return; }
    if (tipo === "entrada" && !ubic) { setMsg("Error: elegí dónde ingresa"); return; }
    if (tipo === "salida" && (!origen || !destino)) { setMsg("Error: elegí origen y destino"); return; }
    if (tipo === "salida" && origen === destino) { setMsg("Error: origen y destino no pueden ser iguales"); return; }
    if (tipo === "ajuste" && (!ubic || !nota.trim())) { setMsg("Error: elegí la ubicación e indicá el motivo del ajuste"); return; }

    setGuardando(true);
    let hechos = 0;
    try {
      for (const a of listas) {
        if (tipo === "entrada") {
          await api.post("/stock/entradas/", {
            producto_id: a.prod.id, ubicacion_id: ubic, cantidad: a.cant, fecha,
            observaciones: nota.trim() || null,
          });
        } else if (tipo === "salida") {
          await api.post("/stock/transferencias/", {
            producto_id: a.prod.id, ubicacion_origen_id: origen, ubicacion_destino_id: destino,
            cantidad: a.cant, fecha,
          });
        } else {
          await api.post("/stock/movimiento/", {
            tipo: "AJUSTE", producto_id: a.prod.id, cantidad: a.cant, fecha,
            [sentido === "sumar" ? "destino_id" : "origen_id"]: ubic,
            cargado_por: user || undefined, observacion: nota.trim(),
          });
        }
        hechos++;
        setFilas(fs => fs.filter(f => f._id !== a.f._id));
      }
      setFilas([filaVacia()]); setNota(""); setDestino("");
      onGuardado?.(hechos);
      onClose();
    } catch (e) {
      setMsg(`Error: ${String(e.message).slice(0, 140)}${hechos ? ` (${hechos} ya registrado${hechos !== 1 ? "s" : ""}, no se repiten)` : ""}`);
    } finally {
      setGuardando(false);
    }
  };

  const optsUbic = (excluir) => (
    <>
      <option value="">Seleccionar</option>
      {ubicaciones.filter(u => u.id !== excluir).map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
    </>
  );

  return (
    <Modal open={open} onClose={cerrar} title="Registrar movimiento" width="680px"
      footer={
        <>
          <span style={{ fontSize: 12, fontWeight: 500, color: msg.startsWith("Error") ? "#dc2626" : "#94a3b8" }}>
            {msg || `${listas.length} insumo${listas.length !== 1 ? "s" : ""} listo${listas.length !== 1 ? "s" : ""}`}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <BtnSecondary onClick={cerrar}>Cancelar</BtnSecondary>
            <BtnPrimary onClick={guardar} loading={guardando}>Registrar {listas.length || ""}</BtnPrimary>
          </div>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 16 }}>
        <ChipGroup options={TIPOS} value={tipo} onChange={(v) => { setTipo(v); setMsg(""); }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 150px", gap: 12 }}>
          {tipo === "entrada" && (
            <>
              <div><FieldLabel>Ingresa a</FieldLabel>
                <FieldSelect value={ubic} onChange={e => setUbic(e.target.value)}>{optsUbic()}</FieldSelect></div>
              <div><FieldLabel>Referencia (remito, proveedor)</FieldLabel>
                <FieldInput value={nota} onChange={e => setNota(e.target.value)} placeholder="Opcional" /></div>
            </>
          )}
          {tipo === "salida" && (
            <>
              <div><FieldLabel>Desde</FieldLabel>
                <FieldSelect value={origen} onChange={e => setOrigen(e.target.value)}>{optsUbic()}</FieldSelect></div>
              <div><FieldLabel>Hacia</FieldLabel>
                <FieldSelect value={destino} onChange={e => setDestino(e.target.value)}>{optsUbic(origen)}</FieldSelect></div>
            </>
          )}
          {tipo === "ajuste" && (
            <>
              <div><FieldLabel>Ubicación</FieldLabel>
                <FieldSelect value={ubic} onChange={e => setUbic(e.target.value)}>{optsUbic()}</FieldSelect></div>
              <div><FieldLabel>Sentido</FieldLabel>
                <ChipGroup options={[{ value: "sumar", label: "Sumar" }, { value: "restar", label: "Restar" }]} value={sentido} onChange={setSentido} /></div>
            </>
          )}
          <div><FieldLabel>Fecha</FieldLabel>
            <FieldInput type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></div>
        </div>

        {tipo === "ajuste" && (
          <div><FieldLabel required>Motivo del ajuste</FieldLabel>
            <FieldInput value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej: stock inicial, conteo físico, corrección" /></div>
        )}

        <div>
          <datalist id="reg-codigos">
            {productosActivos.map(p => <option key={p.id} value={p.codigo}>{p.descripcion}</option>)}
          </datalist>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 90px 28px", gap: 8, marginBottom: 6 }}>
            <FieldLabel>Código</FieldLabel><FieldLabel>Insumo</FieldLabel><FieldLabel>Cantidad</FieldLabel><span />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {analizadas.map(({ f, prod, cant }, i) => {
              const d = prod && ubicDisp ? (disp.get(`${ubicDisp}|${prod.id}`) ?? 0) : null;
              const excede = d != null && cant > d;
              return (
                <div key={f._id} style={{ display: "grid", gridTemplateColumns: "140px 1fr 90px 28px", gap: 8, alignItems: "center" }}>
                  <FieldInput list="reg-codigos" value={f.codigo} placeholder="Código"
                    onChange={e => setFila(f._id, "codigo", e.target.value)} style={{ fontFamily: "DM Mono, monospace" }} />
                  <div style={{ fontSize: 12.5, color: prod ? "#334155" : "#94a3b8", minWidth: 0 }}>
                    {prod ? prod.descripcion : "(automático)"}
                    {d != null && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: excede ? "#dc2626" : "#94a3b8" }}>
                        disp. {d}
                      </span>
                    )}
                  </div>
                  <FieldInput type="number" min="1" value={f.cantidad} placeholder="0"
                    onChange={e => setFila(f._id, "cantidad", e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (i === filas.length - 1) agregar(); } }}
                    style={{ textAlign: "center" }} />
                  <button type="button" onClick={() => quitar(f._id)} title="Quitar fila"
                    style={{ border: "none", background: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={agregar}
            style={{ marginTop: 10, border: "none", background: "none", color: "#2563eb", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            + Agregar insumo
          </button>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>
            Tip: presioná Enter en Cantidad para agregar la siguiente fila.
          </p>
        </div>
      </div>
    </Modal>
  );
}
