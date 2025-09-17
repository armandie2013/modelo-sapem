// controllers/planPagoController.mjs
import mongoose from "mongoose";
import Proveedor from "../models/proveedor.mjs";
import MovimientoProveedor from "../models/movimientoProveedor.mjs";
import Pago from "../models/pago.mjs";
import PlanPago from "../models/planPago.mjs";
import clock from "../utils/clock.mjs";
import { addMonthsYM, cents, fromCents } from "../utils/moneyAndDates.mjs";
import puppeteer from "puppeteer";

/* =========================================================
 * Helpers
 * =======================================================*/

/** YYYY-MM del mes siguiente respecto de clock.date() */
function nextMonthYM(d = clock.date()) {
  const y = d.getFullYear();
  const m = d.getMonth() + 2; // +1 base 1..12 y +1 siguiente
  const yy = y + Math.floor((m - 1) / 12);
  const mm = String(((m - 1) % 12) + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

/**
 * Lista movimientos ELEGIBLES (cargo/debito, sin planPago, sin pagos/creditos aplicados
 * y NO bloqueados para pago) y también devuelve los BLOQUEADOS.
 */
async function listarElegiblesSinParciales(proveedorId) {
  const oid = new mongoose.Types.ObjectId(proveedorId);

  // 1) Candidatos base: cargos / débitos sin plan y no bloqueados
  const movs = await MovimientoProveedor.find({
    proveedor: oid,
    tipo: { $in: ["cargo", "debito"] },
    planPagoId: null,
    bloqueadoParaPago: { $ne: true },
  })
    .select("_id tipo concepto periodo fecha importe")
    .sort({ fecha: 1, _id: 1 })
    .lean();

  if (!movs.length) return { elegibles: [], bloqueados: [] };

  const movIds = movs.map((m) => m._id);

  // 2) Créditos aplicados a esos movimientos
  const creditosAgg = await MovimientoProveedor.aggregate([
    { $match: { tipo: "credito", aplicaA: { $in: movIds } } },
    { $group: { _id: "$aplicaA", total: { $sum: "$importe" } } },
  ]);

  // 3a) Pagos actuales: vínculo directo por 'cargo'
  const pagosPorCargo = await Pago.aggregate([
    { $match: { proveedor: oid, cargo: { $in: movIds } } },
    { $group: { _id: "$cargo", total: { $sum: "$importe" } } },
  ]);

  // 3b) Pagos legacy: 'aplicaciones.movimiento'
  const pagosPorAplicaciones = await Pago.aggregate([
    { $match: { proveedor: oid, "aplicaciones.movimiento": { $in: movIds } } },
    { $unwind: "$aplicaciones" },
    { $match: { "aplicaciones.movimiento": { $in: movIds } } },
    { $group: { _id: "$aplicaciones.movimiento", total: { $sum: "$aplicaciones.importe" } } },
  ]);

  // Mapas de importes aplicados
  const mapaCred = new Map(creditosAgg.map((r) => [String(r._id), Number(r.total || 0)]));
  const mapaPag = new Map();
  for (const r of pagosPorCargo)
    mapaPag.set(String(r._id), (mapaPag.get(String(r._id)) || 0) + Number(r.total || 0));
  for (const r of pagosPorAplicaciones)
    mapaPag.set(String(r._id), (mapaPag.get(String(r._id)) || 0) + Number(r.total || 0));

  // 4) Clasificar
  const elegibles = [];
  const bloqueados = [];
  for (const m of movs) {
    const aplicado = (mapaCred.get(String(m._id)) || 0) + (mapaPag.get(String(m._id)) || 0);
    if (aplicado === 0) {
      elegibles.push(m);
    } else {
      const motivo =
        aplicado >= Number(m.importe)
          ? "Totalmente aplicado (ya cubierto)"
          : "Parcialmente aplicado (pago/NC parcial)";
      bloqueados.push({ ...m, motivo, aplicado: Number(aplicado) });
    }
  }

  return { elegibles, bloqueados };
}

/* Utilidades para fechas sugeridas en el formulario */
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
    .select(
      "numeroProveedor nombreFantasia nombreReal cuit condicionIva telefonoCelular activo plan precioPlan"
    )
    .populate("plan", "nombre importe")
    .lean();

  if (!proveedor) return res.status(404).send("Proveedor no encontrado");

  const { elegibles, bloqueados } = await listarElegiblesSinParciales(proveedorId);

  // último plan (para botón Ver/PDF)
  const ultimoPlan = await PlanPago.findOne({ proveedor: proveedorId })
    .sort({ fecha: -1, _id: -1 })
    .select("_id cuotasCantidad primerPeriodo fecha totalPlan")
    .lean();

  res.render("proveedoresViews/planPago/crearPlanPago", {
    proveedor,
    movimientosElegibles: elegibles,
    movimientosBloqueados: bloqueados,
    cuotasPreset: [3, 6, 9, 12],
    primerPeriodoSugerido: nextMonthYM(),
    hoy: hoyYMDLocal(),
    pagosSinImputar: 0,
    ultimoPlan,
  });
}

/* =========================================================
 * POST Crear plan de pago
 * =======================================================*/
export async function crearPlanPagoController(req, res) {
  const { proveedorId } = req.params;

  let { seleccionIds = [], movimientos = [], cuotas = 3, primerPeriodo } = req.body;

  // Normalización de selección
  const rawIds = []
    .concat(Array.isArray(seleccionIds) ? seleccionIds : seleccionIds ? [seleccionIds] : [])
    .concat(Array.isArray(movimientos) ? movimientos : movimientos ? [movimientos] : []);
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

  const { elegibles } = await listarElegiblesSinParciales(proveedorId);
  const elegiblesById = new Map(elegibles.map((e) => [String(e._id), e]));

  const seleccion = [];
  for (const id of ids) {
    const m = elegiblesById.get(String(id));
    if (!m) {
      return res
        .status(400)
        .send("La selección contiene comprobantes no elegibles (parciales, ya aplicados o bloqueados).");
    }
    seleccion.push(m);
  }

  const totalCents = seleccion.reduce((acc, m) => acc + cents(m.importe), 0);
  if (totalCents <= 0) return res.status(400).send("Total seleccionado inválido.");

  const cuotaBaseCents = Math.floor(totalCents / cuotasInt);
  const resto = totalCents - cuotaBaseCents * cuotasInt;

  try {
    const plan = await PlanPago.create({
      proveedor: proveedorId,
      fecha: clock.date(),
      primerPeriodo,
      cuotasCantidad: cuotasInt,
      totalOriginal: fromCents(totalCents),
      totalPlan: fromCents(totalCents), // sin interés
      importeCuota: fromCents(cuotaBaseCents),
      seleccion: seleccion.map((m) => ({ movimientoId: m._id, importe: Number(m.importe) })),
      creadoPor: req.usuario?._id || null,
    });

    // Marcar originales como parte del plan y NO pagables
    await MovimientoProveedor.updateMany(
      { _id: { $in: seleccion.map((m) => m._id) } },
      { $set: { planPagoId: plan._id, bloqueadoParaPago: true } }
    );

    // Reversas (créditos)
    const creditos = seleccion.map((m) => ({
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

    // Débitos (cuotas)
    const cargos = [];
    for (let i = 1; i <= cuotasInt; i++) {
      const importeCents = i === cuotasInt ? cuotaBaseCents + resto : cuotaBaseCents;
      cargos.push({
        proveedor: proveedorId,
        tipo: "debito",
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
 * VER / IMPRIMIR PLAN (HTML + PDF)
 * =======================================================*/
export async function verPlanPagoController(req, res) {
  const { planId } = req.params;

  const planDb = await PlanPago.findById(planId)
    .populate("proveedor", "numeroProveedor nombreFantasia nombreReal cuit condicionIva telefonoCelular")
    .lean();
  if (!planDb) return res.status(404).send("Plan de pago no encontrado");

  // Cuotas (débito) del plan
  const cuotas = await MovimientoProveedor.find({ planPagoId: planDb._id, tipo: "debito" })
    .select("cuotaN periodo importe")
    .sort({ cuotaN: 1, periodo: 1 })
    .lean();

  // Reconstrucción de totales/fechas/periodo si faltan
  let fechaPlan =
    planDb.fecha ? new Date(planDb.fecha) : (planDb.createdAt ? new Date(planDb.createdAt) : clock.date());
  let primerPeriodoMostrar = planDb.primerPeriodo || (cuotas[0]?.periodo) || nextMonthYM(fechaPlan);

  // Comprobantes incluidos: preferimos selección → fallback por créditos.aplicaA
  let movimientosOriginales = [];
  const idsSel = (planDb.seleccion || []).map(s => s.movimientoId).filter(Boolean);
  if (idsSel.length) {
    movimientosOriginales = await MovimientoProveedor.find({ _id: { $in: idsSel } })
      .select("tipo concepto periodo importe")
      .lean();
  }
  if (movimientosOriginales.length === 0) {
    const creditos = await MovimientoProveedor.find({
      planPagoId: planDb._id,
      tipo: "credito",
      aplicaA: { $ne: null }
    }).select("aplicaA").lean();
    const origIds = creditos.map(c => c.aplicaA).filter(Boolean);
    if (origIds.length) {
      movimientosOriginales = await MovimientoProveedor.find({ _id: { $in: origIds } })
        .select("tipo concepto periodo importe")
        .lean();
    }
  }

  // Total del plan: preferimos planDb.totalPlan → fallback sum(cuotas) → sum(selección)
  let totalPlan = Number(planDb.totalPlan || 0);
  if (!totalPlan) {
    if (cuotas.length) {
      totalPlan = cuotas.reduce((a, c) => a + Number(c.importe || 0), 0);
    } else if (planDb.seleccion?.length) {
      totalPlan = planDb.seleccion.reduce((a, s) => a + Number(s.importe || 0), 0);
    }
  }

  // Inyecto valores “normalizados” al objeto plan para que la vista funcione sin tocarla mucho
  const plan = {
    ...planDb,
    fecha: fechaPlan,                // evitar Invalid Date
    primerPeriodo: primerPeriodoMostrar,
    totalPlan,
  };

  res.render("proveedoresViews/planPago/planPagoImprimir", {
    plan,
    proveedor: plan.proveedor,
    movimientosOriginales,
    cuotas,
    hoy: new Date()
  });
}

export async function descargarPlanPagoPdfController(req, res) {
  const { planId } = req.params;

  const planDb = await PlanPago.findById(planId)
    .populate("proveedor", "numeroProveedor nombreFantasia nombreReal cuit condicionIva telefonoCelular")
    .lean();
  if (!planDb) return res.status(404).send("Plan de pago no encontrado");

  const cuotas = await MovimientoProveedor.find({ planPagoId: planDb._id, tipo: "debito" })
    .select("cuotaN periodo importe")
    .sort({ cuotaN: 1, periodo: 1 })
    .lean();

  let fechaPlan =
    planDb.fecha ? new Date(planDb.fecha) : (planDb.createdAt ? new Date(planDb.createdAt) : clock.date());
  let primerPeriodoMostrar = planDb.primerPeriodo || (cuotas[0]?.periodo) || nextMonthYM(fechaPlan);

  let movimientosOriginales = [];
  const idsSel = (planDb.seleccion || []).map(s => s.movimientoId).filter(Boolean);
  if (idsSel.length) {
    movimientosOriginales = await MovimientoProveedor.find({ _id: { $in: idsSel } })
      .select("tipo concepto periodo importe")
      .lean();
  }
  if (movimientosOriginales.length === 0) {
    const creditos = await MovimientoProveedor.find({
      planPagoId: planDb._id,
      tipo: "credito",
      aplicaA: { $ne: null }
    }).select("aplicaA").lean();
    const origIds = creditos.map(c => c.aplicaA).filter(Boolean);
    if (origIds.length) {
      movimientosOriginales = await MovimientoProveedor.find({ _id: { $in: origIds } })
        .select("tipo concepto periodo importe")
        .lean();
    }
  }

  let totalPlan = Number(planDb.totalPlan || 0);
  if (!totalPlan) {
    if (cuotas.length) {
      totalPlan = cuotas.reduce((a, c) => a + Number(c.importe || 0), 0);
    } else if (planDb.seleccion?.length) {
      totalPlan = planDb.seleccion.reduce((a, s) => a + Number(s.importe || 0), 0);
    }
  }

  const plan = {
    ...planDb,
    fecha: fechaPlan,
    primerPeriodo: primerPeriodoMostrar,
    totalPlan,
  };

  // Render vista a HTML string
  const html = await new Promise((resolve, reject) => {
    res.render(
      "proveedoresViews/planPago/planPagoImprimir",
      { plan, proveedor: plan.proveedor, movimientosOriginales, cuotas, hoy: new Date(), layout: false },
      (err, str) => (err ? reject(err) : resolve(str))
    );
  });

  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", right: "14mm", bottom: "18mm", left: "14mm" }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="PlanPago-${plan._id.toString()}.pdf"`
    );
    res.send(pdf);
  } finally {
    await browser.close();
  }
}
