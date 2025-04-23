export function convertirAFloat(valor) {
  if (typeof valor === "string") {
    // Si tiene coma, asumimos formato "10.000,50" → sacar puntos y cambiar coma por punto
    if (valor.includes(',')) {
      valor = valor.replace(/\./g, '').replace(',', '.');
    }
    // Si no tiene coma, es un número tipo "100.50" o "25000" (ya válido)
    return parseFloat(valor) || 0;
  }
  return parseFloat(valor) || 0;
}