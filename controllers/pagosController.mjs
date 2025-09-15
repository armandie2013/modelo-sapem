// controllers/pagosController.mjs
import { crearPagoService, listarPagosService, eliminarPagoService } from "../services/pagosService.mjs";
import Proveedor from "../models/proveedor.mjs";
import Pago from "../models/pago.mjs";
import { convertirAFloat } from "../utils/convertirAFloat.mjs";
import { cargosPendientesPorProveedor, buscarCargoPorPeriodo } from "../services/cargosService.mjs";
import clock from "../utils/clock.mjs";

const PERIODO_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function normalizarMedioPago(v) {
  const val = (v || "").toString().trim().toLowerCase();
  const allowed = new Set(["transferencia","efectivo","cheque","deposito","otro"]);
  return allowed.has(val) ? val : null;
}

function buildFechaFromInput(fechaStr) {
  // Mantiene el día elegido; usa hora/min/seg actuales del reloj central
  // Si no viene fecha, usa clock.date()
  return clock.dateFromLocalYMD(fechaStr, clock.date());
}

// GET /pagos/registrar (genérico)
export async function mostrarFormularioPago(req, res) {
  const proveedores = await Proveedor.find({}, "numeroProveedor nombreFantasia nombreReal")
    .sort({ numeroProveedor: 1 })
    .lean();

  const datos = {
    proveedor: req.query.proveedor || "",
    periodo: "",
    fecha: new Date().toISOString().slice(0, 10),
    medioPago: "transferencia",
    comprobante: "",
    detalle: "",
    importe: ""
  };

  res.render("pagosViews/registrarPago", { proveedores, proveedor: null, cargosPendientes: null, datos, errores: [] });
}

// POST /pagos/registrar (genérico)
export async function crearPagoController(req, res) {
  const proveedor = req.body.proveedor;
  const periodo = req.body.periodo;
  const metodo = normalizarMedioPago(req.body.metodo || req.body.medioPago);
  const comprobante = req.body.comprobante || "";
  const observacion = req.body.observacion || req.body.detalle || "";

  const errores = [];
  const importeNumber = convertirAFloat(req.body.importe);

  if (!proveedor) errores.push({ msg: "Seleccioná un proveedor." });
  if (!PERIODO_RE.test(String(periodo || ""))) errores.push({ msg: "Seleccioná un período válido (YYYY-MM)." });
  if (!Number.isFinite(importeNumber) || importeNumber <= 0) errores.push({ msg: "El importe debe ser mayor a 0." });
  if (!metodo) errores.push({ msg: "Seleccioná un medio de pago válido." });

  const cargo = (!errores.length && periodo) ? await buscarCargoPorPeriodo(proveedor, periodo) : null;
  if (!cargo && !errores.length) errores.push({ msg: "No existe un cargo para el período seleccionado." });

  let fechaDate = buildFechaFromInput(req.body.fecha);
  if (isNaN(fechaDate.getTime())) errores.push({ msg: "La fecha no es válida." });

  if (errores.length) {
    const proveedores = await Proveedor.find({}, "numeroProveedor nombreFantasia nombreReal")
      .sort({ numeroProveedor: 1 })
      .lean();
    return res.status(400).render("pagosViews/registrarPago", {
      proveedores,
      proveedor: null,
      cargosPendientes: null,
      datos: { ...req.body, medioPago: metodo || (req.body.medioPago || "") },
      errores,
    });
  }

  await new Pago({
    proveedor,
    cargo: cargo._id,
    periodo: String(periodo),
    fecha: fechaDate,
    importe: importeNumber,
    metodo,
    comprobante,
    observacion,
    creadoPor: req.session?.usuario?._id || null,
  }).save();

  req.session.mensaje = "Pago registrado correctamente";
  res.redirect("/pagos");
}

// GET /pagos (listado con filtros)
export async function listarPagosController(req, res) {
  const { proveedor, desde, hasta } = req.query;
  const pagos = await listarPagosService({ proveedor, desde, hasta });
  const proveedores = await Proveedor.find({}, "numeroProveedor nombreFantasia").sort({ numeroProveedor: 1 }).lean();
  res.render("pagosViews/listadoPagos", { pagos, proveedores, filtros: { proveedor, desde, hasta } });
}

// POST /pagos/:id/eliminar
export async function eliminarPagoController(req, res) {
  await eliminarPagoService(req.params.id);
  req.session.mensaje = "Pago eliminado";
  res.redirect("/pagos");
}

// ---------- flujo anidado por proveedor ----------

// GET /pagos/proveedores/:proveedorId/registrar
export async function mostrarFormularioPagoProveedor(req, res) {
  const { proveedorId } = req.params;
  const proveedor = await Proveedor.findById(proveedorId, "nombreFantasia nombreReal cuit").lean();
  if (!proveedor) return res.status(404).send("Proveedor no encontrado");

  const cargosPendientes = await cargosPendientesPorProveedor(proveedorId);

  const datos = {
    fecha: new Date().toISOString().slice(0, 10),
    periodo: "",
    medioPago: "transferencia",
    comprobante: "",
    detalle: "",
    importe: ""
  };

  res.render("pagosViews/registrarPago", {
    proveedor, proveedores: null,
    cargosPendientes,
    datos, errores: []
  });
}

// POST /pagos/proveedores/:proveedorId/registrar
export async function crearPagoProveedorController(req, res) {
  const { proveedorId } = req.params;
  const proveedor = await Proveedor.findById(proveedorId, "nombreFantasia nombreReal").lean();
  if (!proveedor) return res.status(404).send("Proveedor no encontrado");

  const { periodo, comprobante = "", detalle = "" } = req.body;
  const metodo = normalizarMedioPago(req.body.medioPago);
  const errores = [];

  if (!PERIODO_RE.test(String(periodo || ""))) errores.push({ msg: "Seleccioná un período válido (YYYY-MM)." });

  const cargo = (!errores.length && periodo) ? await buscarCargoPorPeriodo(proveedorId, periodo) : null;
  if (!cargo && !errores.length) errores.push({ msg: "No existe un cargo para el período seleccionado." });

  const importeNumber = convertirAFloat(req.body.importe);
  if (!Number.isFinite(importeNumber) || importeNumber <= 0) errores.push({ msg: "El importe debe ser mayor a 0." });
  if (!metodo) errores.push({ msg: "Seleccioná un medio de pago válido." });

  let fechaDate = buildFechaFromInput(req.body.fecha);
  if (isNaN(fechaDate.getTime())) errores.push({ msg: "La fecha no es válida." });

  if (errores.length) {
    const cargosPendientes = await cargosPendientesPorProveedor(proveedorId);
    return res.status(400).render("pagosViews/registrarPago", {
      proveedor, proveedores: null,
      cargosPendientes,
      datos: { ...req.body, medioPago: metodo || (req.body.medioPago || "") },
      errores
    });
  }

  await new Pago({
    proveedor: proveedorId,
    cargo: cargo._id,
    periodo: String(periodo),
    fecha: fechaDate,
    importe: importeNumber,
    metodo,
    comprobante: (comprobante || "").trim(),
    observacion: (detalle || "").trim(),
    creadoPor: req.session?.usuario?._id || null,
  }).save();

  req.session.mensaje = "Pago registrado correctamente";
  res.redirect(`/proveedores/${proveedorId}/ver`);
}

// ---------- API auxiliar: cargos pendientes para combo dinámico ----------
export async function apiCargosPendientes(req, res) {
  try {
    const { proveedor } = req.query;
    if (!proveedor) return res.status(400).json({ ok: false, error: "Falta proveedor" });
    const cargos = await cargosPendientesPorProveedor(proveedor);
    res.json({ ok: true, cargos });
  } catch (e) {
    console.error("apiCargosPendientes err:", e);
    res.status(500).json({ ok: false, error: "Error interno" });
  }
}
