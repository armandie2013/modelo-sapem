// services/cargosService.mjs
import mongoose from "mongoose";
import MovimientoProveedor from "../models/movimientoProveedor.mjs";
import clock from "../utils/clock.mjs";

function periodoYYYYMM(d = clock.date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// --- Cargos mensuales (idempotente, sin tocar índices) ---
export async function generarCargosMensuales(fechaRef = clock.date()) {
  const periodo = periodoYYYYMM(fechaRef);
  const Proveedor = (await import("../models/proveedor.mjs")).default;

  const proveedores = await Proveedor.find({
    activo: { $ne: false },
    plan: { $ne: null },
  }).populate("plan", "nombre importe activo");

  let creados = 0,
    existentes = 0,
    errores = 0;

  for (const p of proveedores) {
    try {
      if (!p.plan || p.plan.activo === false) continue;

      const filtro = { proveedor: p._id, periodo, tipo: "cargo" };
      const concepto = `Cargo mensual plan ${p.plan.nombre} ${periodo}`;

      // Upsert atómico; si se corre en paralelo puede chocar el índice único.
      // Si eso pasa (code 11000), lo contamos como "existente" y seguimos.
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
        if (res.upsertedCount === 1) creados++;
        else existentes++;
      } catch (e) {
        if (e && e.code === 11000) {
          // Otro proceso lo insertó entre chequeo y upsert
          existentes++;
        } else {
          throw e;
        }
      }
    } catch (e) {
      console.error("Error generando cargo:", p._id, e);
      errores++;
    }
  }

  return { periodo, creados, existentes, errores };
}

// útil al iniciar el server por si se “perdió” el 28
export async function catchUpCargos(mesesAtras = 1) {
  const base = clock.date();
  for (let i = mesesAtras; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    await generarCargosMensuales(d);
  }
}

// Busca primero CUOTA de plan en ese período; si no hay, vuelve a cargo “suelto”
export async function buscarCargoPorPeriodo(proveedorId, periodo) {
  const oid = new mongoose.Types.ObjectId(proveedorId);

  // 1) ¿Hay cuota (debito) de plan en ese período?
  const cuota = await MovimientoProveedor.findOne({
    proveedor: oid,
    tipo: "debito",
    periodo: String(periodo),
    planPagoId: { $ne: null },
  }).lean();

  if (cuota) return cuota;

  // 2) Si no, un cargo normal del período (que NO esté marcado por plan)
  return MovimientoProveedor.findOne({
    proveedor: oid,
    tipo: "cargo",
    periodo: String(periodo),
    planPagoId: null,
  }).lean();
}

/**
 * Devuelve “pendientes” para el combo de pagos:
 * - CARGOS normales (planPagoId:null) con saldo >0
 * - CUOTAS de plan (tipo:debito, planPagoId!=null) con saldo >0
 * Asegura NUMEROS para importe/pagado/saldo (evita NaN en vistas).
 */
export async function cargosPendientesPorProveedor(proveedorId) {
  const oid = new mongoose.Types.ObjectId(proveedorId);

  // CARGOS normales
  const pipelineCargos = [
    { $match: { proveedor: oid, tipo: "cargo", planPagoId: null } },
    {
      $lookup: {
        from: "pagos",
        localField: "_id",
        foreignField: "cargo",
        as: "pagos",
      },
    },
    {
      $project: {
        _id: 1,
        periodo: 1,
        concepto: 1,
        importe: { $ifNull: ["$importe", 0] },
        pagado: {
          $sum: {
            $map: {
              input: { $ifNull: ["$pagos", []] },
              as: "p",
              in: { $ifNull: ["$$p.importe", 0] },
            },
          },
        },
      },
    },
    {
      $addFields: {
        saldo: { $subtract: ["$importe", "$pagado"] },
        tipo: "cargo",
        cuotaN: null,
        cuotasTotal: null,
      },
    },
    { $match: { saldo: { $gt: 0 } } },
  ];

  // CUOTAS de plan (debito)
  const pipelineCuotas = [
    { $match: { proveedor: oid, tipo: "debito", planPagoId: { $ne: null } } },
    {
      $lookup: {
        from: "pagos",
        localField: "_id",
        foreignField: "cargo",
        as: "pagos",
      },
    },
    {
      $lookup: {
        from: "planpagos",
        localField: "planPagoId",
        foreignField: "_id",
        as: "plan",
      },
    },
    { $unwind: "$plan" },
    {
      $project: {
        _id: 1,
        periodo: 1,
        concepto: 1,
        importe: { $ifNull: ["$importe", 0] },
        pagado: {
          $sum: {
            $map: {
              input: { $ifNull: ["$pagos", []] },
              as: "p",
              in: { $ifNull: ["$$p.importe", 0] },
            },
          },
        },
        cuotaN: { $ifNull: ["$cuotaN", null] },
        cuotasTotal: { $ifNull: ["$plan.cuotasCantidad", null] },
      },
    },
    {
      $addFields: {
        saldo: { $subtract: ["$importe", "$pagado"] },
        tipo: "debito",
      },
    },
    { $match: { saldo: { $gt: 0 } } },
  ];

  // Unimos ambas: cargos + cuotas
  const rows = await MovimientoProveedor.aggregate([
    ...pipelineCargos,
    { $unionWith: { coll: "movimientoproveedors", pipeline: pipelineCuotas } },
    { $sort: { periodo: 1, _id: 1 } },
  ]);

  // Normalizamos a NUMBER siempre
  return rows.map((r) => ({
    _id: r._id,
    periodo: r.periodo,
    concepto: r.concepto,
    tipo: r.tipo, // 'cargo' o 'debito'
    cuotaN: r.cuotaN ?? null,
    cuotasTotal: r.cuotasTotal ?? null,
    importe: Number(r.importe ?? 0),
    pagado: Number(r.pagado ?? 0),
    saldo: Number(r.saldo ?? 0),
  }));
}
