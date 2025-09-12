// controllers/proveedorController.mjs
import { crearProveedorService } from "../services/proveedorService.mjs";
import { obtenerSiguienteNumeroDeProveedor } from "../utils/obtenerSiguienteNumeroDeProveedor.mjs";
import { listarPlanesService } from "../services/planesService.mjs";
import Proveedor from "../models/proveedor.mjs";
import Pago from "../models/pago.mjs";
import MovimientoProveedor from "../models/movimientoProveedor.mjs";

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
  try {
    const { id } = req.params;

    const proveedor = await Proveedor.findById(id)
      .populate("plan", "nombre importe activo")
      .lean();

    if (!proveedor) return res.status(404).send("Proveedor no encontrado");

    // --- Traemos movimientos ---
    const [cargos, notas, pagos] = await Promise.all([
      MovimientoProveedor.find({ proveedor: id, tipo: "cargo" }).sort({ periodo: 1 }).lean(),
      MovimientoProveedor.find({
        proveedor: id,
        tipo: { $in: ["notaCredito", "notaDebito"] },
      })
        .sort({ fecha: 1 })
        .lean(),
      Pago.find({ proveedor: id }).sort({ fecha: 1 }).lean(),
    ]);

    // Map para obtener periodo desde un cargoId
    const cargoIdToPeriodo = new Map(cargos.map(c => [String(c._id), c.periodo]));

    // --- Acumuladores por período (YYYY-MM) ---
    const sumMap = () => new Map(); // periodo -> number
    const cargoPorPeriodo = sumMap();
    const ncPorPeriodo = sumMap();
    const ndPorPeriodo = sumMap();
    const pagosPorPeriodo = sumMap();

    for (const c of cargos) {
      const per = c.periodo || "";
      const val = Number(c.importe || 0);
      cargoPorPeriodo.set(per, (cargoPorPeriodo.get(per) || 0) + val);
    }

    for (const n of notas) {
      const per = n.periodo || ""; // si tus notas tienen periodo; si no, podés derivarlo por fecha (YYYY-MM)
      const val = Number(n.importe || 0);
      if (n.tipo === "notaCredito") {
        ncPorPeriodo.set(per, (ncPorPeriodo.get(per) || 0) + val);
      } else if (n.tipo === "notaDebito") {
        ndPorPeriodo.set(per, (ndPorPeriodo.get(per) || 0) + val);
      }
    }

    for (const p of pagos) {
      // prioridad: p.periodo -> p.cargo -> (sin periodo)
      let per = (p.periodo || "").trim();
      if (!per && p.cargo) per = cargoIdToPeriodo.get(String(p.cargo)) || "";
      if (!per) continue; // si no hay forma de asignarlo a un período, no afecta el cuadro por período (igual aparece en timeline)
      const val = Number(p.importe || 0);
      pagosPorPeriodo.set(per, (pagosPorPeriodo.get(per) || 0) + val);
    }

    // Conjunto de todos los períodos presentes
    const periodos = new Set([
      ...cargoPorPeriodo.keys(),
      ...ncPorPeriodo.keys(),
      ...ndPorPeriodo.keys(),
      ...pagosPorPeriodo.keys(),
    ]);

    // Armar filas por período (orden ascendente)
    const detallePorPeriodo = Array.from(periodos)
      .filter(p => p) // sin vacíos
      .sort()         // "2025-01" < "2025-02" ...
      .map(per => {
        const cargo = cargoPorPeriodo.get(per) || 0;
        const nc = ncPorPeriodo.get(per) || 0;
        const nd = ndPorPeriodo.get(per) || 0;
        const pag = pagosPorPeriodo.get(per) || 0;
        const saldo = cargo + nd - nc - pag;
        return { periodo: per, cargo, notaDebito: nd, notaCredito: nc, pagos: pag, saldo };
      });

    // Totales
    const totales = detallePorPeriodo.reduce(
      (acc, r) => {
        acc.cargo += r.cargo;
        acc.notaDebito += r.notaDebito;
        acc.notaCredito += r.notaCredito;
        acc.pagos += r.pagos;
        acc.saldo += r.saldo;
        return acc;
      },
      { cargo: 0, notaDebito: 0, notaCredito: 0, pagos: 0, saldo: 0 }
    );

    // Timeline (últimos 20 movimientos combinados)
    const movimientos = [
      ...cargos.map(x => ({
        _id: x._id,
        tipo: "cargo",
        fecha: x.fecha || new Date(),
        periodo: x.periodo || "",
        concepto: x.concepto || `Cargo ${x.periodo || ""}`,
        importe: Number(x.importe || 0),
        signo: +1,
      })),
      ...notas.map(x => ({
        _id: x._id,
        tipo: x.tipo, // "notaCredito" / "notaDebito"
        fecha: x.fecha || new Date(),
        periodo: x.periodo || "",
        concepto: x.concepto || (x.tipo === "notaCredito" ? "Nota de crédito" : "Nota de débito"),
        importe: Number(x.importe || 0),
        signo: x.tipo === "notaCredito" ? -1 : +1,
      })),
      ...pagos.map(x => ({
        _id: x._id,
        tipo: "pago",
        fecha: x.fecha || new Date(),
        periodo: x.periodo || (x.cargo ? (cargoIdToPeriodo.get(String(x.cargo)) || "") : ""),
        concepto: x.observacion || `Pago ${x.metodo || ""} ${x.comprobante || ""}`.trim(),
        importe: Number(x.importe || 0),
        signo: -1,
        metodo: x.metodo,
        comprobante: x.comprobante,
      })),
    ]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 20);

    res.render("proveedoresViews/verProveedor", {
      proveedor,
      detallePorPeriodo,
      totales,
      movimientos,
    });
  } catch (error) {
    console.error("Error al mostrar proveedor:", error);
    res.status(500).send("Error al mostrar proveedor");
  }
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