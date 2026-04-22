import Escuela from "../models/escuela.mjs";
import puppeteer from "puppeteer";
import ejs from "ejs";
import path from "path";
import fs from "fs/promises";
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

function obtenerMimeType(nombreArchivo = "") {
  const extension = path.extname(nombreArchivo).toLowerCase();

  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

async function convertirImagenABase64(rutaArchivo, nombreArchivo) {
  try {
    const buffer = await fs.readFile(rutaArchivo);
    const mimeType = obtenerMimeType(nombreArchivo);
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.warn("⚠️ No se pudo convertir imagen a base64:", rutaArchivo);
    return null;
  }
}

export async function generarPDFEscuelaService(escuela) {
  try {
    const filePath = path.join(__dirname, "../views/escuelasViews/verEscuelaPdf.ejs");

    let imagenesPdf = [];

    if (Array.isArray(escuela.imagenes) && escuela.imagenes.length > 0) {
      const carpetaImagenes = path.join(
        "C:/upload",
        "escuelas",
        String(escuela.numeroTicket)
      );

      const imagenesConvertidas = await Promise.all(
        escuela.imagenes.map(async (nombreImagen) => {
          const rutaImagen = path.join(carpetaImagenes, nombreImagen);
          const dataUrl = await convertirImagenABase64(rutaImagen, nombreImagen);

          if (!dataUrl) return null;

          return {
            nombre: nombreImagen,
            dataUrl,
          };
        })
      );

      imagenesPdf = imagenesConvertidas.filter(Boolean);
    }

    const html = await ejs.renderFile(filePath, { escuela, imagenesPdf });

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox"],
    });

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "1cm", bottom: "1cm", left: "1cm", right: "1cm" },
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