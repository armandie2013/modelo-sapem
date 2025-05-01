import Viatico from "../models/viatico.mjs";
import PersonaDisponible from "../models/personaDisponible.mjs";
import Contador from "../models/contador.mjs";
import { convertirAFloat } from "../utils/convertirAFloat.mjs";
import { obtenerSiguienteNumeroDeViaje } from "./contadorService.mjs";
import puppeteer from "puppeteer";

// Obtener personas disponibles
export async function obtenerPersonasDisponiblesOrdenadas() {
  return await PersonaDisponible.find().sort({ nombreApellido: 1 });
};

// Obtener viático por ID
export async function obtenerViaticoPorId(id) {
  return await Viatico.findById(id);
};

// Obtener los últimos viáticos
export async function obtenerUltimosViaticos(limit = 10) {
  return await Viatico.find().sort({ numeroDeViaje: -1 }).limit(limit);
};

// Obtener todos los viáticos
export async function obtenerTodosLosViaticos() {
  return await Viatico.find().sort({ numeroDeViaje: -1 });
};

// Obtener datos para el formulario de creación
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

// Crear viático
export async function crearViatico(req, res) {
  const {
    fechaDeCreacion,
    areaSolicitante,
    cantidadDeViajantes,
    nombreSolicitante,
    cargo,
    importeViatico,
    motivoDelViaje,
    origen,
    destino,
    fechaDeSalida,
    fechaDellegada,
    adicionalEnEfectivo,
    devolucionEnEfectivo,
    valesCombustible,
    valorVale,
    cantidadVale,
    totalVale,
    vehiculoUtilizado,
  } = req.body;

  const viajantes = nombreSolicitante.map((nombre, i) => ({
    nombre,
    cargo: cargo[i],
    importe: convertirAFloat(importeViatico[i]) || 0
  }));

  const adicional = convertirAFloat(adicionalEnEfectivo) || 0;
  const rendido = convertirAFloat(devolucionEnEfectivo) || 0;
  const montoTotal = viajantes.reduce((acc, v) => acc + v.importe, 0);

  const nuevoViatico = new Viatico({
    fechaDeCreacion,
    areaSolicitante,
    cantidadDeViajantes: parseInt(cantidadDeViajantes),
    numeroDeViaje: await obtenerSiguienteNumeroDeViaje(),
    motivoDelViaje,
    origen,
    destino,
    fechaDeSalida,
    fechaDeLlegada: fechaDellegada,
    montoTotalViatico: montoTotal,
    adicionalEnEfectivo: adicional,
    devolucionEnEfectivo: rendido,
    pendienteDeRendicion: adicional - rendido,
    valesCombustible: valesCombustible === "on",
    valorVale: convertirAFloat(valorVale) || 0,
    cantidadVale: parseInt(cantidadVale) || 0,
    totalVale: convertirAFloat(totalVale) || 0,
    vehiculoUtilizado,
    creadoPor: `${req.session.usuario.nombre} ${req.session.usuario.apellido}`,
    viajantes,
  });

  await nuevoViatico.save();
  return nuevoViatico;
};

// Actualizar viático
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
    valorVale,
    cantidadVale,
    totalVale,
    valesCombustible,
  } = datos;

  const viajantes = nombreSolicitante.map((nombre, i) => ({
    nombre,
    cargo: cargo[i],
    importe: convertirAFloat(importeViatico[i]) || 0
  }));

  await Viatico.findByIdAndUpdate(id, {
    fechaDeCreacion,
    areaSolicitante,
    cantidadDeViajantes: parseInt(cantidadDeViajantes) || viajantes.length,
    numeroDeViaje,
    motivoDelViaje,
    origen,
    destino,
    montoTotalViatico: viajantes.reduce((acc, v) => acc + v.importe, 0),
    adicionalEnEfectivo: convertirAFloat(adicionalEnEfectivo) || 0,
    devolucionEnEfectivo: convertirAFloat(devolucionEnEfectivo) || 0,
    pendienteDeRendicion: (convertirAFloat(adicionalEnEfectivo) || 0) - (convertirAFloat(devolucionEnEfectivo) || 0),
    vehiculoUtilizado,
    valesCombustible: valesCombustible === "on",
    valorVale: convertirAFloat(valorVale) || 0,
    cantidadVale: parseInt(cantidadVale) || 0,
    totalVale: convertirAFloat(totalVale) || 0,
    viajantes,
  });
};

// Eliminar viático
export async function eliminarViaticoPorId(id) {
  return await Viatico.findByIdAndDelete(id);
};

// Generar PDF
export async function generarPDFViatico(id, req) {
  const host = req.protocol + "://" + req.get("host");
  const url = `${host}/viaticos/${id}/pdfview-nologin`;

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0" });

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "1cm", bottom: "1cm", left: "1cm", right: "1cm" }
  });

  await browser.close();
  return pdf;
};