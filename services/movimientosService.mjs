// services/movimientosService.mjs  (nuevo)
import mongoose from "mongoose";
import MovimientoProveedor from "../models/movimientoProveedor.mjs";

/**
 * Devuelve movimientos "ajustables" para Notas (crédito/débito):
 * - Excluye TODO lo que tenga planPagoId != null (cuotas de plan)
 * - Excluye cargos que ya tengan una reversa por plan (crédito con planPagoId y aplicaA = ese cargo)
 */
export async function movimientosAjustablesParaNotas(proveedorId) {
  const oid = new mongoose.Types.ObjectId(proveedorId);

  // IDs de cargos que ya fueron revertidos por plan (no ajustables)
  const reversas = await MovimientoProveedor.find(
    { proveedor: oid, tipo: "credito", planPagoId: { $ne: null }, aplicaA: { $ne: null } },
    { aplicaA: 1, _id: 0 }
  ).lean();
  const noAjustar = new Set(reversas.map(r => String(r.aplicaA)));

  // Movimientos candidatos (sin pertenecer a plan)
  const movs = await MovimientoProveedor.find({
    proveedor: oid,
    planPagoId: null,                             // <- clave
    tipo: { $in: ["cargo", "debito"] },          // según tu UX, podés limitar sólo a 'cargo'
  })
  .select("_id tipo concepto periodo fecha importe planPagoId")
  .sort({ fecha: 1, _id: 1 })
  .lean();

  // Filtrar los que fueron revertidos por plan
  return movs.filter(m => !noAjustar.has(String(m._id)));
}