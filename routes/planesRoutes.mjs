import express from "express";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { verificarPermiso } from "../middlewares/permisosPorAccion.mjs";
import { manejarErroresValidacion } from "../middlewares/errorMiddleware.mjs";
import { validacionPlan } from "../middlewares/validacionPlan.mjs";
import {
  dashboardPlanesController, mostrarFormularioCrearPlanController, crearPlanController,
  verPlanController, mostrarFormularioEditarPlanController, actualizarPlanController, eliminarPlanController,
} from "../controllers/planesController.mjs";

const router = express.Router();
router.get("/", verificarSesion, verificarPermiso("planes","ver"), dashboardPlanesController);
router.get("/crear", verificarSesion, verificarPermiso("planes","crear"), mostrarFormularioCrearPlanController);
router.post("/crear", verificarSesion, verificarPermiso("planes","crear"), validacionPlan, manejarErroresValidacion, crearPlanController);
router.get("/:id", verificarSesion, verificarPermiso("planes","ver"), verPlanController);
router.get("/:id/editar", verificarSesion, verificarPermiso("planes","editar"), mostrarFormularioEditarPlanController);
router.post("/:id/editar", verificarSesion, verificarPermiso("planes","editar"), validacionPlan, manejarErroresValidacion, actualizarPlanController);
router.post("/:id/eliminar", verificarSesion, verificarPermiso("planes","eliminar"), eliminarPlanController);
export default router;