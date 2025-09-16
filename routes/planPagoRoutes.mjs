// routes/planPagoRoutes.mjs
import { Router } from "express";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { verificarPermiso } from "../middlewares/permisosPorAccion.mjs";

import {
  mostrarFormularioPlanPago,   // 👈 nombre nuevo
  crearPlanPagoController,     // 👈 post
} from "../controllers/planPagoController.mjs";

const router = Router();

// GET: Formulario nuevo
router.get(
  "/proveedores/:proveedorId/crear",
  verificarSesion,
  verificarPermiso("planesPago", "crear"),
  mostrarFormularioPlanPago
);

// POST: Crear plan de pago
router.post(
  "/proveedores/:proveedorId/crear",
  verificarSesion,
  verificarPermiso("planesPago", "crear"),
  crearPlanPagoController
);

export default router;
