// services/cargosService.mjs
import Proveedor from "../models/proveedor.mjs";
import Plan from "../models/plan.mjs";
import MovimientoProveedor from "../models/movimientoProveedor.mjs";
import clock from "../utils/clock.mjs";

function periodoYYYYMM(d = clock.date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function generarCargosMensuales(fechaRef = clock.date()) {
  const periodo = periodoYYYYMM(fechaRef);

  // proveedores ACTIVO + con plan asignado
  const proveedores = await Proveedor.find({ activo: { $ne: false }, plan: { $ne: null } })
    .populate("plan", "nombre importe activo");

  let creados = 0, existentes = 0, errores = 0;

  for (const p of proveedores) {
    try {
      if (!p.plan || p.plan.activo === false) continue;

      const concepto = `Cargo mensual plan ${p.plan.nombre} ${periodo}`;
      const res = await MovimientoProveedor.updateOne(
        { proveedor: p._id, periodo, tipo: "cargo" },
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
          },
        },
        { upsert: true }
      );

      if (res.upsertedCount === 1) creados++;
      else existentes++;
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

// Buscar cargo puntual
export async function buscarCargoPorPeriodo(proveedorId, periodo) {
  return MovimientoProveedor.findOne({
    proveedor: proveedorId,
    tipo: "cargo",
    periodo: String(periodo),
  }).lean();
}

// listado de cargos con saldo > 0 (para el select de períodos)
export async function cargosPendientesPorProveedor(proveedorId) {
  // Usamos aggregation con lookup a pagos para calcular saldo
  const pipeline = [
    { $match: { proveedor: new (await import("mongoose")).default.Types.ObjectId(proveedorId), tipo: "cargo" } },
    { $sort: { periodo: 1 } },
    {
      $lookup: {
        from: "pagos",
        localField: "_id",
        foreignField: "cargo",
        as: "pagos",
      }
    },
    {
      $project: {
        periodo: 1,
        concepto: 1,
        importe: 1,
        pagado: { $sum: "$pagos.importe" },
      }
    },
    {
      $addFields: {
        saldo: { $subtract: ["$importe", { $ifNull: ["$pagado", 0] }] }
      }
    },
    { $match: { saldo: { $gt: 0 } } }
  ];

  const rows = await MovimientoProveedor.aggregate(pipeline);
  return rows.map(c => ({
    _id: c._id,
    periodo: c.periodo,
    concepto: c.concepto,
    importe: c.importe || 0,
    pagado: c.pagado || 0,
    saldo: c.saldo || 0,
  }));
}
