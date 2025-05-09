import multer from "multer";
import fs from "fs";
import path from "path";
import Escuela from "../models/escuela.mjs";

// Función para obtener el número de ticket con validaciones claras
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

// Multer storage
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      const numeroTicket = await obtenerNumeroTicket(req);

      if (!numeroTicket) {
        return cb(new Error("Número de ticket inválido"), null);
      }

      const destino = path.resolve("public", "uploads", "escuelas", String(numeroTicket));
      fs.mkdirSync(destino, { recursive: true });

      cb(null, destino);
    } catch (error) {
      console.error("❌ Error al preparar destino de imágenes:", error);
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    const nombreUnico = `imagenes-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, nombreUnico);
  }
});

// Exportar como middleware Express
export const uploadEscuela = (req, res, next) => {
  const handler = multer({ storage }).array("imagenes", 3);
  
  handler(req, res, function (err) {
    if (err) {
      console.error("❌ Error al procesar archivos con multer:", err.message || err);
      return res.status(500).send("Error al subir archivos. Verifique el número de ticket.");
    }
    next();
  });
};