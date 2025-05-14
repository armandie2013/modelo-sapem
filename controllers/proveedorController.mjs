import {
  crearProveedorService,
  obtenerProveedoresService,
} from "../services/proveedorService.mjs";

import { obtenerSiguienteNumeroDeProveedor } from "../utils/obtenerSiguienteNumeroDeProveedor.mjs";

import Proveedor from "../models/proveedor.mjs";

export async function mostrarFormularioProveedor(req, res) {
  res.render("proveedoresViews/registroProveedor", { datos: {} });
}

export async function crearProveedorController(req, res) {
  try {
    // ⚠️ Si hay errores de validación, renderiza la vista con los errores
    if (req.erroresValidacion) {
      return res.status(400).render("proveedoresViews/registroProveedor", {
        errores: req.erroresValidacion,
        datos: req.body,
      });
    }

    const nuevoNumero = await obtenerSiguienteNumeroDeProveedor();

    const nuevoProveedor = {
      ...req.body,
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

export async function listarProveedoresController(req, res) {
  try {
    const proveedores = await obtenerProveedoresService();
    res.render("proveedoresViews/listadoProveedores", { proveedores });
  } catch (error) {
    console.error("Error al listar proveedores:", error);
    res.status(500).send("Error al listar proveedores");
  }
}

export async function verProveedorController(req, res) {
  try {
    const proveedor = await Proveedor.findById(req.params.id);
    if (!proveedor) {
      return res.status(404).send("Proveedor no encontrado");
    }

    res.render("proveedoresViews/verProveedor", { proveedor });
  } catch (error) {
    console.error("Error al obtener proveedor:", error);
    res.status(500).send("Error al mostrar proveedor");
  }
}

export async function mostrarFormularioEditarProveedor(req, res) {
  try {
    const proveedor = await Proveedor.findById(req.params.id);
    if (!proveedor) return res.status(404).send("Proveedor no encontrado");

    res.render("proveedoresViews/editarProveedor", { proveedor });
  } catch (error) {
    console.error("Error al cargar proveedor para editar:", error);
    res.status(500).send("Error al cargar proveedor");
  }
}

export async function actualizarProveedorController(req, res) {
  try {
    // 🛑 Si hay errores de validación, mostrar nuevamente el formulario con errores
    if (req.erroresValidacion) {
      const proveedor = await Proveedor.findById(req.params.id);
      return res.status(400).render("proveedoresViews/editarProveedor", {
        proveedor,
        errores: req.erroresValidacion,
        datos: req.body,
      });
    }

    // ✅ Si no hay errores, actualizar normalmente
    const proveedor = await Proveedor.findByIdAndUpdate(req.params.id, req.body, {
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

