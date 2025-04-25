// utils/normalizarPermisos.mjs
export function normalizarPermisos(input) {
    const resultado = {};
  
    for (const modulo in input) {
      resultado[modulo] = {};
      for (const accion in input[modulo]) {
        resultado[modulo][accion] = input[modulo][accion] === "on";
      }
    }
  
    return resultado;
  };