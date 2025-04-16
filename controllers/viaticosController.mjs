import Viatico from "../models/viatico.mjs";

export async function crearViaticoController(req, res) {
  try {
    console.log("Datos recibidos:", req.body);

    const {
      fechaDeCreacion,
      areaSolicitante,
      cantidadDeViajantes,
      nombreSolicitante,
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
      creadoPor,
    } = req.body;

    const nuevoViatico = new Viatico({
      fechaDeCreacion,
      areaSolicitante,
      cantidadDeViajantes,
      nombreSolicitante,
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
      creadoPor,
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
};

// Mostrar los 5 últimos viajes
export const mostrarDashboardViaticos = async (req, res) => {
  try {
    const viaticosRecientes = await Viatico.find().sort({ fechaDeCreacion: -1 }).limit(5);
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