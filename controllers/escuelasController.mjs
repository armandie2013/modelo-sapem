// controllers/escuelasController.mjs
import {
  obtenerEscuelasService,
  obtenerEscuelaPorIdService,
  crearEscuelaService,
  actualizarEscuelaService,
  eliminarEscuelaService,
  obtenerUltimaEscuelaService,
  obtenerEscuelaPorId,
  generarPDFEscuelaService 
} from "../services/escuelasService.mjs";

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
    const ultimaEscuela = await obtenerUltimaEscuelaService();
    const numeroTicket = ultimaEscuela ? ultimaEscuela.numeroTicket + 1 : 1;

    res.render("escuelasViews/crearEscuela", { numeroTicket });
  } catch (error) {
    console.error("Error al mostrar formulario de creación:", error);
    res.status(500).send("Error al cargar el formulario");
  }
}

export async function crearEscuelaController(req, res) {
  try {
    const ultimaEscuela = await obtenerUltimaEscuelaService();
    const nuevoNumeroTicket = ultimaEscuela ? ultimaEscuela.numeroTicket + 1 : 1;

    const datosEscuela = {
      ...req.body,
      numeroTicket: nuevoNumeroTicket,
      fechaCreacion: new Date(),
      creadoPor: `${req.session.usuario.nombre} ${req.session.usuario.apellido}`,
      estado: "Abierto"
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
    res.render("escuelasViews/editarEscuela", { escuela, usuario: req.session.usuario });
  } catch (error) {
    console.error("Error al cargar escuela:", error);
    res.status(500).send("Error al editar escuela");
  }
}

export async function actualizarEscuelaController(req, res) {
  try {
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

    // 📌 Agregar observaciones técnicas
    datosActualizados.observacionesTecnica = req.body.observacionesTecnica || "";

    // 📎 Guardar imágenes nuevas si se cargaron
    if (req.files && req.files.length > 0) {
      const nuevasImagenes = req.files.map(file => file.filename);

      if (!escuela.imagenes) escuela.imagenes = [];
      escuela.imagenes.push(...nuevasImagenes);

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
