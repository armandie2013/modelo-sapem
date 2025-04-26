import {
  obtenerPersonasOrdenadas,
  obtenerPersonaPorId,
  agregarPersonaService,
  actualizarPersonaService,
  eliminarPersonaPorId
} from "../services/personasService.mjs";

// Mostrar formulario para agregar
export const mostrarFormularioAgregar = (req, res) => {
  res.render("personasViews/agregarPersona", { title: "Agregar Persona" });
};

// Agregar persona
export const agregarPersona = async (req, res) => {
  try {
    await agregarPersonaService(req.body);
    res.redirect("/personas/dashboard");
  } catch (error) {
    console.error("Error al agregar persona:", error);
    res.status(500).send({ mensaje: "Error al agregar persona", error: error.message });
  }
};

// Listar personas
export const listarPersonas = async (req, res) => {
  try {
    const personas = await obtenerPersonasOrdenadas();
    res.render("personasViews/dashboardPersonas", { title: "Personal SAPEM", personas });
  } catch (error) {
    console.error("Error al listar personas:", error);
    res.status(500).send({ mensaje: "Error al listar personas", error: error.message });
  }
};

// Mostrar formulario de edición
export const mostrarFormularioEditar = async (req, res) => {
  try {
    const persona = await obtenerPersonaPorId(req.params.id);
    if (!persona) return res.status(404).send("Persona no encontrada");
    res.render("personasViews/editarPersona", { title: "Editar Persona", persona });
  } catch (error) {
    console.error("Error al buscar persona:", error);
    res.status(500).send({ mensaje: "Error al buscar persona", error: error.message });
  }
};

// Actualizar persona
export const actualizarPersona = async (req, res) => {
  try {
    await actualizarPersonaService(req.params.id, req.body);
    res.redirect("/personas/dashboard");
  } catch (error) {
    console.error("Error al actualizar persona:", error);
    res.status(500).send({ mensaje: "Error al actualizar persona", error: error.message });
  }
};

// Eliminar persona
export const eliminarPersona = async (req, res) => {
  try {
    await eliminarPersonaPorId(req.params.id);
    res.redirect("/personas/dashboard");
  } catch (error) {
    console.error("Error al eliminar persona:", error);
    res.status(500).send({ mensaje: "Error al eliminar persona", error: error.message });
  }
};