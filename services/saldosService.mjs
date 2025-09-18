// services/saldosService.mjs
import mongoose from "mongoose";
import MovimientoProveedor from "../models/movimientoProveedor.mjs";
import Pago from "../models/pago.mjs";

/**
 * Devuelve un Map proveedorId -> saldoTotal
 * Saldo = (cargos + débitos) - (créditos + pagos)
 */
export async function saldosPorProveedor() {
  // Total de movimientos por proveedor (cargos/debitos suman, créditos restan)
  const movAgg = await MovimientoProveedor.aggregate([
    {
      $project: {
        proveedor: 1,
        tipo: 1,
        importe: { $ifNull: ["$importe", 0] },
      },
    },
    {
      $project: {
        proveedor: 1,
        importeSigned: {
          $cond: [
            { $in: ["$tipo", ["cargo", "debito"]] },
            "$importe",
            {
              $cond: [
                { $eq: ["$tipo", "credito"] },
                { $multiply: ["$importe", -1] },
                0,
              ],
            },
          ],
        },
      },
    },
    { $group: { _id: "$proveedor", totalMovs: { $sum: "$importeSigned" } } },
  ]);

  // Total de pagos por proveedor (restan al saldo)
  const pagosAgg = await Pago.aggregate([
    {
      $group: {
        _id: "$proveedor",
        totalPagos: { $sum: { $ifNull: ["$importe", 0] } },
      },
    },
  ]);

  const mapa = new Map();
  for (const r of movAgg) mapa.set(String(r._id), Number(r.totalMovs || 0));
  for (const r of pagosAgg)
    mapa.set(String(r._id), (mapa.get(String(r._id)) || 0) - Number(r.totalPagos || 0));

  return mapa; // Map<proveedorId, saldo>
}