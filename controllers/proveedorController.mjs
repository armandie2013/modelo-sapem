// controllers/proveedorController.mjs
import { crearProveedorService } from "../services/proveedorService.mjs";
import { obtenerSiguienteNumeroDeProveedor } from "../utils/obtenerSiguienteNumeroDeProveedor.mjs";
import { listarPlanesService } from "../services/planesService.mjs";
import Proveedor from "../models/proveedor.mjs";
import Pago from "../models/pago.mjs";
import MovimientoProveedor from "../models/movimientoProveedor.mjs";
import mongoose from "mongoose";

// Helper robusto para boolean
function toBool(v) {
  if (Array.isArray(v)) {
    return v.some(x => x === true || x === "true" || x === "on" || x === "1" || x === 1);
  }
  return v === true || v === "true" || v === "on" || v === "1" || v === 1;
}

/* =========================================================
 * GET /proveedores/registrar
 * =======================================================*/
export async function mostrarFormularioProveedor(req, res) {
  try {
    const planes = await listarPlanesService();
    res.render("proveedoresViews/registroProveedor", { datos: {}, planes });
  } catch (err) {
    console.error("Error al cargar formulario proveedor:", err);
    res.status(500).send("Error al cargar formulario proveedor");
  }
}

/* =========================================================
 * POST /proveedores/registrar
 * =======================================================*/
export async function crearProveedorController(req, res) {
  try {
    if (req.erroresValidacion) {
      const planes = await listarPlanesService();
      return res.status(400).render("proveedoresViews/registroProveedor", {
        errores: req.erroresValidacion,
        datos: req.body,
        planes,
      });
    }

    const nuevoNumero = await obtenerSiguienteNumeroDeProveedor();

    // activo: si no viene el checkbox, dejamos true por defecto
    const activo = Object.prototype.hasOwnProperty.call(req.body, "activo")
      ? toBool(req.body.activo)
      : true;

    const plan = req.body.plan || null;

    const nuevoProveedor = {
      numeroProveedor: nuevoNumero,
      nombreFantasia: (req.body.nombreFantasia || "").trim(),
      nombreReal: (req.body.nombreReal || "").trim(),
      cuit: (req.body.cuit || "").trim(),
      domicilio: (req.body.domicilio || "").trim(),
      domicilioFiscal: (req.body.domicilioFiscal || "").trim(),
      telefonoCelular: (req.body.telefonoCelular || "").trim(),
      telefonoFijo: (req.body.telefonoFijo || "").trim(),
      email: (req.body.email || "").trim(),
      cbu: (req.body.cbu || "").trim(),
      categoria: (req.body.categoria || "").trim(),
      condicionIva: (req.body.condicionIva || "").trim(),
      activo,
      plan, // ObjectId o null
    };

    await crearProveedorService(nuevoProveedor);
    req.session.mensaje = `Proveedor #${nuevoNumero} creado correctamente`;
    res.redirect("/proveedores");
  } catch (error) {
    console.error("Error al crear proveedor:", error);
    res.status(500).send("Error al crear proveedor");
  }
}

/* =========================================================
 * GET /proveedores
 * =======================================================*/
export async function listarProveedoresController(req, res) {
  try {
    const proveedores = await Proveedor.find()
      .populate("plan", "nombre importe activo")
      .lean();

    res.render("proveedoresViews/listadoProveedores", { proveedores });
  } catch (error) {
    console.error("Error al listar proveedores:", error);
    res.status(500).send("Error al listar proveedores");
  }
}

/* =========================================================
 * GET /proveedores/:id/ver
 * =======================================================*/
export async function verProveedorController(req, res) {
  const { id: proveedorId } = req.params;
  const proveedor = await Proveedor.findById(proveedorId)
    .populate("plan", "nombre importe")
    .lean();

  if (!proveedor) return res.status(404).send("Proveedor no encontrado");

  const oid = new mongoose.Types.ObjectId(proveedorId);

  // --- Resumen por período: cargos, débito, crédito (desde MovimientoProveedor) + pagos (desde Pago)
  const [movAgg, pagosAgg] = await Promise.all([
    MovimientoProveedor.aggregate([
      { $match: { proveedor: oid } },
      {
        $group: {
          _id: "$periodo",
          cargo: {
            $sum: { $cond: [{ $eq: ["$tipo", "cargo"] }, "$importe", 0] },
          },
          notaDebito: {
            $sum: { $cond: [{ $eq: ["$tipo", "debito"] }, "$importe", 0] },
          },
          notaCredito: {
            $sum: { $cond: [{ $eq: ["$tipo", "credito"] }, "$importe", 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          periodo: "$_id",
          cargo: 1,
          notaDebito: 1,
          notaCredito: 1,
        },
      },
    ]),
    Pago.aggregate([
      { $match: { proveedor: oid } },
      {
        $group: {
          _id: "$periodo",
          pagos: { $sum: "$importe" },
        },
      },
      { $project: { _id: 0, periodo: "$_id", pagos: 1 } },
    ]),
  ]);

  // Merge por periodo
  const mapa = new Map();
  for (const r of movAgg) {
    mapa.set(r.periodo, {
      periodo: r.periodo,
      cargo: r.cargo || 0,
      notaDebito: r.notaDebito || 0,
      notaCredito: r.notaCredito || 0,
      pagos: 0,
    });
  }
  for (const r of pagosAgg) {
    const prev =
      mapa.get(r.periodo) || {
        periodo: r.periodo,
        cargo: 0,
        notaDebito: 0,
        notaCredito: 0,
        pagos: 0,
      };
    prev.pagos = r.pagos || 0;
    mapa.set(r.periodo, prev);
  }

  let detallePorPeriodo = Array.from(mapa.values());
  detallePorPeriodo.forEach((r) => {
    // Saldo = cargos + ND - NC - pagos
    r.saldo = (r.cargo + r.notaDebito) - (r.notaCredito + r.pagos);
  });
  // Ordená por período desc
  detallePorPeriodo.sort((a, b) =>
    a.periodo > b.periodo ? -1 : a.periodo < b.periodo ? 1 : 0
  );

  // Totales
  const totales = detallePorPeriodo.reduce(
    (acc, r) => {
      acc.cargo += r.cargo;
      acc.notaDebito += r.notaDebito;
      acc.notaCredito += r.notaCredito;
      acc.pagos += r.pagos;
      return acc;
    },
    { cargo: 0, notaDebito: 0, notaCredito: 0, pagos: 0 }
  );
  totales.saldo =
    (totales.cargo + totales.notaDebito) -
    (totales.notaCredito + totales.pagos);

  // --- Movimientos recientes (unificados)
  const [movs, pagos] = await Promise.all([
    MovimientoProveedor.find({ proveedor: proveedorId })
      .select("tipo concepto periodo fecha importe")
      .sort({ fecha: -1, createdAt: -1 })
      .limit(100)
      .lean(),
    Pago.find({ proveedor: proveedorId })
      .select("fecha importe metodo comprobante periodo")
      .sort({ fecha: -1, createdAt: -1 })
      .limit(100)
      .lean(),
  ]);

  const movimientos = [
    // cargos y notas del mismo modelo
    ...movs.map((m) => ({
      ...m,
      // signo: cargo+ / debito+ / credito- / pago- (pago llega abajo)
      signo: m.tipo === "cargo" || m.tipo === "debito" ? +1 : -1,
    })),
    // pagos del modelo Pago
    ...pagos.map((p) => ({
      tipo: "pago",
      concepto: `Pago ${p.metodo || ""}`.trim(),
      periodo: p.periodo,
      fecha: p.fecha,
      importe: p.importe,
      metodo: p.metodo,
      comprobante: p.comprobante,
      signo: -1,
    })),
  ]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 100);

  // Ajustá el path si tu vista se llama distinto
  res.render("proveedoresViews/verProveedor", {
    title:"Proveedor",
    proveedor,
    totales,
    detallePorPeriodo,
    movimientos,
  });
}

/* =========================================================
 * GET /proveedores/:id/editar
 * =======================================================*/
export async function mostrarFormularioEditarProveedor(req, res) {
  try {
    const proveedor = await Proveedor.findById(req.params.id).lean();
    if (!proveedor) return res.status(404).send("Proveedor no encontrado");

    const planes = await listarPlanesService();
    res.render("proveedoresViews/editarProveedor", { proveedor, planes });
  } catch (error) {
    console.error("Error al cargar proveedor para editar:", error);
    res.status(500).send("Error al cargar proveedor");
  }
}

/* =========================================================
 * POST /proveedores/:id/editar
 * =======================================================*/
export async function actualizarProveedorController(req, res) {
  try {
    if (req.erroresValidacion) {
      const proveedor = await Proveedor.findById(req.params.id).lean();
      const planes = await listarPlanesService();
      return res.status(400).render("proveedoresViews/editarProveedor", {
        proveedor,
        errores: req.erroresValidacion,
        datos: req.body,
        planes,
      });
    }

    const activo = toBool(req.body.activo); // si no viene, será false (checkbox destildado)
    const plan = req.body.plan || null;

    const update = {
      nombreFantasia: (req.body.nombreFantasia || "").trim(),
      nombreReal: (req.body.nombreReal || "").trim(),
      cuit: (req.body.cuit || "").trim(),
      domicilio: (req.body.domicilio || "").trim(),
      domicilioFiscal: (req.body.domicilioFiscal || "").trim(),
      telefonoCelular: (req.body.telefonoCelular || "").trim(),
      telefonoFijo: (req.body.telefonoFijo || "").trim(),
      email: (req.body.email || "").trim(),
      cbu: (req.body.cbu || "").trim(),
      categoria: (req.body.categoria || "").trim(),
      condicionIva: (req.body.condicionIva || "").trim(),
      activo,
      plan,
    };

    const proveedor = await Proveedor.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!proveedor) return res.status(404).send("Proveedor no encontrado");

    req.session.mensaje = `Proveedor #${proveedor.numeroProveedor} actualizado correctamente`;
    res.redirect("/proveedores");
  } catch (error) {
    console.error("Error al actualizar proveedor:", error);
    res.status(500).send("Error al actualizar proveedor");
  }
}

/* =========================================================
 * DELETE /proveedores/:id
 * =======================================================*/
export async function eliminarProveedorController(req, res) {
  try {
    const proveedor = await Proveedor.findByIdAndDelete(req.params.id);
    if (!proveedor) return res.status(404).send("Proveedor no encontrado");

    req.session.mensaje = `Proveedor #${proveedor.numeroProveedor} eliminado correctamente`;
    res.redirect("/proveedores");
  } catch (error) {
    console.error("Error al eliminar proveedor:", error);
    res.status(500).send("Error al eliminar proveedor");
  }
}