import { Router } from "express";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { verificarPermiso } from "../middlewares/permisosPorAccion.mjs";

import {
  mostrarFormularioCrearPredioEscuelaController,
  crearPredioEscuelaController,
  dashboardPrediosEscuelasController,
  verPredioEscuelaController,
  mostrarFormularioEditarPredioEscuelaController,
  editarPredioEscuelaController,
  eliminarPredioEscuelaController,
} from "../controllers/prediosEscuelasController.mjs";

import {
  validacionesPredioEscuela,
  manejarValidacionPredioEscuela,
} from "../middlewares/validacionPredioEscuela.mjs";

const router = Router();

// Dashboard / listado
router.get(
  "/dashboard",
  verificarSesion,
  verificarPermiso("prediosEscuelas", "ver"),
  dashboardPrediosEscuelasController
);

// Crear
router.get(
  "/crear",
  verificarSesion,
  verificarPermiso("prediosEscuelas", "crear"),
  mostrarFormularioCrearPredioEscuelaController
);

router.post(
  "/crear",
  verificarSesion,
  verificarPermiso("prediosEscuelas", "crear"),
  validacionesPredioEscuela,
  manejarValidacionPredioEscuela,
  crearPredioEscuelaController
);

// Ver detalle
router.get(
  "/ver/:id",
  verificarSesion,
  verificarPermiso("prediosEscuelas", "ver"),
  verPredioEscuelaController
);

// Editar
router.get(
  "/editar/:id",
  verificarSesion,
  verificarPermiso("prediosEscuelas", "editar"),
  mostrarFormularioEditarPredioEscuelaController
);

router.post(
  "/editar/:id",
  verificarSesion,
  verificarPermiso("prediosEscuelas", "editar"),
  validacionesPredioEscuela,
  manejarValidacionPredioEscuela,
  editarPredioEscuelaController
);

// Eliminar
router.post(
  "/eliminar/:id",
  verificarSesion,
  verificarPermiso("prediosEscuelas", "eliminar"),
  eliminarPredioEscuelaController
);

export default router;