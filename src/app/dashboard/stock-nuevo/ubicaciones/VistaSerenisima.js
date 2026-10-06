"use client";
import { useState, useEffect, useMemo, Fragment } from "react";
import { api } from "@/lib/api";
import { valorDeCodigo, localidadAMostrar, mensajeDeError } from "@/lib/stockNuevo";

const MONO = { fontFamily: "DM Mono, monospace" };
const BASE = "/stock-nuevo";
const TH = {
  textAlign: "left", padding: "9px 12px", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.07em",
  textTransform: "uppercase", color: "#94a3b8", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
};
const TD = { padding: "10px 12px", fontSize: 13, color: "#334155", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" };
const NUM = { ...MONO, textAlign: "right", fontSize: 13.5 };

const botonDetalle = {
  border: "none", borderRadius: 6, background: "#1d4e89", color: "#ffffff", fontSize: 11.5, fontWeight: 700,
  padding: "3px 10px", cursor: "pointer", fontFamily: "inherit", marginTop: 4,
};

const Detalle = ({ entrada, productoPorId, cantidadDe, sobrantes }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {(entrada.producto_ids || []).map((id) => {
      const p = productoPorId.get(id);
      return (
        <div key={id} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12.5, maxWidth: 480 }}>
          <span><span style={{ ...MONO, color: "#64748b" }}>{(p?.codigo || "?").trim()}</span> · {p?.descripcion || "Producto no encontrado"}</span>
          <b style={MONO}>{cantidadDe(id)}</b>
        </div>
      );
    })}
    {sobrantes.length > 0 && (
      <div style={{ fontSize: 12.5, color: "#b45309", marginTop: 4 }}>
        Sin su par: {sobrantes.map((s) => `${s.cantidad} ${(productoPorId.get(s.id)?.descripcion || "").toLowerCase()}`).join(", ")}
      </div>
    )}
  </div>
);

// Una ubicación, con los códigos de La Serenísima (las mismas columnas de la vista por producto)
export function VistaSerenisima({ filas, mapeo }) {
  const [abiertos, setAbiertos] = useState({});
  const porProducto = useMemo(() => new Map(filas.map((f) => [f.producto_id, f])), [filas]);
  const productoPorId = porProducto;
  const usados = useMemo(() => new Set(mapeo.flatMap((m) => m.producto_ids || [])), [mapeo]);

  const dato = (id, campo) => porProducto.get(id)?.[campo] ?? 0;
  const sinPar = (e) => e.modo === "pares";

  const filasSer = mapeo.map((m) => {
    const stock = valorDeCodigo(m, (id) => dato(id, "stock"));
    const comps = (m.producto_ids || []).map((id) => porProducto.get(id)).filter(Boolean);
    const conteoNulo = comps.length === 0 || comps.every((c) => c.ultimo_conteo == null);
    return {
      m, stock,
      conteo: conteoNulo ? null : comps.reduce((a, c) => a + (c.ultimo_conteo ?? 0), 0),
      envios: valorDeCodigo({ ...m, modo: "suma" }, (id) => dato(id, "envios")).valor,
      tickets: valorDeCodigo({ ...m, modo: "suma" }, (id) => dato(id, "tickets")).valor,
    };
  });
  const sueltos = filas.filter((f) => !usados.has(f.producto_id));

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
        <thead>
          <tr>
            <th style={{ ...TH, width: 60 }}>Código</th>
            <th style={TH}>Producto de La Serenísima</th>
            <th style={{ ...TH, textAlign: "right" }}>Último conteo</th>
            <th style={{ ...TH, textAlign: "right" }}>Envíos</th>
            <th style={{ ...TH, textAlign: "right" }}>Tickets</th>
            <th style={{ ...TH, textAlign: "right" }}>Stock ahora</th>
            <th style={TH}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {filasSer.map(({ m, stock, conteo, envios, tickets }) => {
            const abierto = !!abiertos[m.id];
            const neg = stock.valor < 0;
            return (
              <Fragment key={m.id}>
                <tr>
                  <td style={{ ...TD, ...MONO, fontWeight: 700, fontSize: 15 }}>{m.codigo_serenisima}</td>
                  <td style={TD}>
                    <div style={{ fontWeight: 600 }}>{m.descripcion}</div>
                    {sinPar(m) && <div style={{ fontSize: 11.5, color: "#64748b" }}>Se cuenta como conjunto completo</div>}
                    <button type="button" aria-expanded={abierto} onClick={() => setAbiertos((a) => ({ ...a, [m.id]: !a[m.id] }))} style={botonDetalle}>
                      {abierto ? "Ocultar detalle" : "Ver detalle"}
                    </button>
                  </td>
                  <td style={{ ...NUM, ...TD, color: conteo == null || sinPar(m) ? "#cbd5e1" : undefined }}>{sinPar(m) || conteo == null ? "—" : conteo}</td>
                  <td style={{ ...NUM, ...TD, color: sinPar(m) ? "#cbd5e1" : undefined }}>{sinPar(m) ? "—" : envios > 0 ? `+${envios}` : envios}</td>
                  <td style={{ ...NUM, ...TD, color: sinPar(m) ? "#cbd5e1" : undefined }}>{sinPar(m) ? "—" : tickets > 0 ? `−${tickets}` : "0"}</td>
                  <td style={{ ...NUM, ...TD, fontWeight: 700, color: neg ? "#b91c1c" : "#0f172a" }}>{stock.valor}</td>
                  <td style={TD}>
                    {neg ? <span style={{ fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>Falta registrar un envío o hacer un conteo</span>
                      : <span style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>Con stock</span>}
                  </td>
                </tr>
                {abierto && (
                  <tr>
                    <td colSpan={7} style={{ ...TD, background: "#f8fafc" }}>
                      <Detalle entrada={m} productoPorId={productoPorId} cantidadDe={(id) => dato(id, "stock")} sobrantes={stock.sobrantes} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {sueltos.length > 0 && (
            <tr>
              <td colSpan={7} style={{ ...TD, background: "#fffbeb", color: "#92400e", fontSize: 12.5 }}>
                Sin código de La Serenísima: {sueltos.map((f) => `${f.codigo} (${f.stock})`).join(", ")}. Se cargan en Stock → Catálogos → Mapeo La Serenísima.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Todos los centros de distribución juntos: una columna por centro y el total
export function VistaCentros({ mapeo }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [abiertos, setAbiertos] = useState({});

  useEffect(() => {
    api.get(`${BASE}/centros/stock/`).then(setDatos).catch((e) => setError(mensajeDeError(e)));
  }, []);

  if (error) return <div role="alert" style={{ padding: 16, color: "#991b1b", fontSize: 13 }}>{error}</div>;
  if (!datos) return <div style={{ padding: 24, color: "#64748b", fontSize: 13 }}>Cargando…</div>;

  const productoPorId = new Map(datos.productos.map((p) => [p.id, p]));
  const cantidadEn = (centroId, id) => datos.stock[centroId]?.[id] ?? 0;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
        <thead>
          <tr>
            <th style={{ ...TH, width: 60 }}>Código</th>
            <th style={TH}>Producto de La Serenísima</th>
            {datos.centros.map((c) => (
              <th key={c.id} style={{ ...TH, textAlign: "right", whiteSpace: "nowrap" }} title={localidadAMostrar(c) || undefined}>{c.nombre.trim().replace(/^CD\s+/i, "")}</th>
            ))}
            <th style={{ ...TH, textAlign: "right" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {mapeo.map((m) => {
            const porCentro = datos.centros.map((c) => valorDeCodigo(m, (id) => cantidadEn(c.id, id)));
            const total = porCentro.reduce((a, v) => a + v.valor, 0);
            const abierto = !!abiertos[m.id];
            return (
              <Fragment key={m.id}>
                <tr>
                  <td style={{ ...TD, ...MONO, fontWeight: 700, fontSize: 15 }}>{m.codigo_serenisima}</td>
                  <td style={TD}>
                    <div style={{ fontWeight: 600 }}>{m.descripcion}</div>
                    <button type="button" aria-expanded={abierto} onClick={() => setAbiertos((a) => ({ ...a, [m.id]: !a[m.id] }))} style={botonDetalle}>
                      {abierto ? "Ocultar detalle" : "Ver detalle"}
                    </button>
                  </td>
                  {porCentro.map((v, i) => (
                    <td key={datos.centros[i].id} style={{ ...NUM, ...TD, color: v.valor < 0 ? "#b91c1c" : v.valor === 0 ? "#cbd5e1" : "#0f172a", fontWeight: v.valor < 0 ? 700 : 400 }}>{v.valor}</td>
                  ))}
                  <td style={{ ...NUM, ...TD, fontWeight: 700 }}>{total}</td>
                </tr>
                {abierto && (
                  <tr>
                    <td colSpan={datos.centros.length + 3} style={{ ...TD, background: "#f8fafc" }}>
                      <Detalle entrada={m} productoPorId={productoPorId}
                        cantidadDe={(id) => datos.centros.reduce((a, c) => a + cantidadEn(c.id, id), 0)}
                        sobrantes={[]} />
                      {m.modo === "pares" && <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>El total suma las fichas completas de cada centro; las que quedan sin su par no se cuentan.</div>}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
