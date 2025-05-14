import Contador from "../models/contador.mjs";

export async function obtenerSiguienteNumeroDeProveedor() {
  try {
    const contador = await Contador.findOneAndUpdate(
      { nombre: "proveedores" },
      { $inc: { valor: 1 } },
      { new: true, upsert: true }
    );

    return contador.valor;
  } catch (error) {
    console.error("❌ Error al generar número de proveedor:", error);
    throw new Error("Error al generar número de proveedor");
  }
}