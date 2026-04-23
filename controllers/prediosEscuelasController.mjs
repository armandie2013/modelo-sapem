import {
  crearPredioEscuelaService,
  obtenerPrediosEscuelasService,
  obtenerPredioEscuelaPorIdService,
  actualizarPredioEscuelaService,
  eliminarPredioEscuelaService,
} from "../services/prediosEscuelasService.mjs";

export async function mostrarFormularioCrearPredioEscuelaController(req, res) {
  try {
    res.render("prediosEscuelasViews/crearPredioEscuela", {
      errores: [],
      datos: {},
    });
  } catch (error) {
    console.error("Error al mostrar formulario de crear predio escuela:", error);
    res.status(500).send("Error al cargar el formulario");
  }
}

export async function crearPredioEscuelaController(req, res) {
  try {
    if (req.erroresValidacion) {
      return res.status(400).render("prediosEscuelasViews/crearPredioEscuela", {
        errores: req.erroresValidacion,
        datos: req.body,
      });
    }

    await crearPredioEscuelaService({
      predio: req.body.predio,
      cue: req.body.cue,
      nombreEscuela: req.body.nombreEscuela,
      direccion: req.body.direccion,
      ciudad: req.body.ciudad,
      departamento: req.body.departamento,
      megabytesAsignados: req.body.megabytesAsignados,
      isp: req.body.isp,
      tecnologia: req.body.tecnologia,
    });

    req.session.mensaje = "Predio de escuela creado correctamente";
    res.redirect("/predios-escuelas/dashboard");
  } catch (error) {
    console.error("Error al crear predio escuela:", error);
    res.status(500).send("Error al crear el registro");
  }
}

export async function dashboardPrediosEscuelasController(req, res) {
  try {
    const prediosEscuelas = await obtenerPrediosEscuelasService();

    res.render("prediosEscuelasViews/dashboardPrediosEscuelas", {
      prediosEscuelas,
      mensaje: req.session.mensaje || null,
    });

    req.session.mensaje = null;
  } catch (error) {
    console.error("Error al listar predios escuelas:", error);
    res.status(500).send("Error al obtener los registros");
  }
}

export async function verPredioEscuelaController(req, res) {
  try {
    const predioEscuela = await obtenerPredioEscuelaPorIdService(req.params.id);

    if (!predioEscuela) {
      return res.status(404).send("Registro no encontrado");
    }

    res.render("prediosEscuelasViews/verPredioEscuela", {
      predioEscuela,
    });
  } catch (error) {
    console.error("Error al ver predio escuela:", error);
    res.status(500).send("Error al obtener el registro");
  }
}

export async function mostrarFormularioEditarPredioEscuelaController(req, res) {
  try {
    const predioEscuela = await obtenerPredioEscuelaPorIdService(req.params.id);

    if (!predioEscuela) {
      return res.status(404).send("Registro no encontrado");
    }

    res.render("prediosEscuelasViews/editarPredioEscuela", {
      predioEscuela,
      errores: [],
    });
  } catch (error) {
    console.error("Error al mostrar edición de predio escuela:", error);
    res.status(500).send("Error al cargar el registro");
  }
}

export async function editarPredioEscuelaController(req, res) {
  try {
    const predioEscuela = await obtenerPredioEscuelaPorIdService(req.params.id);

    if (!predioEscuela) {
      return res.status(404).send("Registro no encontrado");
    }

    if (req.erroresValidacion) {
      return res.status(400).render("prediosEscuelasViews/editarPredioEscuela", {
        predioEscuela: {
          ...predioEscuela.toObject(),
          ...req.body,
        },
        errores: req.erroresValidacion,
      });
    }

    await actualizarPredioEscuelaService(req.params.id, {
      predio: req.body.predio,
      cue: req.body.cue,
      nombreEscuela: req.body.nombreEscuela,
      direccion: req.body.direccion,
      ciudad: req.body.ciudad,
      departamento: req.body.departamento,
      megabytesAsignados: req.body.megabytesAsignados,
      isp: req.body.isp,
      tecnologia: req.body.tecnologia,
    });

    req.session.mensaje = "Predio de escuela editado correctamente";
    res.redirect("/predios-escuelas/dashboard");
  } catch (error) {
    console.error("Error al editar predio escuela:", error);
    res.status(500).send("Error al editar el registro");
  }
}

export async function eliminarPredioEscuelaController(req, res) {
  try {
    const predioEscuela = await obtenerPredioEscuelaPorIdService(req.params.id);

    if (!predioEscuela) {
      return res.status(404).send("Registro no encontrado");
    }

    await eliminarPredioEscuelaService(req.params.id);

    req.session.mensaje = "Predio de escuela eliminado correctamente";
    res.redirect("/predios-escuelas/dashboard");
  } catch (error) {
    console.error("Error al eliminar predio escuela:", error);
    res.status(500).send("Error al eliminar el registro");
  }
}