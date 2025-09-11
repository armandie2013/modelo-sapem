import Proveedor from "../models/proveedor.mjs";
import Plan from "../models/plan.mjs";
import MovimientoProveedor from "../models/movimientoProveedor.mjs";

function periodoYYYYMM(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function generarCargosMensuales(fechaRef = new Date()) {
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

// útil al iniciar el server por si se “perdió” el 28
export async function catchUpCargos(mesesAtras = 1) {
  const base = new Date();
  for (let i = mesesAtras; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    await generarCargosMensuales(d);
  }
}