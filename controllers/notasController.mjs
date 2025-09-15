// controllers/notasController.mjs
import mongoose from "mongoose";
import Proveedor from "../models/proveedor.mjs";
import MovimientoProveedor from "../models/movimientoProveedor.mjs";
import { convertirAFloat } from "../utils/convertirAFloat.mjs";
import clock from "../utils/clock.mjs";

function normalizarTipo(t) {
  const v = (t || "").toString().trim().toLowerCase();
  return v === "credito" || v === "debito" ? v : null;
}

// ---------- API: últimos N cargos del proveedor ----------
export async function apiCargosProveedor(req, res) {
  try {
    const { proveedor } = req.query;
    let { limit } = req.query;
    if (!proveedor) return res.json({ ok: false, error: "Falta proveedor" });

    limit = parseInt(limit, 10);
    if (!Number.isFinite(limit) || limit <= 0 || limit > 24) limit = 6;

    const cargos = await MovimientoProveedor.find({
      proveedor: new mongoose.Types.ObjectId(proveedor),
      tipo: "cargo",
    })
      .sort({ periodo: -1 }) // YYYY-MM: orden lexicográfico desc
      .limit(limit)
      .lean();

    const out = cargos.map((c) => ({
      _id: c._id,
      periodo: c.periodo,
      concepto: c.concepto,
      importe: c.importe || 0,
    }));

    res.json({ ok: true, cargos: out });
  } catch (err) {
    console.error("apiCargosProveedor err:", err);
    res.json({ ok: false, error: "Error inesperado" });
  }
}

// ===================== FLUJO GENÉRICO =====================

// GET /notas/:tipo/registrar
export async function mostrarFormularioNota(req, res) {
  const tipoNota = normalizarTipo(req.params.tipo);
  if (!tipoNota) return res.status(400).send("Tipo inválido");

  const proveedores = await Proveedor.find({}, "numeroProveedor nombreFantasia nombreReal")
    .sort({ numeroProveedor: 1 })
    .lean();

  const datos = {
    proveedor: "",
    fecha: clock.todayYMD(), // yyyy-mm-dd para <input type="date">
    cargoId: "",
    importe: "",
    detalle: "",
  };

  res.render("notasViews/registrarNota", {
    tipoNota,
    proveedor: null,
    proveedores,
    cargosDeProveedor: null,
    datos,
    errores: [],
  });
}

// POST /notas/:tipo/registrar
export async function crearNotaController(req, res) {
  const tipoNota = normalizarTipo(req.params.tipo);
  if (!tipoNota) return res.status(400).send("Tipo inválido");

  const { proveedor, fecha, detalle = "", cargoId } = req.body;
  const errores = [];

  if (!proveedor) errores.push({ msg: "Seleccioná un proveedor." });
  if (!cargoId) errores.push({ msg: "Seleccioná un cargo a imputar." });

  // fecha con clock (si viene vacía, hoy)
  let fechaDate = clock.date();
  if (fecha) {
    const d = clock.parseYMDToDate(fecha);
    if (isNaN(d.getTime())) errores.push({ msg: "La fecha no es válida." });
    else fechaDate = d;
  }

  // importe
  const importeNumber = convertirAFloat(req.body.importe);
  if (!Number.isFinite(importeNumber) || importeNumber <= 0) {
    errores.push({ msg: "El importe debe ser mayor a 0." });
  }

  // validar cargo
  let cargo = null;
  if (!errores.length) {
    cargo = await MovimientoProveedor.findOne({
      _id: new mongoose.Types.ObjectId(cargoId),
      proveedor: new mongoose.Types.ObjectId(proveedor),
      tipo: "cargo",
    }).lean();
    if (!cargo) errores.push({ msg: "El cargo seleccionado no existe." });
  }

  if (errores.length) {
    const proveedores = await Proveedor.find({}, "numeroProveedor nombreFantasia nombreReal")
      .sort({ numeroProveedor: 1 })
      .lean();

    return res.status(400).render("notasViews/registrarNota", {
      tipoNota,
      proveedor: null,
      proveedores,
      cargosDeProveedor: null,
      datos: req.body,
      errores,
    });
  }

  // Crear nota asociada al período del cargo
  await new MovimientoProveedor({
    proveedor,
    tipo: tipoNota,
    concepto: (detalle || "").trim() || `Nota de ${tipoNota}`,
    periodo: cargo.periodo,
    fecha: fechaDate,
    importe: importeNumber,
    creadoPor: req.session?.usuario?._id || null,
  }).save();

  req.session.mensaje = `Nota de ${tipoNota} registrada correctamente`;
  res.redirect("/proveedores");
}

// ===================== FLUJO CON PROVEEDOR =====================

// GET /notas/proveedores/:proveedorId/:tipo
export async function mostrarFormularioNotaProveedor(req, res) {
  const tipoNota = normalizarTipo(req.params.tipo);
  if (!tipoNota) return res.status(400).send("Tipo inválido");

  const { proveedorId } = req.params;
  const proveedor = await Proveedor.findById(
    proveedorId,
    "nombreFantasia nombreReal numeroProveedor"
  ).lean();
  if (!proveedor) return res.status(404).send("Proveedor no encontrado");

  // Últimos 6 cargos
  const cargosDeProveedor = await MovimientoProveedor.find({
    proveedor: proveedor._id,
    tipo: "cargo",
  })
    .sort({ periodo: -1 })
    .limit(6)
    .lean();

  const datos = {
    fecha: clock.todayYMD(),
    cargoId: "",
    importe: "",
    detalle: "",
  };

  res.render("notasViews/registrarNota", {
    tipoNota,
    proveedor,
    proveedores: null,
    cargosDeProveedor,
    datos,
    errores: [],
  });
}

// POST /notas/proveedores/:proveedorId/:tipo/registrar
export async function crearNotaProveedorController(req, res) {
  const tipoNota = normalizarTipo(req.params.tipo);
  if (!tipoNota) return res.status(400).send("Tipo inválido");

  const { proveedorId } = req.params;
  const proveedor = await Proveedor.findById(proveedorId, "nombreFantasia nombreReal").lean();
  if (!proveedor) return res.status(404).send("Proveedor no encontrado");

  const { fecha, detalle = "", cargoId } = req.body;
  const errores = [];

  if (!cargoId) errores.push({ msg: "Seleccioná un cargo a imputar." });

  // fecha con clock
  let fechaDate = clock.date();
  if (fecha) {
    const d = clock.parseYMDToDate(fecha);
    if (isNaN(d.getTime())) errores.push({ msg: "La fecha no es válida." });
    else fechaDate = d;
  }

  // importe
  const importeNumber = convertirAFloat(req.body.importe);
  if (!Number.isFinite(importeNumber) || importeNumber <= 0) {
    errores.push({ msg: "El importe debe ser mayor a 0." });
  }

  // validar cargo
  let cargo = null;
  if (!errores.length) {
    cargo = await MovimientoProveedor.findOne({
      _id: new mongoose.Types.ObjectId(cargoId),
      proveedor: new mongoose.Types.ObjectId(proveedorId),
      tipo: "cargo",
    }).lean();
    if (!cargo) errores.push({ msg: "El cargo seleccionado no existe." });
  }

  if (errores.length) {
    const cargosDeProveedor = await MovimientoProveedor.find({
      proveedor: proveedorId,
      tipo: "cargo",
    })
      .sort({ periodo: -1 })
      .limit(6)
      .lean();

    return res.status(400).render("notasViews/registrarNota", {
      tipoNota,
      proveedor,
      proveedores: null,
      cargosDeProveedor,
      datos: req.body,
      errores,
    });
  }

  await new MovimientoProveedor({
    proveedor: proveedorId,
    tipo: tipoNota,
    concepto: (detalle || "").trim() || `Nota de ${tipoNota}`,
    periodo: cargo.periodo,
    fecha: fechaDate,
    importe: importeNumber,
    creadoPor: req.session?.usuario?._id || null,
  }).save();

  req.session.mensaje = `Nota de ${tipoNota} registrada correctamente`;
  res.redirect(`/proveedores/${proveedorId}/ver`);
}
