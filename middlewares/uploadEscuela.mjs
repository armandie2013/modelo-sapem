import multer from "multer";
import fs from "fs";
import path from "path";
import Escuela from "../models/escuela.mjs";

// Función para obtener el número de ticket
async function obtenerNumeroTicket(req) {
  try {
    if (req.body.numeroTicket) return req.body.numeroTicket;

    if (req.params.id) {
      const escuela = await Escuela.findById(req.params.id);
      if (escuela && escuela.numeroTicket) return escuela.numeroTicket;
    }

    throw new Error("No se pudo obtener el número de ticket");
  } catch (error) {
    console.error("❌ Error en obtenerNumeroTicket:", error);
    return null;
  }
}

// Multer storage personalizado
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      const numeroTicket = await obtenerNumeroTicket(req);
      if (!numeroTicket) {
        return cb(new Error("Número de ticket inválido"), null);
      }

      const destino = path.join("C:/upload", "escuelas", String(numeroTicket));

      // Crear carpeta solo si no existe
      if (!fs.existsSync(destino)) {
        fs.mkdirSync(destino, { recursive: true });
        console.log("📁 Carpeta creada:", destino);
      }

      cb(null, destino);
    } catch (error) {
      console.error("❌ Error en multer.destination:", error);
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now(); // solo números
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}${ext}`);
  },
});

// Middleware multer
export const uploadEscuela = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB por archivo
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten archivos de imagen"), false);
    }
    cb(null, true);
  },
}).array("imagenes", 3); // máximo 3 imágenes