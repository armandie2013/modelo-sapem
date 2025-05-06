// controllers/escuelasController.mjs
import {
  obtenerEscuelasService,
  obtenerEscuelaPorIdService,
  crearEscuelaService,
  actualizarEscuelaService,
  eliminarEscuelaService,
  obtenerUltimaEscuelaService
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
    res.render("escuelasViews/editarEscuela", { escuela });
  } catch (error) {
    console.error("Error al cargar escuela:", error);
    res.status(500).send("Error al editar escuela");
  }
}

export async function actualizarEscuelaController(req, res) {
  try {
    await actualizarEscuelaService(req.params.id, req.body);
    res.redirect("/escuelas/dashboard");
  } catch (error) {
    console.error("Error al actualizar escuela:", error);
    res.status(500).send("Error al actualizar escuela");
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
