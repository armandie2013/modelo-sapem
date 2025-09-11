// services/planesService.mjs
import Plan from "../models/plan.mjs";

const toBool = (v) =>
  v === true || v === "true" || v === "on" || v === "1" || v === 1;

/**
 * Acepta: "12.345,67", "12345,67", "12345.67", "12345"
 * Devuelve Number o undefined si no se puede parsear.
 */
function parseImporte(v) {
  if (v === "" || v == null) return undefined;
  if (typeof v === "number") return v;
  let s = String(v).trim();
  if (!s) return undefined;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let decSep = null;
  if (lastComma > -1 || lastDot > -1) decSep = lastComma > lastDot ? "," : ".";
  if (decSep === ",") {
    s = s.replace(/\./g, "");
    s = s.replace(",", ".");
  } else if (decSep === ".") {
    s = s.replace(/,/g, "");
  } else {
    s = s.replace(/[.\s,]/g, "");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Lista de planes (opcional solo activos). Ordenado por nombre. */
export async function listarPlanesService({ soloActivos = false } = {}) {
  const q = soloActivos ? { activo: { $ne: false } } : {};
  return Plan.find(q).sort({ nombre: 1 }).lean();
}

/** Conveniencia: solo activos (para selects en formularios). */
export async function listarPlanesActivosService() {
  return listarPlanesService({ soloActivos: true });
}

export async function crearPlanService(data) {
  const nombre = (data.nombre || "").trim();
  const detalle = (data.detalle || "").trim();
  const importe = parseImporte(data.importe);
  const activo = data.activo == null ? true : toBool(data.activo);

  if (!nombre) throw new Error("El nombre es obligatorio");
  if (importe == null || isNaN(importe) || importe < 0)
    throw new Error("El importe es inválido");

  try {
    const plan = new Plan({ nombre, detalle, importe, activo });
    return await plan.save();
  } catch (e) {
    if (e.code === 11000 && e.keyPattern?.nombre) {
      throw new Error("Ya existe un plan con ese nombre");
    }
    throw e;
  }
}

export async function obtenerPlanPorIdService(id) {
  return Plan.findById(id).lean();
}

export async function actualizarPlanService(id, data) {
  const update = {};
  if (data.nombre != null) update.nombre = String(data.nombre).trim();
  if (data.detalle != null) update.detalle = String(data.detalle).trim();
  if (data.importe != null) {
    const n = parseImporte(data.importe);
    if (n == null || isNaN(n) || n < 0) throw new Error("El importe es inválido");
    update.importe = n;
  }
  if (data.activo != null) update.activo = toBool(data.activo);

  try {
    return await Plan.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();
  } catch (e) {
    if (e.code === 11000 && e.keyPattern?.nombre) {
      throw new Error("Ya existe un plan con ese nombre");
    }
    throw e;
  }
}

export async function eliminarPlanService(id) {
  return Plan.findByIdAndDelete(id);
}