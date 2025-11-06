// import { crearPagoService, listarPagosService, eliminarPagoService } from "../services/pagosService.mjs";
// import Proveedor from "../models/proveedor.mjs";
// import Pago from "../models/pago.mjs";
// import { convertirAFloat } from "../utils/convertirAFloat.mjs";
// import { cargosPendientesPorProveedor, buscarCargoPorPeriodo } from "../services/cargosService.mjs";
// import clock from "../utils/clock.mjs";

// const PERIODO_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// // ── Helpers nuevos ─────────────────────────────────────────────────────────────
// const yyyymm = (d) => {
//   const dt = d instanceof Date ? d : new Date(d);
//   return dt.toISOString().slice(0, 7); // "YYYY-MM"
// };
// // Regla: "vencen el 10, se cuenta desde el 1" => elegibles: períodos <= mes actual
// const esPeriodoElegible = (periodoStr, ahora = clock.date()) => {
//   if (!PERIODO_RE.test(String(periodoStr || ""))) return false;
//   return String(periodoStr) <= yyyymm(ahora);
// };

// function normalizarMedioPago(v) {
//   const val = (v || "").toString().trim().toLowerCase();
//   const allowed = new Set(["transferencia","efectivo","cheque","deposito","otro"]);
//   return allowed.has(val) ? val : null;
// }

// function buildFechaFromInput(fechaStr) {
//   // Mantiene el día elegido; usa hora/min/seg actuales del reloj central
//   // Si no viene fecha, usa clock.date()
//   return clock.dateFromLocalYMD(fechaStr, clock.date());
// }

// // GET /pagos/registrar (genérico)
// export async function mostrarFormularioPago(req, res) {
//   const proveedores = await Proveedor.find({}, "numeroProveedor nombreFantasia nombreReal")
//     .sort({ numeroProveedor: 1 })
//     .lean();

//   const datos = {
//     proveedor: req.query.proveedor || "",
//     periodo: "",
//     fecha: clock.todayYMD(),       // 👈 alineado con clock
//     medioPago: "transferencia",
//     comprobante: "",
//     detalle: "",
//     importe: ""
//   };

//   res.render("pagosViews/registrarPago", { proveedores, proveedor: null, cargosPendientes: null, datos, errores: [] });
// }

// // POST /pagos/registrar (genérico)
// export async function crearPagoController(req, res) {
//   const proveedor = req.body.proveedor;
//   const periodo = req.body.periodo;
//   const metodo = normalizarMedioPago(req.body.metodo || req.body.medioPago);
//   const comprobante = req.body.comprobante || "";
//   const observacion = req.body.observacion || req.body.detalle || "";

//   const errores = [];
//   const importeNumber = convertirAFloat(req.body.importe);

//   if (!proveedor) errores.push({ msg: "Seleccioná un proveedor." });
//   if (!PERIODO_RE.test(String(periodo || ""))) errores.push({ msg: "Seleccioná un período válido (YYYY-MM)." });
//   if (!Number.isFinite(importeNumber) || importeNumber <= 0) errores.push({ msg: "El importe debe ser mayor a 0." });
//   if (!metodo) errores.push({ msg: "Seleccioná un medio de pago válido." });

//   const cargo = (!errores.length && periodo) ? await buscarCargoPorPeriodo(proveedor, periodo) : null;
//   if (!cargo && !errores.length) errores.push({ msg: "No existe un cargo para el período seleccionado." });

//   let fechaDate = buildFechaFromInput(req.body.fecha);
//   if (isNaN(fechaDate.getTime())) errores.push({ msg: "La fecha no es válida." });

//   if (errores.length) {
//     const proveedores = await Proveedor.find({}, "numeroProveedor nombreFantasia nombreReal")
//       .sort({ numeroProveedor: 1 })
//       .lean();
//     return res.status(400).render("pagosViews/registrarPago", {
//       proveedores,
//       proveedor: null,
//       cargosPendientes: null,
//       datos: { ...req.body, medioPago: metodo || (req.body.medioPago || "") },
//       errores,
//     });
//   }

//   await new Pago({
//     proveedor,
//     cargo: cargo._id,
//     periodo: String(periodo),
//     fecha: fechaDate,
//     importe: importeNumber,
//     metodo,
//     comprobante,
//     observacion,
//     creadoPor: req.usuario?._id || null,   // 👈 usa req.usuario
//   }).save();

//   req.session.mensaje = "Pago registrado correctamente";
//   res.redirect("/pagos");
// }

// // GET /pagos (listado con filtros)
// export async function listarPagosController(req, res) {
//   const { proveedor, desde, hasta } = req.query;
//   const pagos = await listarPagosService({ proveedor, desde, hasta });
//   const proveedores = await Proveedor.find({}, "numeroProveedor nombreFantasia").sort({ numeroProveedor: 1 }).lean();
//   res.render("pagosViews/listadoPagos", { pagos, proveedores, filtros: { proveedor, desde, hasta } });
// }

// // POST /pagos/:id/eliminar
// export async function eliminarPagoController(req, res) {
//   await eliminarPagoService(req.params.id);
//   req.session.mensaje = "Pago eliminado";
//   res.redirect("/pagos");
// }

// // ---------- flujo anidado por proveedor ----------

// // GET /pagos/proveedores/:proveedorId/registrar
// export async function mostrarFormularioPagoProveedor(req, res) {
//   const { proveedorId } = req.params;
//   const proveedor = await Proveedor.findById(proveedorId, "nombreFantasia nombreReal cuit").lean();
//   if (!proveedor) return res.status(404).send("Proveedor no encontrado");

//   // ✅ Mostrar solo vencidos + mes actual por defecto; con ?all=1 mostrar todos
//   const mostrarTodos = req.query.all === "1";
//   let cargosPendientes = await cargosPendientesPorProveedor(proveedorId);

//   if (!mostrarTodos) {
//     const ahora = clock.date();
//     const elegibles = [];
//     for (const c of (cargosPendientes || [])) {
//       const per = String(c.periodo || "");
//       if (esPeriodoElegible(per, ahora)) elegibles.push(c);
//     }
//     cargosPendientes = elegibles;
//   }

//   const datos = {
//     fecha: clock.todayYMD(),       // 👈 alineado con clock
//     periodo: "",
//     medioPago: "transferencia",
//     comprobante: "",
//     detalle: "",
//     importe: ""
//   };

//   res.render("pagosViews/registrarPago", {
//     proveedor, proveedores: null,
//     cargosPendientes,
//     datos, errores: [],
//     // 👇 Para que la vista pueda mostrar el toggle "ver todos"
//     mostrarTodos
//   });
// }

// // POST /pagos/proveedores/:proveedorId/registrar
// export async function crearPagoProveedorController(req, res) {
//   const { proveedorId } = req.params;
//   const proveedor = await Proveedor.findById(proveedorId, "nombreFantasia nombreReal").lean();
//   if (!proveedor) return res.status(404).send("Proveedor no encontrado");

//   const { periodo, comprobante = "", detalle = "" } = req.body;
//   const metodo = normalizarMedioPago(req.body.medioPago);
//   const errores = [];

//   if (!PERIODO_RE.test(String(periodo || ""))) errores.push({ msg: "Seleccioná un período válido (YYYY-MM)." });

//   // ✅ Validación de elegibilidad (vencidos + mes actual), salvo ?all=1
//   const mostrarTodos = req.query.all === "1";
//   if (!mostrarTodos && !esPeriodoElegible(periodo, clock.date())) {
//     errores.push({ msg: "Solo se permiten períodos vencidos y el mes en curso." });
//   }

//   const cargo = (!errores.length && periodo) ? await buscarCargoPorPeriodo(proveedorId, periodo) : null;
//   if (!cargo && !errores.length) errores.push({ msg: "No existe un cargo para el período seleccionado." });

//   const importeNumber = convertirAFloat(req.body.importe);
//   if (!Number.isFinite(importeNumber) || importeNumber <= 0) errores.push({ msg: "El importe debe ser mayor a 0." });
//   if (!metodo) errores.push({ msg: "Seleccioná un medio de pago válido." });

//   let fechaDate = buildFechaFromInput(req.body.fecha);
//   if (isNaN(fechaDate.getTime())) errores.push({ msg: "La fecha no es válida." });

//   if (errores.length) {
//     // Volvemos a calcular la lista para re-render, respetando el criterio (all o no)
//     let cargosPendientes = await cargosPendientesPorProveedor(proveedorId);
//     if (!mostrarTodos) {
//       const ahora = clock.date();
//       cargosPendientes = (cargosPendientes || []).filter(c => esPeriodoElegible(String(c.periodo || ""), ahora));
//     }

//     return res.status(400).render("pagosViews/registrarPago", {
//       proveedor, proveedores: null,
//       cargosPendientes,
//       datos: { ...req.body, medioPago: metodo || (req.body.medioPago || "") },
//       errores,
//       mostrarTodos
//     });
//   }

//   await new Pago({
//     proveedor: proveedorId,
//     cargo: cargo._id,
//     periodo: String(periodo),
//     fecha: fechaDate,
//     importe: importeNumber,
//     metodo,
//     comprobante: (comprobante || "").trim(),
//     observacion: (detalle || "").trim(),
//     creadoPor: req.usuario?._id || null,  // 👈 usa req.usuario
//   }).save();

//   req.session.mensaje = "Pago registrado correctamente";
//   res.redirect(`/proveedores/${proveedorId}/ver`);
// }

// // ---------- API auxiliar: cargos pendientes para combo dinámico ----------
// export async function apiCargosPendientes(req, res) {
//   try {
//     const { proveedor } = req.query;
//     if (!proveedor) return res.status(400).json({ ok: false, error: "Falta proveedor" });

//     // ✅ Por defecto solo elegibles; con ?all=1 devolver todos
//     const mostrarTodos = req.query.all === "1";
//     let cargos = await cargosPendientesPorProveedor(proveedor);

//     if (!mostrarTodos) {
//       const ahora = clock.date();
//       cargos = (cargos || []).filter(c => esPeriodoElegible(String(c.periodo || ""), ahora));
//     }

//     res.json({ ok: true, cargos, mostrarTodos });
//   } catch (e) {
//     console.error("apiCargosPendientes err:", e);
//     res.status(500).json({ ok: false, error: "Error interno" });
//   }
// }

import { crearPagoService, listarPagosService, eliminarPagoService } from "../services/pagosService.mjs";
import Proveedor from "../models/proveedor.mjs";
import Pago from "../models/pago.mjs";
import { convertirAFloat } from "../utils/convertirAFloat.mjs";
import { cargosPendientesPorProveedor, buscarCargoPorPeriodo } from "../services/cargosService.mjs";
import clock from "../utils/clock.mjs";

const PERIODO_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// ── Helpers ────────────────────────────────────────────────────────────────────
const yyyymm = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString().slice(0, 7); // "YYYY-MM"
};
// Regla: "vencen el 10, se cuenta desde el 1" => elegibles: períodos <= mes actual
const esPeriodoElegible = (periodoStr, ahora = clock.date()) => {
  if (!PERIODO_RE.test(String(periodoStr || ""))) return false;
  return String(periodoStr) <= yyyymm(ahora);
};

function normalizarMedioPago(v) {
  const val = (v || "").toString().trim().toLowerCase();
  const allowed = new Set(["transferencia", "efectivo", "cheque", "deposito", "otro"]);
  return allowed.has(val) ? val : null;
}

function buildFechaFromInput(fechaStr) {
  // Mantiene el día elegido; usa hora/min/seg actuales del reloj central
  // Si no viene fecha, usa clock.date()
  return clock.dateFromLocalYMD(fechaStr, clock.date());
}

// ── GET /pagos/registrar (genérico) ───────────────────────────────────────────
export async function mostrarFormularioPago(req, res) {
  const proveedores = await Proveedor.find({}, "numeroProveedor nombreFantasia nombreReal")
    .sort({ numeroProveedor: 1 })
    .lean();

  const datos = {
    proveedor: req.query.proveedor || "",
    periodo: "",
    fecha: clock.todayYMD(),
    medioPago: "transferencia",
    comprobante: "",
    detalle: "",
    importe: ""
  };

  res.render("pagosViews/registrarPago", {
    proveedores,
    proveedor: null,
    cargosPendientes: null,
    datos,
    errores: []
  });
}

// ── POST /pagos/registrar (genérico) ──────────────────────────────────────────
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
    creadoPor: req.usuario?._id || null,
  }).save();

  req.session.mensaje = "Pago registrado correctamente";
  return res.redirect("/pagos");
}

// ── GET /pagos (listado con filtros) ──────────────────────────────────────────
export async function listarPagosController(req, res) {
  const { proveedor, desde, hasta } = req.query;

  const pagos = await listarPagosService({ proveedor, desde, hasta });
  const proveedores = await Proveedor
    .find({}, "numeroProveedor nombreFantasia")
    .sort({ numeroProveedor: 1 })
    .lean();

  // ✅ tomar y limpiar mensajes de sesión (o por query si querés invocarlo manualmente)
  const toastOk  = req.session.mensaje || (req.query.ok  ? String(req.query.ok)  : null);
  const toastErr = req.session.error   || (req.query.err ? String(req.query.err) : null);
  delete req.session.mensaje;
  delete req.session.error;

  return res.render("pagosViews/listadoPagos", {
    pagos,
    proveedores,
    filtros: { proveedor, desde, hasta },
    toastOk,
    toastErr
  });
}

// ── POST /pagos/:id/eliminar ─────────────────────────────────────────────────
export async function eliminarPagoController(req, res) {
  await eliminarPagoService(req.params.id);
  req.session.mensaje = "Pago eliminado";
  return res.redirect("/pagos");
}

// ── Flujo anidado por proveedor ───────────────────────────────────────────────
// GET /pagos/proveedores/:proveedorId/registrar
export async function mostrarFormularioPagoProveedor(req, res) {
  const { proveedorId } = req.params;
  const proveedor = await Proveedor.findById(proveedorId, "nombreFantasia nombreReal cuit").lean();
  if (!proveedor) return res.status(404).send("Proveedor no encontrado");

  // ✅ Por defecto vencidos + mes actual; con ?all=1 mostrar todos
  const mostrarTodos = req.query.all === "1";
  let cargosPendientes = await cargosPendientesPorProveedor(proveedorId);

  if (!mostrarTodos) {
    const ahora = clock.date();
    const elegibles = [];
    for (const c of (cargosPendientes || [])) {
      const per = String(c.periodo || "");
      if (esPeriodoElegible(per, ahora)) elegibles.push(c);
    }
    cargosPendientes = elegibles;
  }

  const datos = {
    fecha: clock.todayYMD(),
    periodo: "",
    medioPago: "transferencia",
    comprobante: "",
    detalle: "",
    importe: ""
  };

  return res.render("pagosViews/registrarPago", {
    proveedor, proveedores: null,
    cargosPendientes,
    datos, errores: [],
    mostrarTodos
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

  // ✅ Validación de elegibilidad (vencidos + mes actual), salvo ?all=1
  const mostrarTodos = req.query.all === "1";
  if (!mostrarTodos && !esPeriodoElegible(periodo, clock.date())) {
    errores.push({ msg: "Solo se permiten períodos vencidos y el mes en curso." });
  }

  const cargo = (!errores.length && periodo) ? await buscarCargoPorPeriodo(proveedorId, periodo) : null;
  if (!cargo && !errores.length) errores.push({ msg: "No existe un cargo para el período seleccionado." });

  const importeNumber = convertirAFloat(req.body.importe);
  if (!Number.isFinite(importeNumber) || importeNumber <= 0) errores.push({ msg: "El importe debe ser mayor a 0." });
  if (!metodo) errores.push({ msg: "Seleccioná un medio de pago válido." });

  let fechaDate = buildFechaFromInput(req.body.fecha);
  if (isNaN(fechaDate.getTime())) errores.push({ msg: "La fecha no es válida." });

  if (errores.length) {
    // Recalcular lista según ?all
    let cargosPendientes = await cargosPendientesPorProveedor(proveedorId);
    if (!mostrarTodos) {
      const ahora = clock.date();
      cargosPendientes = (cargosPendientes || []).filter(c => esPeriodoElegible(String(c.periodo || ""), ahora));
    }

    return res.status(400).render("pagosViews/registrarPago", {
      proveedor, proveedores: null,
      cargosPendientes,
      datos: { ...req.body, medioPago: metodo || (req.body.medioPago || "") },
      errores,
      mostrarTodos
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
    creadoPor: req.usuario?._id || null,
  }).save();

  req.session.mensaje = "Pago registrado correctamente";
  return res.redirect(`/proveedores/${proveedorId}/ver`);
}

// ── API: cargos pendientes para combo dinámico ────────────────────────────────
export async function apiCargosPendientes(req, res) {
  try {
    const { proveedor } = req.query;
    if (!proveedor) return res.status(400).json({ ok: false, error: "Falta proveedor" });

    // ✅ Por defecto solo elegibles; con ?all=1 devolver todos
    const mostrarTodos = req.query.all === "1";
    let cargos = await cargosPendientesPorProveedor(proveedor);

    if (!mostrarTodos) {
      const ahora = clock.date();
      cargos = (cargos || []).filter(c => esPeriodoElegible(String(c.periodo || ""), ahora));
    }

    return res.json({ ok: true, cargos, mostrarTodos });
  } catch (e) {
    console.error("apiCargosPendientes err:", e);
    return res.status(500).json({ ok: false, error: "Error interno" });
  }
}

