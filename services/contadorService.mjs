import Contador from "../models/contador.mjs";

export async function obtenerSiguienteNumeroDeViaje() {
  const resultado = await Contador.findOneAndUpdate(
    { nombre: "viajes" },
    { $inc: { valor: 1 } },
    { new: true, upsert: true }
  );

  return resultado.valor;
}
