import PredioEscuela from "../models/predioEscuela.mjs";

export async function crearPredioEscuelaService(datos) {
  const nuevoPredioEscuela = new PredioEscuela(datos);
  return await nuevoPredioEscuela.save();
}

export async function obtenerPrediosEscuelasService() {
  return await PredioEscuela.find().sort({ createdAt: -1 });
}

export async function obtenerPredioEscuelaPorIdService(id) {
  return await PredioEscuela.findById(id);
}

export async function actualizarPredioEscuelaService(id, datosActualizados) {
  return await PredioEscuela.findByIdAndUpdate(id, datosActualizados, {
    new: true,
    runValidators: true,
  });
}

export async function eliminarPredioEscuelaService(id) {
  return await PredioEscuela.findByIdAndDelete(id);
}