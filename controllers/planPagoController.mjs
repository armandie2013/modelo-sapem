// controllers/planPagoController.mjs
import mongoose from "mongoose";
import Proveedor from "../models/proveedor.mjs";
import MovimientoProveedor from "../models/movimientoProveedor.mjs";
import Pago from "../models/pago.mjs";
import PlanPago from "../models/planPago.mjs";
import clock from "../utils/clock.mjs";
import { addMonthsYM, cents, fromCents } from "../utils/moneyAndDates.mjs";

/* =========================================================
 * Helpers
 * =======================================================*/

/**
 * Lista movimientos ELEGIBLES (cargo/debito, sin planPago, y sin pagos/creditos aplicados)
 * y también devuelve los BLOQUEADOS (porque tienen algo aplicado o no matchean).
 */
async function listarElegiblesSinParciales(proveedorId) {
  // 1) Candidatos base
  const movs = await MovimientoProveedor.find({
    proveedor: proveedorId,
    tipo: { $in: ["cargo", "debito"] },
    planPagoId: null,          // aún no fueron usados en otro plan
  })
    .select("_id tipo concepto periodo fecha importe")
    .sort({ fecha: 1, _id: 1 })
    .lean();

  if (!movs.length) {
    return { elegibles: [], bloqueados: [] };
  }

  const movIds = movs.map(m => m._id);

  // 2) Créditos aplicados explícitamente a esos movimientos (reversas / NC con aplicaA)
  const creditosAgg = await MovimientoProveedor.aggregate([
    { $match: { tipo: "credito", aplicaA: { $in: movIds } } },
    { $group: { _id: "$aplicaA", total: { $sum: "$importe" } } },
  ]);

  // 3) Pagos aplicados (Pago.aplicaciones[]) a esos movimientos
  const pagosAgg = await Pago.aggregate([
    { $match: { proveedor: new mongoose.Types.ObjectId(proveedorId), "aplicaciones.movimiento": { $in: movIds } } },
    { $unwind: "$aplicaciones" },
    { $match: { "aplicaciones.movimiento": { $in: movIds } } },
    { $group: { _id: "$aplicaciones.movimiento", total: { $sum: "$aplicaciones.importe" } } },
  ]);

  const mapaCred = new Map(creditosAgg.map(r => [String(r._id), Number(r.total || 0)]));
  const mapaPag  = new Map(pagosAgg.map(r  => [String(r._id), Number(r.total || 0)]));

  const elegibles = [];
  const bloqueados = [];

  for (const m of movs) {
    const aplicado = (mapaCred.get(String(m._id)) || 0) + (mapaPag.get(String(m._id)) || 0);
    if (aplicado === 0) {
      elegibles.push(m); // “completo”, perfecto para plan
    } else {
      // informar por qué no entra (parcial o totalmente aplicado)
      const motivo = aplicado >= Number(m.importe)
        ? "Totalmente aplicado (ya cubierto)"
        : "Parcialmente aplicado (pago/NC parcial)";
      bloqueados.push({ ...m, motivo, aplicado });
    }
  }

  return { elegibles, bloqueados };
}

/* Utilidades para fechas sugeridas en el formulario (evita depender de todayYM/YMD) */
function hoyYMDLocal(d = clock.date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function hoyYMLocal(d = clock.date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/* =========================================================
 * GET Formulario crear plan de pago
 * =======================================================*/
export async function mostrarFormularioPlanPago(req, res) {
  const { proveedorId } = req.params;

  const proveedor = await Proveedor.findById(proveedorId)
    .select("numeroProveedor nombreFantasia nombreReal cuit condicionIva telefonoCelular activo plan precioPlan")
    .populate("plan", "nombre importe")
    .lean();

  if (!proveedor) return res.status(404).send("Proveedor no encontrado");

  const { elegibles, bloqueados } = await listarElegiblesSinParciales(proveedorId);

  res.render("proveedoresViews/planPago/crearPlanPago", {
    proveedor,
    movimientosElegibles: elegibles,
    movimientosBloqueados: bloqueados,     // opcional para mostrar “no elegibles”
    cuotasPreset: [3, 6, 9, 12],
    primerPeriodoSugerido: hoyYMLocal(),
    hoy: hoyYMDLocal(),
    pagosSinImputar: 0,                    // Puedes quitar este campo de la vista si ya no lo usás
  });
}

/* =========================================================
 * POST Crear plan de pago
 *  - Sólo acepta movimientos COMPLETOS (sin pagos/NC aplicados)
 *  - Reversa total de cada movimiento elegido (crédito aplicaA)
 *  - Genera N cuotas (cargos futuros), última ajusta por redondeo
 * =======================================================*/
export async function crearPlanPagoController(req, res) {
  const { proveedorId } = req.params;

  // Soportamos name="seleccionIds" o name="movimientos" en el form
  let { seleccionIds = [], movimientos = [], cuotas = 3, primerPeriodo } = req.body;

  // Normalización de selección
  const rawIds = []
    .concat(Array.isArray(seleccionIds) ? seleccionIds : (seleccionIds ? [seleccionIds] : []))
    .concat(Array.isArray(movimientos) ? movimientos : (movimientos ? [movimientos] : []));
  const ids = [...new Set(rawIds.filter(Boolean).map(String))];

  const cuotasInt = Number(cuotas);
  if (![3, 6, 9, 12].includes(cuotasInt)) {
    return res.status(400).send("Cantidad de cuotas inválida (use 3, 6, 9 o 12).");
  }
  if (!primerPeriodo || !/^\d{4}-(0[1-9]|1[0-2])$/.test(primerPeriodo)) {
    return res.status(400).send("Primer período inválido (formato YYYY-MM).");
  }
  if (ids.length === 0) {
    return res.status(400).send("Seleccioná al menos un comprobante elegible.");
  }

  // Recalcular ELEGIBLES en el servidor (antitampering)
  const { elegibles } = await listarElegiblesSinParciales(proveedorId);
  const elegiblesById = new Map(elegibles.map(e => [String(e._id), e]));

  // Todos los seleccionados deben estar en elegibles
  const seleccion = [];
  for (const id of ids) {
    const m = elegiblesById.get(String(id));
    if (!m) {
      return res.status(400).send("La selección contiene comprobantes no elegibles (parciales o ya aplicados).");
    }
    seleccion.push(m);
  }

  // Total del plan = suma de importes completos
  const totalCents = seleccion.reduce((acc, m) => acc + cents(m.importe), 0);
  if (totalCents <= 0) {
    return res.status(400).send("Total seleccionado inválido.");
  }

  // Cálculo de cuotas
  const cuotaBaseCents = Math.floor(totalCents / cuotasInt);
  const resto = totalCents - cuotaBaseCents * cuotasInt;

  try {
    // 1) Crear PlanPago
    const plan = await PlanPago.create({
      proveedor: proveedorId,
      fecha: clock.date(),
      primerPeriodo,
      cuotasCantidad: cuotasInt,
      totalOriginal: fromCents(totalCents),
      totalPlan: fromCents(totalCents),    // sin interés
      importeCuota: fromCents(cuotaBaseCents),
      seleccion: seleccion.map(m => ({ movimientoId: m._id, importe: Number(m.importe) })),
      creadoPor: req.usuario?._id || null,
    });

    // 2) Reversas (créditos) 1:1 para cada movimiento seleccionado
    const creditos = seleccion.map(m => ({
      proveedor: proveedorId,
      tipo: "credito",
      concepto: `Reversa por Plan de pago #${plan._id} (comprobante ${m.tipo} ${m.periodo})`,
      periodo: m.periodo,
      fecha: clock.date(),
      importe: Number(m.importe),
      planPagoId: plan._id,
      aplicaA: m._id,
      creadoPor: req.usuario?._id || null,
    }));
    await MovimientoProveedor.insertMany(creditos);

    // 3) Cargos de cuotas futuras
    const cargos = [];
    for (let i = 1; i <= cuotasInt; i++) {
      const importeCents = i === cuotasInt ? (cuotaBaseCents + resto) : cuotaBaseCents;
      cargos.push({
        proveedor: proveedorId,
        tipo: "cargo",
        concepto: `Plan de pago #${plan._id} — cuota ${i}/${cuotasInt}`,
        periodo: addMonthsYM(primerPeriodo, i - 1),
        fecha: clock.date(),
        importe: fromCents(importeCents),
        planPagoId: plan._id,
        cuotaN: i,
        creadoPor: req.usuario?._id || null,
      });
    }
    await MovimientoProveedor.insertMany(cargos);

    req.session.mensaje = `Plan de pago creado (${cuotasInt} cuotas)`;
    return res.redirect(`/proveedores/${proveedorId}/ver`);
  } catch (e) {
    console.error("Error al crear plan de pago:", e);
    return res.status(500).send("Error al crear plan de pago");
  }
}

/* =========================================================
 * ¡OJO!
 * Eliminamos la imputación FIFO/Transacciones para evitar el error
 * "Transaction numbers are only allowed on a replica set..."
 * No exportamos ningún controller de FIFO.
 * =======================================================*/
