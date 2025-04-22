// utils/convertirAFloat.mjs

export function convertirAFloat(valor) {
  if (typeof valor !== "string") return 0;

  // Reemplaza separadores de miles y convierte la coma decimal a punto
  const limpio = valor.replace(/\./g, "").replace(",", ".");
  const resultado = parseFloat(limpio);

  return isNaN(resultado) ? 0 : resultado;
}

export function formatArg(num) {
  return Number(num).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
