// utils/convertirAFloat.mjs

export function convertirAFloat(valor) {
  if (typeof valor === "string") {
    return parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;
  }
  return parseFloat(valor) || 0;
}