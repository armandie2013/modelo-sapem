import multer from "multer";
import fs from "fs";
import path from "path";
import Escuela from "../models/escuela.mjs";

// Función para obtener el número de ticket de la escuela
async function obtenerNumeroTicket(req) {
  if (req.body.numeroTicket) return req.body.numeroTicket;
  if (req.params.id) {
    const escuela = await Escuela.findById(req.params.id);
    if (escuela) return escuela.numeroTicket;
  }
  return "desconocido"; // fallback si no se encuentra
}

// Multer storage configurado como función async
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      const numeroTicket = await obtenerNumeroTicket(req);
      const destino = path.resolve("public", "uploads", "escuelas", String(numeroTicket));
      fs.mkdirSync(destino, { recursive: true });
      cb(null, destino);
    } catch (error) {
      console.error("❌ Error obteniendo número de ticket:", error);
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    const nombreUnico = `imagenes-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, nombreUnico);
  }
});

// Conversión a función express middleware para permitir async en destination
export const uploadEscuela = (req, res, next) => {
  const handler = multer({ storage }).array("imagenes", 3);
  handler(req, res, function (err) {
    if (err) {
      console.error("❌ Error al subir archivos:", err);
      return res.status(500).send("Error al subir archivos");
    }
    next();
  });
};