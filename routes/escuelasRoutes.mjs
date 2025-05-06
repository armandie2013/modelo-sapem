// routes/escuelasRoutes.mjs
import express from "express";
import {
  crearEscuelaController,
  listarEscuelasController,
  verEscuelaController,
  mostrarFormularioEditarEscuelaController,
  actualizarEscuelaController,
  eliminarEscuelaController,
  mostrarFormularioCrearEscuelaController
} from "../controllers/escuelasController.mjs";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { verificarPermiso } from "../middlewares/permisosPorAccion.mjs";

const router = express.Router();

// Mostrar formulario de creación
router.get("/crear", verificarSesion, verificarPermiso("escuelas", "crear"), mostrarFormularioCrearEscuelaController);

// Crear nueva escuela
router.post("/crear", verificarSesion, verificarPermiso("escuelas","crear"), crearEscuelaController);

// Listado general
router.get("/dashboard", verificarSesion, verificarPermiso("escuelas","ver"), listarEscuelasController);

// Ver detalle de una escuela
router.get("/:id", verificarSesion, verificarPermiso("escuelas","ver"), verEscuelaController);

// Mostrar formulario de edición
router.get("/:id/editar", verificarSesion, verificarPermiso("escuelas","editar"), mostrarFormularioEditarEscuelaController);

// Procesar edición
router.post("/:id/editar", verificarSesion, verificarPermiso("escuelas","editar"), actualizarEscuelaController);

// Eliminar escuela
router.delete("/:id", verificarSesion, verificarPermiso("escuelas", "eliminar"), eliminarEscuelaController);

export default router;
