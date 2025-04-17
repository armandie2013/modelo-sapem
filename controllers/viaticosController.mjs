import Viatico from "../models/viatico.mjs";
import PersonaDisponible from "../models/personaDisponible.mjs";
import Contador from "../models/contador.mjs";

export async function crearViaticoController(req, res) {
  try {
    console.log("Datos recibidos:", req.body);

    const {
      fechaDeCreacion,
      areaSolicitante,
      cantidadDeViajantes,
      cargo,
      importeViatico,
      numeroDeViaje,
      motivoDelViaje,
      origen,
      destino,
      montoTotalViatico,
      adicionalEnEfectivo,
      devolucionEnEfectivo,
      pendienteDeRendicion,
      valesCombustible,
      valorVale,
      cantidadVale,
      totalVale,
      vehiculoUtilizado,
    } = req.body;

    // Asegurarnos de que siempre sea un array
    let viajantes = req.body.nombreSolicitante;
    if (!Array.isArray(viajantes)) {
      viajantes = [viajantes];
    }

    const nuevoViatico = new Viatico({
      fechaDeCreacion,
      areaSolicitante,
      cantidadDeViajantes,
      viajantes,
      cargo,
      importeViatico,
      numeroDeViaje,
      motivoDelViaje,
      origen,
      destino,
      montoTotalViatico,
      adicionalEnEfectivo,
      devolucionEnEfectivo,
      pendienteDeRendicion,
      valesCombustible: valesCombustible === "on" || valesCombustible === true,
      valorVale,
      cantidadVale,
      totalVale,
      vehiculoUtilizado,
      creadoPor: req.session.usuario?.nombre || "Desconocido",
    });
    await nuevoViatico.save();

    console.log("Viático creado correctamente");
    res.redirect("/viaticos/dashboard"); // o a dashboard si tenés
  } catch (error) {
    console.error("Error al crear el viático:", error);
    res.status(500).send({
      mensaje: "Error al crear el viático",
      error: error.message,
    });
  }
}

// Mostrar los 5 últimos viajes
export const mostrarDashboardViaticos = async (req, res) => {
  try {
    const viaticosRecientes = await Viatico.find()
      .sort({ fechaDeCreacion: -1 })
      .limit(5);
    res.render("dashboardViaticos", {
      title: "Últimos Viáticos",
      viaticos: viaticosRecientes,
      mostrarTodos: false,
    });
  } catch (error) {
    console.error("Error al cargar dashboard de viáticos:", error);
    res.status(500).send("Error al cargar el dashboard");
  }
};

// Mostrar todos los viajes
export const mostrarTodosLosViaticos = async (req, res) => {
  try {
    const todosLosViaticos = await Viatico.find().sort({ fechaDeCreacion: -1 });
    res.render("dashboardViaticos", {
      title: "Todos los Viáticos",
      viaticos: todosLosViaticos,
      mostrarTodos: true,
    });
  } catch (error) {
    console.error("Error al cargar todos los viáticos:", error);
    res.status(500).send("Error al cargar todos los viáticos");
  }
};

export const mostrarFormularioViatico = async (req, res) => {
  try {
    // Obtener el próximo número de viaje
    const contador = await Contador.findOneAndUpdate(
      { nombre: "numeroDeViaje" },
      { $inc: { valor: 1 } },
      { new: true, upsert: true }
    );

    const numeroDeViaje = contador.valor;

    // Obtener listado de personas disponibles
    const listaDePersonasDisponibles = await PersonaDisponible.find().sort({
      nombreApellido: 1,
    });

    // Renderizar formulario con datos
    res.render("crearViatico", {
      numeroDeViaje,
      listaDePersonasDisponibles,
    });
  } catch (error) {
    console.error("Error al mostrar formulario de viático:", error);
    res.status(500).send("Error al mostrar formulario de viático");
  }
};
