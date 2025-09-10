import Plan from "../models/plan.mjs";

export async function listarPlanesService() {
  return Plan.find().sort({ createdAt: -1 });
}
export async function crearPlanService(data) {
  const { nombre, detalle = "", importe } = data;
  return new Plan({ nombre: nombre.trim(), detalle: (detalle||"").trim(), importe }).save();
}
export async function obtenerPlanPorIdService(id) {
  return Plan.findById(id);
}
export async function actualizarPlanService(id, data) {
  const { nombre, detalle = "", importe, activo } = data;
  return Plan.findByIdAndUpdate(id, { nombre, detalle, importe, activo }, { new: true });
}
export async function eliminarPlanService(id) {
  return Plan.findByIdAndDelete(id);
}