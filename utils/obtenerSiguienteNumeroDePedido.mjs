import Contador from "../models/contador.mjs";

export async function obtenerSiguienteNumeroDePedido() {
  const nombreContador = "pedidoMaterial";

  const resultado = await Contador.findOneAndUpdate(
    { nombre: nombreContador },
    { $inc: { valor: 1 } },
    { new: true, upsert: true } // crea si no existe
  );

  return resultado.valor;
}