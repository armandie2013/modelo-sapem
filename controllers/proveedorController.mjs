import {
  crearProveedorService,
  obtenerProveedoresService,
} from "../services/proveedorService.mjs";

import { obtenerSiguienteNumeroDeProveedor } from "../utils/obtenerSiguienteNumeroDeProveedor.mjs";
import { listarPlanesService } from "../services/planesService.mjs"; // ← añadido

import Proveedor from "../models/proveedor.mjs";

// GET /proveedores/crear
export async function mostrarFormularioProveedor(req, res) {
  const planes = await listarPlanesService(); // ← listado de planes para el select
  res.render("proveedoresViews/registroProveedor", { datos: {}, planes });
}

// POST /proveedores/crear
export async function crearProveedorController(req, res) {
  try {
    // ⚠️ Si hay errores de validación, renderiza la vista con los errores
    if (req.erroresValidacion) {
      const planes = await listarPlanesService();
      return res.status(400).render("proveedoresViews/registroProveedor", {
        errores: req.erroresValidacion,
        datos: req.body,
        planes, // ← para mantener el select
      });
    }

    const nuevoNumero = await obtenerSiguienteNumeroDeProveedor();

    // Normalizaciones suaves
    const plan = req.body.plan || undefined;
    let precioPlan = undefined;
    if (req.body.precioPlan !== undefined && req.body.precioPlan !== "") {
      const n = Number(req.body.precioPlan);
      if (!Number.isNaN(n)) precioPlan = n;
    }

    const nuevoProveedor = {
      ...req.body,
      plan,
      precioPlan,
      numeroProveedor: nuevoNumero,
    };

    await crearProveedorService(nuevoProveedor);
    req.session.mensaje = `Proveedor #${nuevoNumero} creado correctamente`;
    res.redirect("/proveedores");
  } catch (error) {
    console.error("Error al crear proveedor:", error);
    res.status(500).send("Error al crear proveedor");
  }
}

// GET /proveedores
export async function listarProveedoresController(req, res) {
  try {
    const proveedores = await obtenerProveedoresService(); // podés hacer populate en el service si querés ver el nombre del plan
    res.render("proveedoresViews/listadoProveedores", { proveedores });
  } catch (error) {
    console.error("Error al listar proveedores:", error);
    res.status(500).send("Error al listar proveedores");
  }
}

// GET /proveedores/:id
export async function verProveedorController(req, res) {
  try {
    const proveedor = await Proveedor.findById(req.params.id).populate("plan"); // ← populate para ver detalle del plan
    if (!proveedor) {
      return res.status(404).send("Proveedor no encontrado");
    }

    res.render("proveedoresViews/verProveedor", { proveedor });
  } catch (error) {
    console.error("Error al obtener proveedor:", error);
    res.status(500).send("Error al mostrar proveedor");
  }
}

// GET /proveedores/:id/editar
export async function mostrarFormularioEditarProveedor(req, res) {
  try {
    const proveedor = await Proveedor.findById(req.params.id);
    if (!proveedor) return res.status(404).send("Proveedor no encontrado");

    const planes = await listarPlanesService(); // ← para poblar el select
    res.render("proveedoresViews/editarProveedor", { proveedor, planes });
  } catch (error) {
    console.error("Error al cargar proveedor para editar:", error);
    res.status(500).send("Error al cargar proveedor");
  }
}

// POST /proveedores/:id/editar
export async function actualizarProveedorController(req, res) {
  try {
    // 🛑 Si hay errores de validación, mostrar nuevamente el formulario con errores
    if (req.erroresValidacion) {
      const proveedor = await Proveedor.findById(req.params.id);
      const planes = await listarPlanesService();
      return res.status(400).render("proveedoresViews/editarProveedor", {
        proveedor,
        errores: req.erroresValidacion,
        datos: req.body,
        planes, // ← mantener el select
      });
    }

    // Normalizaciones
    const update = {
      ...req.body,
      plan: req.body.plan || undefined,
      precioPlan:
        req.body.precioPlan !== "" && req.body.precioPlan != null
          ? Number(req.body.precioPlan)
          : undefined,
    };

    // ✅ Si no hay errores, actualizar normalmente
    const proveedor = await Proveedor.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!proveedor) return res.status(404).send("Proveedor no encontrado");

    req.session.mensaje = `Proveedor #${proveedor.numeroProveedor} actualizado correctamente`;
    res.redirect("/proveedores");
  } catch (error) {
    console.error("Error al actualizar proveedor:", error);
    res.status(500).send("Error al actualizar proveedor");
  }
}

// POST /proveedores/:id/eliminar
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