// services/escuelasService.mjs
import Escuela from "../models/Escuela.mjs";
import puppeteer from "puppeteer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function obtenerEscuelasService() {
  return await Escuela.find().sort({ fechaCreacion: -1 });
}

export async function obtenerEscuelaPorIdService(id) {
  return await Escuela.findById(id);
}

export async function crearEscuelaService(datos) {
  const escuela = new Escuela(datos);
  return await escuela.save();
}

export async function actualizarEscuelaService(id, nuevosDatos) {
  return await Escuela.findByIdAndUpdate(id, nuevosDatos, {
    new: true,
    runValidators: true,
  });
}

export async function eliminarEscuelaService(id) {
  return await Escuela.findByIdAndDelete(id);
}

export async function obtenerUltimaEscuelaService() {
  return await Escuela.findOne().sort({ numeroTicket: -1 });
}

export async function generarPDFEscuelaService(escuela) {
  try {
    const filePath = path.join(__dirname, "../views/escuelasViews/verEscuelaPdf.ejs");

    const html = await ejs.renderFile(filePath, { escuela });

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "1cm", bottom: "1cm", left: "1cm", right: "1cm" }
    });

    await browser.close();
    return pdfBuffer;

  } catch (error) {
    console.error("Error al generar PDF de escuela:", error);
    throw error;
  }
}

export async function obtenerEscuelaPorId(id) {
  return await Escuela.findById(id);
}