// routes/escuelasRoutes.mjs
import express from "express";
import {
  crearEscuelaController,
  listarEscuelasController,
  verEscuelaController,
  mostrarFormularioEditarEscuelaController,
  actualizarEscuelaController,
  eliminarEscuelaController,
  mostrarFormularioCrearEscuelaController,
  generarPDFEscuelaController,
  eliminarImagenEscuelaController,
} from "../controllers/escuelasController.mjs";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { verificarPermiso } from "../middlewares/permisosPorAccion.mjs";

import { uploadEscuela } from "../middlewares/uploadEscuela.mjs";

import { validacionDatosEscuela } from "../middlewares/validationEscuela.mjs";
import { manejarErroresValidacion } from "../middlewares/errorMiddleware.mjs";

const router = express.Router();

// Mostrar formulario de creación
router.get(
  "/crear",
  verificarSesion,
  verificarPermiso("escuelas", "crear"),
  mostrarFormularioCrearEscuelaController
);

// Crear nueva escuela
router.post(
  "/crear",
  verificarSesion,
  verificarPermiso("escuelas", "crear"),
  validacionDatosEscuela,
  manejarErroresValidacion,
  crearEscuelaController
);

// Listado general
router.get(
  "/dashboard",
  verificarSesion,
  verificarPermiso("escuelas", "ver"),
  listarEscuelasController
);

// Ver detalle de una escuela
router.get(
  "/:id",
  verificarSesion,
  verificarPermiso("escuelas", "ver"),
  verEscuelaController
);

// Mostrar formulario de edición
router.get(
  "/:id/editar",
  verificarSesion,
  verificarPermiso("escuelas", "editar"),
  mostrarFormularioEditarEscuelaController
);

// Procesar edición
router.post(
  "/:id/editar",
  verificarSesion,
  verificarPermiso("escuelas", "editar"),
  uploadEscuela,
  validacionDatosEscuela,
  manejarErroresValidacion,
  actualizarEscuelaController
);

// Eliminar escuela
router.delete(
  "/:id",
  verificarSesion,
  verificarPermiso("escuelas", "eliminar"),
  eliminarEscuelaController
);

// Generar PDF
router.get(
  "/:id/pdf",
  verificarSesion,
  verificarPermiso("escuelas", "ver"),
  generarPDFEscuelaController
);

// Eliminar imagen cargada en editarEscuela.ejs
router.post(
  "/:id/imagenes/:nombre/eliminar",
  verificarSesion,
  eliminarImagenEscuelaController
);

export default router;
