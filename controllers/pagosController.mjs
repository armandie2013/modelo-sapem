// controllers/pagosController.mjs
import { crearPagoService, listarPagosService, eliminarPagoService } from "../services/pagosService.mjs";
import Proveedor from "../models/proveedor.mjs";
import Pago from "../models/pago.mjs";
import { convertirAFloat } from "../utils/convertirAFloat.mjs";
import { cargosPendientesPorProveedor, buscarCargoPorPeriodo } from "../services/cargosService.mjs";

const PERIODO_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const normalizarMedioPago = (v) => (v || "").toString().trim().toLowerCase();

function medioValido(x) {
  return ["transferencia", "efectivo", "cheque", "deposito", "otro"].includes(x);
}

// ---------- Form genérico ----------
export async function mostrarFormularioPago(req, res) {
  const proveedores = await Proveedor.find({}, "numeroProveedor nombreFantasia nombreReal")
    .sort({ numeroProveedor: 1 })
    .lean();

  const datos = {
    proveedor: req.query.proveedor || "",
    fecha: new Date().toISOString().slice(0, 10),
    medioPago: "transferencia",
    comprobante: "",
    detalle: "",
    importe: "",
    periodo: "",
  };

  res.render("pagosViews/registrarPago", {
    proveedores,
    proveedor: null,
    cargosPendientes: null, // en genérico se popula por API
    datos,
    errores: [],
  });
}

export async function crearPagoController(req, res) {
  const proveedorId = req.body.proveedor;
  const { fecha, periodo, comprobante = "", detalle = "" } = req.body;
  const medioPago = normalizarMedioPago(req.body.medioPago);
  const errores = [];

  if (!proveedorId) errores.push({ msg: "Seleccioná un proveedor." });

  // período obligatorio en el flujo genérico
  if (!PERIODO_RE.test(String(periodo || ""))) {
    errores.push({ msg: "Seleccioná un período válido (YYYY-MM)." });
  }

  const cargo = (!errores.length && proveedorId && periodo)
    ? await buscarCargoPorPeriodo(proveedorId, periodo)
    : null;

  if (!cargo && !errores.length) errores.push({ msg: "No existe un cargo para el período seleccionado." });

  // saldo del cargo
  let saldo = null;
  if (!errores.length) {
    const pagos = await Pago.find({ cargo: cargo._id }, "importe").lean();
    const pagado = pagos.reduce((a, p) => a + (p.importe || 0), 0);
    saldo = (cargo.importe || 0) - pagado;
    if (saldo <= 0) errores.push({ msg: "El cargo del período ya está saldado." });
  }

  const importeNumber = convertirAFloat(req.body.importe);
  if (!Number.isFinite(importeNumber) || importeNumber <= 0) {
    errores.push({ msg: "El importe debe ser mayor a 0." });
  } else if (saldo != null && importeNumber > saldo) {
    errores.push({ msg: `El importe excede el saldo del período ($ ${saldo.toFixed(2)}).` });
  }

  let fechaDate = new Date();
  if (fecha) {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) errores.push({ msg: "La fecha no es válida." });
    else fechaDate = d;
  }

  if (!medioValido(medioPago)) {
    errores.push({ msg: "Seleccioná un medio de pago válido." });
  }

  if (errores.length) {
    const proveedores = await Proveedor.find({}, "numeroProveedor nombreFantasia nombreReal")
      .sort({ numeroProveedor: 1 })
      .lean();
    return res.status(400).render("pagosViews/registrarPago", {
      proveedores,
      proveedor: null,
      cargosPendientes: null,
      datos: { ...req.body, medioPago },
      errores,
    });
  }

  await new Pago({
    proveedor: proveedorId,
    cargo: cargo._id,
    periodo: String(periodo),
    fecha: fechaDate,
    importe: importeNumber,
    metodo: medioPago,
    comprobante: comprobante.trim(),
    observacion: detalle.trim(),
    creadoPor: req.session?.usuario?._id || null,
  }).save();

  req.session.mensaje = "Pago registrado correctamente";
  res.redirect("/pagos");
}

// ---------- Listado / eliminar ----------
export async function listarPagosController(req, res) {
  const { proveedor, desde, hasta } = req.query;
  const pagos = await listarPagosService({ proveedor, desde, hasta });
  const proveedores = await Proveedor.find({}, "numeroProveedor nombreFantasia").sort({ numeroProveedor: 1 }).lean();
  res.render("pagosViews/listadoPagos", { pagos, proveedores, filtros: { proveedor, desde, hasta } });
}

export async function eliminarPagoController(req, res) {
  await eliminarPagoService(req.params.id);
  req.session.mensaje = "Pago eliminado";
  res.redirect("/pagos");
}

// ---------- Form anidado por proveedor ----------
export async function mostrarFormularioPagoProveedor(req, res) {
  const { proveedorId } = req.params;
  const proveedor = await Proveedor.findById(proveedorId, "nombreFantasia nombreReal cuit").lean();
  if (!proveedor) return res.status(404).send("Proveedor no encontrado");

  const cargosPendientes = await cargosPendientesPorProveedor(proveedorId);

  const datos = {
    fecha: new Date().toISOString().slice(0, 10),
    medioPago: "transferencia",
    comprobante: "",
    detalle: "",
    importe: "",
    periodo: "",
  };

  res.render("pagosViews/registrarPago", {
    proveedor,
    proveedores: null,
    cargosPendientes,
    datos,
    errores: [],
  });
}

export async function crearPagoProveedorController(req, res) {
  const { proveedorId } = req.params;
  const proveedor = await Proveedor.findById(proveedorId, "nombreFantasia nombreReal").lean();
  if (!proveedor) return res.status(404).send("Proveedor no encontrado");

  const { fecha, periodo, comprobante = "", detalle = "" } = req.body;
  const medioPago = normalizarMedioPago(req.body.medioPago);
  const errores = [];

  if (!PERIODO_RE.test(String(periodo || ""))) {
    errores.push({ msg: "Seleccioná un período válido (YYYY-MM)." });
  }

  const cargo = errores.length ? null : await buscarCargoPorPeriodo(proveedorId, periodo);
  if (!cargo && !errores.length) errores.push({ msg: "No existe un cargo para el período seleccionado." });

  let saldo = null;
  if (!errores.length) {
    const pagos = await Pago.find({ cargo: cargo._id }, "importe").lean();
    const pagado = pagos.reduce((a, p) => a + (p.importe || 0), 0);
    saldo = (cargo.importe || 0) - pagado;
    if (saldo <= 0) errores.push({ msg: "El cargo del período ya está saldado." });
  }

  const importeNumber = convertirAFloat(req.body.importe);
  if (!Number.isFinite(importeNumber) || importeNumber <= 0) errores.push({ msg: "El importe debe ser mayor a 0." });
  else if (saldo != null && importeNumber > saldo) errores.push({ msg: `El importe excede el saldo del período ($ ${saldo.toFixed(2)}).` });

  let fechaDate = new Date();
  if (fecha) {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) errores.push({ msg: "La fecha no es válida." });
    else fechaDate = d;
  }

  if (!medioValido(medioPago)) errores.push({ msg: "Seleccioná un medio de pago válido." });

  if (errores.length) {
    const cargosPendientes = await cargosPendientesPorProveedor(proveedorId);
    return res.status(400).render("pagosViews/registrarPago", {
      proveedor,
      proveedores: null,
      cargosPendientes,
      datos: { ...req.body, medioPago },
      errores,
    });
  }

  await new Pago({
    proveedor: proveedorId,
    cargo: cargo._id,
    periodo: String(periodo),
    fecha: fechaDate,
    importe: importeNumber,
    metodo: medioPago,
    comprobante: comprobante.trim(),
    observacion: detalle.trim(),
    creadoPor: req.session?.usuario?._id || null,
  }).save();

  req.session.mensaje = "Pago registrado correctamente";
  res.redirect(`/proveedores/${proveedorId}/ver`);
}

// ---------- API para poblar períodos/cargos por proveedor (modo genérico) ----------
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
