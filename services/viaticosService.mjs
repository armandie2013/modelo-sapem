import Viatico from "../models/viatico.mjs";
import PersonaDisponible from "../models/personaDisponible.mjs";
import Contador from "../models/contador.mjs";
import { convertirAFloat } from "../utils/convertirAFloat.mjs";

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
};



// Obtener los 5 viáticos más recientes
export async function obtenerUltimosViaticos(limit = 10) {
  return await Viatico.find().sort({ numeroDeViaje: -1 }).limit(limit);
};


// Obtener todos los viáticos
export async function obtenerTodosLosViaticos() {
  return await Viatico.find().sort({ numeroDeViaje: -1 });
}


// Crear un nuevo viático
// export async function crearViatico(req, res) {
//   const {
//     fechaDeCreacion,
//     areaSolicitante,
//     cantidadDeViajantes,
//     nombreSolicitante,
//     cargo,
//     importeViatico,
//     numeroDeViaje,
//     motivoDelViaje,
//     origen,
//     destino,
//     fechaDeSalida,
//     fechaDellegada,
//     montoTotalViatico,
//     adicionalEnEfectivo,
//     devolucionEnEfectivo,
//     pendienteDeRendicion,
//     valesCombustible,
//     valorVale,
//     cantidadVale,
//     totalVale,
//     vehiculoUtilizado
//   } = req.body;

//   console.log('🟡 Valores crudos recibidos desde el formulario:');
//   console.log('importeViatico:', importeViatico);
//   console.log('adicionalEnEfectivo:', adicionalEnEfectivo);
//   console.log('valorVale:', valorVale);
//   console.log('totalVale:', totalVale);

//   const viajantes = [];
//   for (let i = 0; i < nombreSolicitante.length; i++) {
//     if (nombreSolicitante[i]) {
//       viajantes.push({
//         nombre: nombreSolicitante[i],
//         cargo: cargo[i],
//         importe: convertirAFloat(importeViatico[i]) || 0,
//       });
//     }
//   }

//   const nuevoViatico = new Viatico({
//     fechaDeCreacion,
//     areaSolicitante,
//     cantidadDeViajantes: parseInt(cantidadDeViajantes),
//     numeroDeViaje: parseInt(numeroDeViaje),
//     motivoDelViaje,
//     origen,
//     destino,
//     fechaDeSalida,
//     fechaDeLlegada: fechaDellegada,
//     montoTotalViatico: convertirAFloat(montoTotalViatico) || 0,
//     adicionalEnEfectivo: convertirAFloat(adicionalEnEfectivo) || 0,
//     devolucionEnEfectivo: convertirAFloat(devolucionEnEfectivo) || 0,
//     pendienteDeRendicion: convertirAFloat(pendienteDeRendicion) || 0,
//     valesCombustible: valesCombustible === "on",
//     valorVale: convertirAFloat(valorVale) || 0,
//     cantidadVale: parseInt(cantidadVale) || 0,
//     totalVale: convertirAFloat(totalVale) || 0,
//     vehiculoUtilizado,
//     creadoPor: `${req.session.usuario.nombre} ${req.session.usuario.apellido}`,
//     viajantes,
//   });

//   await nuevoViatico.save();
//   return nuevoViatico;
// };

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
    vehiculoUtilizado
  } = req.body;

  console.log('🟡 Valores crudos recibidos desde el formulario:');
  console.log('importeViatico:', importeViatico);
  console.log('adicionalEnEfectivo:', adicionalEnEfectivo);
  console.log('valorVale:', valorVale);
  console.log('totalVale:', totalVale);

  const viajantes = [];
  for (let i = 0; i < nombreSolicitante.length; i++) {
    if (nombreSolicitante[i]) {
      const importeConvertido = convertirAFloat(importeViatico[i]) || 0;
      viajantes.push({
        nombre: nombreSolicitante[i],
        cargo: cargo[i],
        importe: importeConvertido,
      });
    }
  }

  const adicional = convertirAFloat(adicionalEnEfectivo) || 0;
  const rendido = convertirAFloat(devolucionEnEfectivo) || 0;
  const totalValeConvertido = convertirAFloat(totalVale) || 0;
  const valorValeConvertido = convertirAFloat(valorVale) || 0;
  const montoTotalConvertido = viajantes.reduce((acc, v) => acc + v.importe, 0);
  const pendiente = adicional - rendido;

  console.log('🟢 Después de conversión:');
  console.log('Importes convertidos:', viajantes.map(v => v.importe));
  console.log('Adicional convertido:', adicional);
  console.log('Total Vale convertido:', totalValeConvertido);
  console.log('Monto total viático calculado:', montoTotalConvertido);
  console.log('Pendiente de rendición:', pendiente);

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
    montoTotalViatico: montoTotalConvertido,
    adicionalEnEfectivo: adicional,
    devolucionEnEfectivo: rendido,
    pendienteDeRendicion: pendiente,
    valesCombustible: valesCombustible === "on",
    valorVale: valorValeConvertido,
    cantidadVale: parseInt(cantidadVale) || 0,
    totalVale: totalValeConvertido,
    vehiculoUtilizado,
    creadoPor: `${req.session.usuario.nombre} ${req.session.usuario.apellido}`,
    viajantes,
  });

  await nuevoViatico.save();
  return nuevoViatico;
};


// Eliminar viatico por id
export async function eliminarViaticoPorId(id) {
  return await Viatico.findByIdAndDelete(id);
};


// Obtener viatico por id
export async function obtenerViaticoPorId(id) {
  return await Viatico.findById(id);
}


// Obtener personas ordenadas
export async function obtenerPersonasDisponiblesOrdenadas() {
  return await PersonaDisponible.find().sort({ nombreApellido: 1 });
}


// Editar viático existente
export async function actualizarViatico(id, datos) {
  const {
    fechaDeCreacion,
    areaSolicitante,
    cantidadDeViajantes,
    nombreSolicitante = [],
    cargo = [],
    importeViatico = [],
    numeroDeViaje,
    motivoDelViaje,
    origen,
    destino,
    adicionalEnEfectivo,
    devolucionEnEfectivo,
    vehiculoUtilizado,
  } = datos;

  const viajantes = [];
  for (let i = 0; i < nombreSolicitante.length; i++) {
    if (nombreSolicitante[i]) {
      viajantes.push({
        nombre: nombreSolicitante[i],
        cargo: cargo[i],
        importe: convertirAFloat(importeViatico[i]) || 0,
      });
    }
  }

  const montoTotalViatico = viajantes.reduce((acc, v) => acc + v.importe, 0);
  const adicional = convertirAFloat(adicionalEnEfectivo) || 0;
  const rendido = convertirAFloat(devolucionEnEfectivo) || 0;
  const pendiente = adicional - rendido;

  await Viatico.findByIdAndUpdate(id, {
    fechaDeCreacion,
    areaSolicitante,
    cantidadDeViajantes: parseInt(cantidadDeViajantes) || viajantes.length,
    numeroDeViaje,
    motivoDelViaje,
    origen,
    destino,
    montoTotalViatico,
    adicionalEnEfectivo: adicional,
    devolucionEnEfectivo: rendido,
    pendienteDeRendicion: pendiente,
    vehiculoUtilizado,
    viajantes,
  });
}
  