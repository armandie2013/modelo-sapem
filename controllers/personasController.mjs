import PersonaDisponible from "../models/personaDisponible.mjs";

// Mostrar el formulario para agregar una persona
export const mostrarFormularioAgregar = (req, res) => {
  res.render("agregarPersona", { title: "Agregar Persona" });
};

// Agregar persona a la base de datos
export const agregarPersona = async (req, res) => {
  try {
    const nuevaPersona = new PersonaDisponible(req.body);
    await nuevaPersona.save();
    res.redirect("/personas/dashboard");
  } catch (error) {
    console.error("Error al agregar persona:", error);
    res.status(500).send("Error al agregar persona");
  }
};

// Listar todas las personas disponibles
export const listarPersonas = async (req, res) => {
  try {
    const personas = await PersonaDisponible.find().sort({ numeroOrden: 1 });
    res.render("dashboardPersonas", { title: "Personas Disponibles", personas });
  } catch (error) {
    console.error("Error al listar personas:", error);
    res.status(500).send("Error al obtener personas");
  }
};

// Mostrar formulario de edición
export const mostrarFormularioEditar = async (req, res) => {
  try {
    const persona = await PersonaDisponible.findById(req.params.id);
    if (!persona) return res.status(404).send("Persona no encontrada");
    res.render("editarPersona", { title: "Editar Persona", persona });
  } catch (error) {
    console.error("Error al buscar persona:", error);
    res.status(500).send("Error al buscar persona");
  }
};

// Actualizar persona
export const actualizarPersona = async (req, res) => {
  try {
    await PersonaDisponible.findByIdAndUpdate(req.params.id, req.body);
    res.redirect("/personas/dashboard");
  } catch (error) {
    console.error("Error al actualizar persona:", error);
    res.status(500).send("Error al actualizar persona");
  }
};

// Eliminar persona
export const eliminarPersona = async (req, res) => {
  try {
    await PersonaDisponible.findByIdAndDelete(req.params.id);
    res.redirect("/personas/dashboard");
  } catch (error) {
    console.error("Error al eliminar persona:", error);
    res.status(500).send("Error al eliminar persona");
  }
};