// routes/planPagoRoutes.mjs
import { Router } from "express";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { verificarPermiso } from "../middlewares/permisosPorAccion.mjs";

import {
  mostrarFormularioPlanPago,
  crearPlanPagoController,
  verPlanPagoController,
  descargarPlanPagoPdfController     
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

// Vista imprimible (HTML)
router.get(
  "/:planId/ver",
  verificarSesion,
  verificarPermiso("planesPago","ver"),
  verPlanPagoController
);

// PDF para firmar
router.get(
  "/:planId/pdf",
  verificarSesion,
  verificarPermiso("planesPago","ver"),
  descargarPlanPagoPdfController
);

export default router;
