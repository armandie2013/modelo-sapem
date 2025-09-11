// services/cargosService.mjs
import mongoose from "mongoose";
import Proveedor from "../models/proveedor.mjs";
import Pago from "../models/pago.mjs";
import MovimientoProveedor from "../models/movimientoProveedor.mjs";

function periodoYYYYMM(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function generarCargosMensuales(fechaRef = new Date()) {
  const periodo = periodoYYYYMM(fechaRef);

  // Proveedores activos con plan
  const proveedores = await Proveedor.find({
    activo: { $ne: false },
    plan: { $ne: null }
  }).populate("plan", "nombre importe activo");

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
            fecha: new Date(),
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

// Por si se “salteó” algún mes
export async function catchUpCargos(mesesAtras = 1) {
  const base = new Date();
  for (let i = mesesAtras; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    await generarCargosMensuales(d);
  }
}

export async function buscarCargoPorPeriodo(proveedorId, periodo) {
  return MovimientoProveedor.findOne({
    proveedor: new mongoose.Types.ObjectId(proveedorId),
    tipo: "cargo",
    periodo: String(periodo),
  }).lean();
}

// Cargos con saldo > 0 (para el select de períodos)
export async function cargosPendientesPorProveedor(proveedorId) {
  const provId = new mongoose.Types.ObjectId(proveedorId);

  const cargos = await MovimientoProveedor.find({
    proveedor: provId,
    tipo: "cargo",
  }).sort({ periodo: 1 }).lean();

  if (!cargos.length) return [];

  // Pagos imputados a cargos de este proveedor
  const pagos = await Pago.aggregate([
    { $match: { proveedor: provId, cargo: { $ne: null } } },
    { $group: { _id: "$cargo", total: { $sum: "$importe" } } }
  ]);

  const pagadoPorCargo = new Map(pagos.map(p => [String(p._id), p.total || 0]));

  return cargos
    .map(c => {
      const pagado = pagadoPorCargo.get(String(c._id)) || 0;
      const saldo  = (c.importe || 0) - pagado;
      return {
        _id: c._id,
        periodo: c.periodo,
        concepto: c.concepto,
        importe: c.importe || 0,
        pagado,
        saldo,
        createdAt: c.createdAt,
      };
    })
    .filter(x => x.saldo > 0);
}