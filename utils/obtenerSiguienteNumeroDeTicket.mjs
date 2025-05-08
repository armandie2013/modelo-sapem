import ContadorGeneral from "../models/contadorGeneral.mjs";

export async function obtenerSiguienteNumeroDeTicket(modulo) {
  try {
    // Verificamos si el módulo es válido
    const modulosValidos = ["escuelas", "reclamosTecnicos"];
    if (!modulosValidos.includes(modulo)) {
      throw new Error(`Módulo no permitido: ${modulo}`);
    }

    // Actualizamos o creamos el contador según corresponda
    const resultado = await ContadorGeneral.findOneAndUpdate(
      { modulo },
      { $inc: { ultimoNumero: 1 } },
      { new: true, upsert: true }
    );

    return resultado.ultimoNumero;
  } catch (error) {
    console.error(
      `❌ Error al generar número de ticket para ${modulo}:`,
      error
    );
    throw new Error("Error al generar número de ticket");
  }
}
