// Tickets que no generan ningún movimiento de stock.

export function debeExcluirse(descripcionNorm) {
  if (/omitir/.test(descripcionNorm)) return { excluir: true, motivo: "Descripción indica OMITIR" };
  if (/no disponible/.test(descripcionNorm)) return { excluir: true, motivo: "No disponible" };
  if (/realizado por el transportista/.test(descripcionNorm)) return { excluir: true, motivo: "Realizado por el transportista" };
  return { excluir: false };
}
