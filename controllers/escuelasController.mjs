// controllers/escuelasController.mjs
import {
  obtenerEscuelasService,
  obtenerEscuelaPorIdService,
  crearEscuelaService,
  actualizarEscuelaService,
  eliminarEscuelaService,
  obtenerUltimaEscuelaService,
  obtenerEscuelaPorId,
  generarPDFEscuelaService,
} from "../services/escuelasService.mjs";

import { obtenerSiguienteNumeroDeTicket } from "../utils/obtenerSiguienteNumeroDeTicket.mjs";

import Escuela from "../models/escuela.mjs";

import fs from "fs/promises";
import path from "path";

export async function listarEscuelasController(req, res) {
  try {
    const escuelas = await obtenerEscuelasService();
    res.render("escuelasViews/dashboardEscuelas", { escuelas });
  } catch (error) {
    console.error("Error al listar escuelas:", error);
    res.status(500).send("Error al obtener escuelas");
  }
}

export async function mostrarFormularioCrearEscuelaController(req, res) {
  try {
    res.render("escuelasViews/crearEscuela");
  } catch (error) {
    console.error("Error al mostrar formulario de creación:", error);
    res.status(500).send("Error al cargar el formulario");
  }
}

export async function crearEscuelaController(req, res) {
  try {
    // Obtener número de ticket único usando contador general
    const nuevoNumeroTicket = await obtenerSiguienteNumeroDeTicket("escuelas");

    const datosEscuela = {
      ...req.body,
      numeroTicket: nuevoNumeroTicket,
      fechaCreacion: new Date(),
      creadoPor: `${req.session.usuario.nombre} ${req.session.usuario.apellido}`,
      estado: "Abierto",
    };

    await crearEscuelaService(datosEscuela);
    res.redirect("/escuelas/dashboard");
  } catch (error) {
    console.error("Error al crear escuela:", error);
    res.status(500).send("Error al crear escuela");
  }
}

export async function mostrarFormularioEditarEscuelaController(req, res) {
  try {
    const escuela = await obtenerEscuelaPorIdService(req.params.id);
    res.render("escuelasViews/editarEscuela", {
      escuela,
      usuario: req.session.usuario,
    });
  } catch (error) {
    console.error("Error al cargar escuela:", error);
    res.status(500).send("Error al editar escuela");
  }
}

export async function actualizarEscuelaController(req, res) {
  try {
    console.log("📩 Se recibió formulario de edición");
    console.log("📦 Archivos recibidos:", req.files);
    console.log("✏️ Body:", req.body);

    const { id } = req.params;
    const datosActualizados = { ...req.body };

    const escuela = await obtenerEscuelaPorId(id);
    if (!escuela) return res.status(404).send("Escuela no encontrada");

    // 🛡️ Reglas del estado
    const esAdmin = req.session.usuario?.rol === "admin";
    const estadoOriginal = escuela.estado;
    const estadoNuevo = datosActualizados.estado;

    if (!esAdmin && estadoOriginal === "Cerrado" && estadoNuevo === "Abierto") {
      datosActualizados.estado = "Cerrado";
    }

    // 📌 Agregar campos manualmente
    datosActualizados.detalleDelCaso = req.body.detalleDelCaso || "";
    datosActualizados.observacionesTecnica =
      req.body.observacionesTecnica || "";
    datosActualizados.editadoPor = `${req.session.usuario.nombre} ${req.session.usuario.apellido}`;

    // 📎 Guardar imágenes nuevas si se cargaron
    if (req.files && req.files.length > 0) {
      const nuevasImagenes = req.files.map((file) => file.filename);

      // Asegurar que escuela.imagenes existe
      if (!Array.isArray(escuela.imagenes)) {
        escuela.imagenes = [];
      }

      // Verificar que no se superen las 3
      const totalImagenes = escuela.imagenes.length + nuevasImagenes.length;
      if (totalImagenes > 3) {
        return res.status(400).send(`Solo se permiten 3 imágenes por caso.`);
      }

      // Agregar nuevas sin eliminar las existentes
      const nuevasImagenesUnicas = nuevasImagenes.filter(
        (nombre) => !escuela.imagenes.includes(nombre)
      );
      const imagenesActualizadas = [
        ...escuela.imagenes,
        ...nuevasImagenesUnicas,
      ];

      datosActualizados.imagenes = imagenesActualizadas;
    } else {
      // Si no se subieron nuevas imágenes, mantener las existentes
      datosActualizados.imagenes = escuela.imagenes;
    }

    await actualizarEscuelaService(id, datosActualizados);
    res.redirect("/escuelas/dashboard");
  } catch (error) {
    console.error("Error al actualizar escuela:", error);
    res.status(500).send("Error al actualizar la escuela");
  }
}

export async function eliminarEscuelaController(req, res) {
  try {
    await eliminarEscuelaService(req.params.id);
    res.redirect("/escuelas/dashboard");
  } catch (error) {
    console.error("Error al eliminar escuela:", error);
    res.status(500).send("Error al eliminar escuela");
  }
}

export async function verEscuelaController(req, res) {
  try {
    const escuela = await obtenerEscuelaPorIdService(req.params.id);
    res.render("escuelasViews/verEscuela", { escuela });
  } catch (error) {
    console.error("Error al obtener escuela:", error);
    res.status(500).send("Error al obtener detalles");
  }
}

export async function generarPDFEscuelaController(req, res) {
  try {
    const escuela = await obtenerEscuelaPorId(req.params.id);
    if (!escuela) {
      return res.status(404).send("Escuela no encontrada");
    }

    const pdfBuffer = await generarPDFEscuelaService(escuela);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=escuela-${escuela.numeroTicket}.pdf`,
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error al generar PDF de escuela:", error);
    res.status(500).send("Error al generar PDF");
  }
}

export async function eliminarImagenEscuelaController(req, res) {
  const { id, nombre } = req.params;
  try {
    const escuela = await Escuela.findById(id);
    if (!escuela) return res.status(404).send("Escuela no encontrada");

    if (escuela.estado === "Cerrado") {
      return res.status(403).send("No se pueden eliminar imágenes de un caso cerrado");
    }

    // Verificamos que el array exista
    if (!Array.isArray(escuela.imagenes)) escuela.imagenes = [];

    // Filtrar la imagen a eliminar
    escuela.imagenes = escuela.imagenes.filter((img) => img !== nombre);
    await escuela.save();

    // Eliminar físicamente la imagen
    const rutaImagen = path.resolve(
      "public",
      "uploads",
      "escuelas",
      String(escuela.numeroTicket),
      nombre
    );

    try {
      await fs.unlink(rutaImagen);
      console.log("🗑️ Imagen eliminada físicamente:", rutaImagen);
    } catch (error) {
      console.warn("⚠️ No se pudo eliminar la imagen del disco:", rutaImagen);
    }

    // Redirigir al formulario de edición
    res.redirect(`/escuelas/${id}/editar`);
  } catch (error) {
    console.error("❌ Error al eliminar imagen:", error);
    res.status(500).send("Error al eliminar imagen");
  }
}
