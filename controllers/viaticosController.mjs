// controllers/viaticosController.mjs

import {
  obtenerDatosFormularioViatico,
  obtenerUltimosViaticos,
  obtenerTodosLosViaticos,
  crearViatico, eliminarViaticoPorId
} from "../services/viaticosService.mjs";

// Mostrar el formulario de creación de viáticos
export const mostrarFormularioViatico = async (req, res) => {
  try {
    const { numeroDeViaje, listaDePersonasDisponibles } = await obtenerDatosFormularioViatico();
    res.render("crearViatico", {
      title: "Crear Viatico",
      numeroDeViaje,
      listaDePersonasDisponibles,
    });
  } catch (error) {
    console.error("Error al mostrar formulario de viático:", error);
    res.status(500).send("Error al mostrar formulario de viático");
  }
};


// Crear nuevo viático
export const crearViaticoController = async (req, res) => {
  try {
    await crearViatico(req, res);
    console.log("✅ Viático creado correctamente");
    res.redirect("/viaticos/dashboard");
  } catch (error) {
    console.error("❌ Error al crear el viático:", error);
    res.status(500).send({ mensaje: "Error al crear el viático", error: error.message });
  }
};

// Mostrar los 5 últimos viáticos
export const mostrarDashboardViaticos = async (req, res) => {
  try {
    const viaticos = await obtenerUltimosViaticos();
    res.render("dashboardViaticos", {
      title: "Últimos Viáticos",
      viaticos,
      mostrarTodos: false,
    });
  } catch (error) {
    console.error("Error al cargar dashboard de viáticos:", error);
    res.status(500).send("Error al cargar el dashboard");
  }
};


// Mostrar todos los viáticos
export const mostrarTodosLosViaticos = async (req, res) => {
  try {
    const viaticos = await obtenerTodosLosViaticos();
    res.render("dashboardViaticos", {
      title: "Todos los Viáticos",
      viaticos,
      mostrarTodos: true,
    });
  } catch (error) {
    console.error("Error al cargar todos los viáticos:", error);
    res.status(500).send("Error al cargar todos los viáticos");
  }
};


// Eliminar viatico por id
export const eliminarViaticoController = async (req, res) => {
  try {
    const { id } = req.params;
    await eliminarViaticoPorId(id);
    console.log(`🗑️ Viático eliminado con ID: ${id}`);
    res.redirect("/viaticos/dashboard/todos");
  } catch (error) {
    console.error("❌ Error al eliminar viático:", error);
    res.status(500).send("Error al eliminar viático");
  }
};