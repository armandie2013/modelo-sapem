
// SE PUEDEN HACER NOTAS DE CREDITO O DEBITO DE LOS ULTIMOS 18 MESES //

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

/* =========================================================
 * Límite temporal para NC/ND
 * =======================================================*/
const LIMITE_MESES_NOTAS = 24;

function _dateFromPeriodo(yyyyMM) {
  const [y, m] = String(yyyyMM).split("-").map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, 1);
}
function _mesesEntre(a, b) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/* =========================================================
 * Helpers internos (filtrado anti-plan de pago)
 * =======================================================*/

/**
 * Devuelve "cargos ajustables" para NC/ND:
 *  - tipo: "cargo"
 *  - NO pertenecen a Plan (planPagoId:null)
 *  - NO fueron revertidos por Plan (existe crédito con planPagoId != null y aplicaA = cargo._id)
 *  - ⚠️ Solo últimos LIMITE_MESES_NOTAS meses
 */
async function cargosAjustables(proveedorId, limit = LIMITE_MESES_NOTAS) {
  const oid = new mongoose.Types.ObjectId(proveedorId);

  const cargos = await MovimientoProveedor.find({
    proveedor: oid,
    tipo: "cargo",
    planPagoId: null,
  })
    .sort({ periodo: -1 }) // YYYY-MM desc
    .lean();

  if (!cargos.length) return [];

  const ids = cargos.map((c) => c._id);

  // créditos de reversa de plan que apuntan a esos cargos
  const reversas = await MovimientoProveedor.find(
    {
      proveedor: oid,
      tipo: "credito",
      planPagoId: { $ne: null },
      aplicaA: { $in: ids },
    },
    { aplicaA: 1, _id: 0 }
  ).lean();

  const noAjustar = new Set(reversas.map((r) => String(r.aplicaA)));
  const ahora = clock.date();

  const filtrados = cargos
    .filter((c) => !noAjustar.has(String(c._id)))
    .filter((c) => {
      const d = _dateFromPeriodo(c.periodo);
      if (!d) return false;
      return _mesesEntre(d, ahora) <= LIMITE_MESES_NOTAS;
    })
    .map((c) => ({
      _id: c._id,
      periodo: c.periodo,
      concepto: c.concepto,
      importe: Number(c.importe ?? 0),
    }));

  const maxMostrar = Math.min(Number(limit || LIMITE_MESES_NOTAS), LIMITE_MESES_NOTAS);
  return filtrados.slice(0, maxMostrar);
}

/**
 * Valida que un cargo sea "ajustable" para NC/ND.
 * Incluye tope de 18 meses.
 */
async function cargoAjustableById(proveedorId, cargoId) {
  const oid = new mongoose.Types.ObjectId(proveedorId);
  const cid = new mongoose.Types.ObjectId(cargoId);

  const cargo = await MovimientoProveedor.findOne({
    _id: cid,
    proveedor: oid,
    tipo: "cargo",
    planPagoId: null,
  }).lean();
  if (!cargo) return null;

  const reversa = await MovimientoProveedor.exists({
    proveedor: oid,
    tipo: "credito",
    planPagoId: { $ne: null },
    aplicaA: cid,
  });
  if (reversa) return null;

  const d = _dateFromPeriodo(cargo.periodo);
  if (!d) return null;
  if (_mesesEntre(d, clock.date()) > LIMITE_MESES_NOTAS) return null;

  return cargo;
}

/* =========================================================
 * API: últimos N cargos ajustables del proveedor
 * =======================================================*/
export async function apiCargosProveedor(req, res) {
  try {
    const { proveedor } = req.query;
    let { limit } = req.query;
    if (!proveedor) return res.json({ ok: false, error: "Falta proveedor" });

    limit = parseInt(limit, 10);
    if (!Number.isFinite(limit) || limit <= 0 || limit > LIMITE_MESES_NOTAS) {
      limit = LIMITE_MESES_NOTAS;
    }

    const cargos = await cargosAjustables(proveedor, limit);

    const out = cargos.map((c) => ({
      _id: c._id,
      periodo: c.periodo,
      concepto: c.concepto,
      importe: Number(c.importe ?? 0),
    }));

    res.json({ ok: true, cargos: out });
  } catch (err) {
    console.error("apiCargosProveedor err:", err);
    res.json({ ok: false, error: "Error inesperado" });
  }
}

/* =========================================================
 * FLUJO GENÉRICO
 * =======================================================*/

// GET /notas/:tipo/registrar
export async function mostrarFormularioNota(req, res) {
  const tipoNota = normalizarTipo(req.params.tipo);
  if (!tipoNota) return res.status(400).send("Tipo inválido");

  const proveedores = await Proveedor.find({}, "numeroProveedor nombreFantasia nombreReal")
    .sort({ numeroProveedor: 1 })
    .lean();

  const datos = {
    proveedor: "",
    fecha: clock.todayYMD(),
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

  // fecha
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
    try {
      cargo = await cargoAjustableById(proveedor, cargoId);
    } catch {
      cargo = null;
    }
    if (!cargo) {
      errores.push({
        msg:
          "El cargo seleccionado no es ajustable (pertenece a un Plan, fue revertido o supera el límite de 18 meses).",
      });
    }
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

  // ✅ Crear nota asociada al cargo y al período del cargo
  await new MovimientoProveedor({
    proveedor,                    // <-- corregido (antes: proveedorId)
    tipo: tipoNota,
    concepto: (detalle || "").trim() || `Nota de ${tipoNota}`,
    periodo: cargo.periodo,
    fecha: fechaDate,
    importe: importeNumber,
    aplicaA: cargo._id,           // <-- importante: vincula la NC/ND al cargo
    creadoPor: req.session?.usuario?._id || null,
  }).save();

  req.session.mensaje = `Nota de ${tipoNota} registrada correctamente`;
  res.redirect("/proveedores");
}

/* =========================================================
 * FLUJO CON PROVEEDOR
 * =======================================================*/

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

  // Últimos cargos AJUSTABLES (acotados por 18 meses)
  const cargosDeProveedor = await cargosAjustables(proveedor._id, LIMITE_MESES_NOTAS);

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

  // fecha
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
    try {
      cargo = await cargoAjustableById(proveedorId, cargoId);
    } catch {
      cargo = null;
    }
    if (!cargo) {
      errores.push({
        msg:
          "El cargo seleccionado no es ajustable (pertenece a un Plan, fue revertido o supera el límite de 18 meses).",
      });
    }
  }

  if (errores.length) {
    const cargosDeProveedor = await cargosAjustables(proveedorId, LIMITE_MESES_NOTAS);

    return res.status(400).render("notasViews/registrarNota", {
      tipoNota,
      proveedor,
      proveedores: null,
      cargosDeProveedor,
      datos: req.body,
      errores,
    });
  }

  // ✅ Guardar nota con vínculo al cargo (aplicaA)
  await new MovimientoProveedor({
    proveedor: proveedorId,
    tipo: tipoNota,
    concepto: (detalle || "").trim() || `Nota de ${tipoNota}`,
    periodo: cargo.periodo,
    fecha: fechaDate,
    importe: importeNumber,
    aplicaA: cargo._id,           // <-- faltaba acá
    creadoPor: req.session?.usuario?._id || null,
  }).save();

  req.session.mensaje = `Nota de ${tipoNota} registrada correctamente`;
  res.redirect(`/proveedores/${proveedorId}/ver`);
}
