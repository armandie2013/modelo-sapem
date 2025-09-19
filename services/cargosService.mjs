// services/cargosService.mjs
import mongoose from "mongoose";
import MovimientoProveedor from "../models/movimientoProveedor.mjs";
import clock from "../utils/clock.mjs";

function periodoYYYYMM(d = clock.date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Período objetivo:
 * 1..27 -> mes actual
 * 28..31 -> mes siguiente
 */
function calcularPeriodoParaCargos(fecha = clock.date()) {
  const y = fecha.getFullYear();
  const m = fecha.getMonth();
  const d = fecha.getDate();
  const objetivo = (d >= 28) ? new Date(y, m + 1, 1) : new Date(y, m, 1);
  const yy = objetivo.getFullYear();
  const mm = String(objetivo.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

// --- Cargos mensuales (idempotente) ---
export async function generarCargosMensuales(fechaRef = clock.date()) {
  const periodo = calcularPeriodoParaCargos(fechaRef);
  const Proveedor = (await import("../models/proveedor.mjs")).default;

  const proveedores = await Proveedor.find({
    activo: { $ne: false },
    plan: { $ne: null },
  }).populate("plan", "nombre importe activo");

  let creados = 0, existentes = 0, errores = 0;

  for (const p of proveedores) {
    try {
      if (!p.plan || p.plan.activo === false) continue;

      const filtro = { proveedor: p._id, periodo, tipo: "cargo" };
      const concepto = `Cargo mensual plan ${p.plan.nombre} ${periodo}`;

      try {
        const res = await MovimientoProveedor.updateOne(
          filtro,
          {
            $setOnInsert: {
              proveedor: p._id,
              tipo: "cargo",
              periodo,
              fecha: clock.date(),
              concepto,
              importe: Number(p.plan.importe),
              plan: p.plan._id,
              importePlan: Number(p.plan.importe),
              planPagoId: null,
            },
          },
          { upsert: true }
        );
        if (res.upsertedCount === 1) creados++; else existentes++;
      } catch (e) {
        if (e && e.code === 11000) existentes++; else throw e;
      }
    } catch (e) {
      console.error("Error generando cargo:", p._id, e);
      errores++;
    }
  }

  return { periodo, creados, existentes, errores };
}

// Si alguna vez querés “recomponer” meses perdidos, llamalo a mano.
export async function catchUpCargos(mesesAtras = 0) {
  if (!Number.isInteger(mesesAtras) || mesesAtras < 0) mesesAtras = 0;
  const base = clock.date();
  for (let i = mesesAtras; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    await generarCargosMensuales(d);
  }
}

// Busca primero CUOTA de plan; si no hay, vuelve a cargo normal
export async function buscarCargoPorPeriodo(proveedorId, periodo) {
  const oid = new mongoose.Types.ObjectId(proveedorId);

  const cuota = await MovimientoProveedor.findOne({
    proveedor: oid, tipo: "debito", periodo: String(periodo), planPagoId: { $ne: null },
  }).lean();

  if (cuota) return cuota;

  return MovimientoProveedor.findOne({
    proveedor: oid, tipo: "cargo", periodo: String(periodo), planPagoId: null,
  }).lean();
}

export async function cargosPendientesPorProveedor(proveedorId) {
  const oid = new mongoose.Types.ObjectId(proveedorId);

  const pipelineCargos = [
    { $match: { proveedor: oid, tipo: "cargo", planPagoId: null } },
    { $lookup: { from: "pagos", localField: "_id", foreignField: "cargo", as: "pagos" } },
    {
      $project: {
        _id: 1, periodo: 1, concepto: 1,
        importe: { $ifNull: ["$importe", 0] },
        pagado: { $sum: { $map: { input: { $ifNull: ["$pagos", []] }, as: "p", in: { $ifNull: ["$$p.importe", 0] } } } },
      },
    },
    { $addFields: { saldo: { $subtract: ["$importe", "$pagado"] }, tipo: "cargo", cuotaN: null, cuotasTotal: null } },
    { $match: { saldo: { $gt: 0 } } },
  ];

  const pipelineCuotas = [
    { $match: { proveedor: oid, tipo: "debito", planPagoId: { $ne: null } } },
    { $lookup: { from: "pagos", localField: "_id", foreignField: "cargo", as: "pagos" } },
    { $lookup: { from: "planpagos", localField: "planPagoId", foreignField: "_id", as: "plan" } },
    { $unwind: "$plan" },
    {
      $project: {
        _id: 1, periodo: 1, concepto: 1,
        importe: { $ifNull: ["$importe", 0] },
        pagado: { $sum: { $map: { input: { $ifNull: ["$pagos", []] }, as: "p", in: { $ifNull: ["$$p.importe", 0] } } } },
        cuotaN: { $ifNull: ["$cuotaN", null] },
        cuotasTotal: { $ifNull: ["$plan.cuotasCantidad", null] },
      },
    },
    { $addFields: { saldo: { $subtract: ["$importe", "$pagado"] }, tipo: "debito" } },
    { $match: { saldo: { $gt: 0 } } },
  ];

  const rows = await MovimientoProveedor.aggregate([
    ...pipelineCargos,
    { $unionWith: { coll: "movimientoproveedors", pipeline: pipelineCuotas } },
    { $sort: { periodo: 1, _id: 1 } },
  ]);

  return rows.map((r) => ({
    _id: r._id, periodo: r.periodo, concepto: r.concepto, tipo: r.tipo,
    cuotaN: r.cuotaN ?? null, cuotasTotal: r.cuotasTotal ?? null,
    importe: Number(r.importe ?? 0), pagado: Number(r.pagado ?? 0), saldo: Number(r.saldo ?? 0),
  }));
}
