// services/escuelasService.mjs
import Escuela from "../models/Escuela.mjs";

export async function obtenerEscuelasService() {
  return await Escuela.find().sort({ fechaCreacion: -1 });
}

export async function obtenerEscuelaPorIdService(id) {
  return await Escuela.findById(id);
}

export async function crearEscuelaService(datos) {
  const escuela = new Escuela(datos);
  return await escuela.save();
}

export async function actualizarEscuelaService(id, nuevosDatos) {
  return await Escuela.findByIdAndUpdate(id, nuevosDatos);
}

export async function eliminarEscuelaService(id) {
  return await Escuela.findByIdAndDelete(id);
}

export async function obtenerUltimaEscuelaService() {
  return await Escuela.findOne().sort({ numeroTicket: -1 });
}
