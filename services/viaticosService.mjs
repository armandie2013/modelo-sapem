import Viatico from "../models/viatico.mjs";
import PersonaDisponible from "../models/personaDisponible.mjs";
import Contador from "../models/contador.mjs";

// Obtener datos necesarios para renderizar el formulario
export async function obtenerDatosFormularioViatico() {
  const contador = await Contador.findOneAndUpdate(
    { nombre: "numeroDeViaje" },
    { $inc: { valor: 1 } },
    { new: true, upsert: true }
  );

  const numeroDeViaje = contador.valor;
  const listaDePersonasDisponibles = await PersonaDisponible.find().sort({ nombreApellido: 1 });

  return { numeroDeViaje, listaDePersonasDisponibles };
}


// Obtener los 5 viáticos más recientes
export async function obtenerUltimosViaticos() {
  return await Viatico.find().sort({ fechaDeCreacion: -1 }).limit(5);
}


// Obtener todos los viáticos
export async function obtenerTodosLosViaticos() {
  return await Viatico.find().sort({ fechaDeCreacion: -1 });
}


// Crear un nuevo viático
export async function crearViatico(req, res) {
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
    fechaDeSalida,
    fechaDellegada,
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

  const viajantes = [];
  for (let i = 0; i < nombreSolicitante.length; i++) {
    if (nombreSolicitante[i]) {
      viajantes.push({
        nombre: nombreSolicitante[i],
        cargo: cargo[i],
        importe: parseFloat(importeViatico[i]) || 0,
      });
    };
  };

  const nombreCompleto = req.session.usuario ? `${req.session.usuario.nombre} ${req.session.usuario.apellido}` : "Desconocido";

  const nuevoViatico = new Viatico({
    fechaDeCreacion,
    areaSolicitante,
    cantidadDeViajantes: parseInt(cantidadDeViajantes),
    numeroDeViaje: parseInt(numeroDeViaje),
    motivoDelViaje,
    origen,
    destino,
    fechaDeSalida,
    fechaDeLlegada: fechaDellegada,
    montoTotalViatico: parseFloat(montoTotalViatico) || 0,
    adicionalEnEfectivo: parseFloat(adicionalEnEfectivo) || 0,
    devolucionEnEfectivo: parseFloat(devolucionEnEfectivo) || 0,
    pendienteDeRendicion: parseFloat(pendienteDeRendicion) || 0,
    valesCombustible: valesCombustible === "on",
    valorVale: parseFloat(valorVale) || 0,
    cantidadVale: parseInt(cantidadVale) || 0,
    totalVale: parseFloat(totalVale) || 0,
    vehiculoUtilizado,
    // creadoPor: req.session.usuario?.nombre || "Desconocido",
    creadoPor: nombreCompleto,
    viajantes,
  });

  await nuevoViatico.save();
}


// Eliminar viatico por id
export async function eliminarViaticoPorId(id) {
    return await Viatico.findByIdAndDelete(id);
  }
  