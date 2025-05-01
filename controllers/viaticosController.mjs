// controllers/viaticosController.mjs

import {
  obtenerDatosFormularioViatico,
  obtenerUltimosViaticos,
  obtenerTodosLosViaticos,
  crearViatico,
  eliminarViaticoPorId,
  obtenerViaticoPorId,
  obtenerPersonasDisponiblesOrdenadas,
  actualizarViatico,
  generarPDFViatico
} from "../services/viaticosService.mjs";


// Mostrar el formulario de creación de viáticos
export const mostrarFormularioViatico = async (req, res) => {
  try {
    const { numeroDeViaje, listaDePersonasDisponibles } = await obtenerDatosFormularioViatico();
    res.render("viaticosViews/crearViatico", {
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
    res.render("viaticosViews/dashboardViaticos", {
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
    res.render("viaticosViews/dashboardViaticos", {
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


// Ver Viatico
export const verViaticoController = async (req, res) => {
  try {
    const viatico = await obtenerViaticoPorId(req.params.id);
    const listaDePersonasDisponibles = await obtenerPersonasDisponiblesOrdenadas();
    if (!viatico) return res.status(404).send("Viático no encontrado");

    res.render("viaticosViews/verViatico", {
      title: "Detalle del Viático",
      viatico,
      listaDePersonasDisponibles,
      soloLectura: true,
    });
  } catch (error) {
    console.error("Error al mostrar viático:", error);
    res.status(500).send("Error al mostrar viático");
  }
};


// Controlador para mostrar un viático en modo edición
export async function mostrarFormularioEditarViatico(req, res) {
  try {
    const viatico = await obtenerViaticoPorId(req.params.id);
    const listaDePersonasDisponibles = await obtenerPersonasDisponiblesOrdenadas();

    res.render("viaticosViews/editarViatico", {
      viatico,
      listaDePersonasDisponibles
    });
  } catch (error) {
    console.error("Error al mostrar formulario de edición:", error);
    res.status(500).send("Error al mostrar formulario de edición");
  }
}


// Controlador para actualizar un viático existente
export async function actualizarViaticoController(req, res) {
  try {
    await actualizarViaticoPorId(req.params.id, req.body);
    res.redirect("/viaticos/dashboard");
  } catch (error) {
    console.error("Error al actualizar viático:", error);
    res.status(500).send("Error al actualizar viático");
  }
};


// Editar viatico
export async function editarViaticoController(req, res) {
  try {
    const { id } = req.params;
    await actualizarViatico(id, req.body);
    res.redirect("/viaticos/dashboard");
  } catch (error) {
    console.error("Error al editar viático:", error);
    res.status(500).send("Error al editar viático");
  };
};


// Generar PDF desde verviatico
export const generarPDFViaticoController = async (req, res) => {
  try {
    const { id } = req.params;
    const pdfBuffer = await generarPDFViatico(id, req);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=viatico-${id}.pdf`,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error al generar PDF del viático:", error);
    res.status(500).send("Error al generar PDF");
  }
};


// Renderisar y mostrar verViaticoPdf
export async function mostrarVistaPDF(req, res) {
  const { id } = req.params;
  try {
    const viatico = await obtenerViaticoPorId(id);
    res.render("viaticosViews/verViaticoPdf", { viatico, layout: false });
  } catch (error) {
    res.status(500).send("Error al cargar PDF");
  };
};

