// controllers/proveedorController.mjs
import { crearProveedorService } from "../services/proveedorService.mjs";
import { obtenerSiguienteNumeroDeProveedor } from "../utils/obtenerSiguienteNumeroDeProveedor.mjs";
import { listarPlanesService } from "../services/planesService.mjs";

import Proveedor from "../models/proveedor.mjs";

// Helper robusto para boolean
function toBool(v) {
  if (Array.isArray(v)) {
    return v.some(x => x === true || x === "true" || x === "on" || x === "1" || x === 1);
  }
  return v === true || v === "true" || v === "on" || v === "1" || v === 1;
}

/* =========================================================
 * GET /proveedores/crear
 * =======================================================*/
export async function mostrarFormularioProveedor(req, res) {
  try {
    const planes = await listarPlanesService(); // planes activos ordenados
    res.render("proveedoresViews/registroProveedor", { datos: {}, planes });
  } catch (err) {
    console.error("Error al cargar formulario proveedor:", err);
    res.status(500).send("Error al cargar formulario proveedor");
  }
}

/* =========================================================
 * POST /proveedores/crear
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

    const activo = toBool(req.body.activo);
    const plan = req.body.plan || null;

    // precioPlan (override) opcional
    let precioPlan = undefined;
    if (req.body.precioPlan !== "" && req.body.precioPlan != null) {
      const n = Number(req.body.precioPlan);
      if (!Number.isNaN(n)) precioPlan = n;
    }

    const nuevoProveedor = {
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
      numeroProveedor: nuevoNumero,
      activo,
      plan,
      ...(typeof precioPlan === "number" ? { precioPlan } : {}), // solo si vino
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
    // populate para mostrar nombre/importe del plan en el listado
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
 * GET /proveedores/:id
 * =======================================================*/
export async function verProveedorController(req, res) {
  try {
    const proveedor = await Proveedor.findById(req.params.id)
      .populate("plan", "nombre importe activo")
      .lean();

    if (!proveedor) {
      return res.status(404).send("Proveedor no encontrado");
    }

    res.render("proveedoresViews/verProveedor", { proveedor });
  } catch (error) {
    console.error("Error al obtener proveedor:", error);
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

    const activo = toBool(req.body.activo);
    const plan = req.body.plan || null;

    // Armamos $set y $unset para manejar el override correctamente
    const $set = {
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

    const $unset = {};

    // precioPlan (override): vacío => borrar; número => setear; ausente => no tocar
    if ("precioPlan" in req.body) {
      if (req.body.precioPlan === "" || req.body.precioPlan == null) {
        $unset.precioPlan = 1; // elimina override previo
      } else {
        const n = Number(req.body.precioPlan);
        if (!Number.isNaN(n)) $set.precioPlan = n;
      }
    }

    const updateDoc = Object.keys($unset).length ? { $set, $unset } : { $set };

    const proveedor = await Proveedor.findByIdAndUpdate(
      req.params.id,
      updateDoc,
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
 * POST /proveedores/:id/eliminar
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