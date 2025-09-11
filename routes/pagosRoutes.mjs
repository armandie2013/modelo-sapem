// routes/pagosRoutes.mjs
import { Router } from "express";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { verificarPermiso } from "../middlewares/permisosPorAccion.mjs";
import {
  mostrarFormularioPago,
  crearPagoController,
  listarPagosController,
  eliminarPagoController,
  mostrarFormularioPagoProveedor,
  crearPagoProveedorController,
  apiCargosPendientes,
} from "../controllers/pagosController.mjs";

const router = Router();

router.get(
  "/",
  verificarSesion,
  verificarPermiso("proveedores", "ver"),
  listarPagosController
);

router.get(
  "/registrar",
  verificarSesion,
  verificarPermiso("proveedores", "editar"),
  mostrarFormularioPago
);

router.post(
  "/registrar",
  verificarSesion,
  verificarPermiso("proveedores", "editar"),
  crearPagoController
);

// flujo anidado por proveedor
router.get(
  "/proveedores/:proveedorId/registrar",
  verificarSesion,
  verificarPermiso("proveedores", "editar"),
  mostrarFormularioPagoProveedor
);
router.post(
  "/proveedores/:proveedorId/registrar",
  verificarSesion,
  verificarPermiso("proveedores", "editar"),
  crearPagoProveedorController
);

// API para poblar períodos en el form genérico
router.get(
  "/api/cargos-pendientes",
  verificarSesion,
  verificarPermiso("proveedores", "ver"),
  apiCargosPendientes
);

router.post(
  "/:id/eliminar",
  verificarSesion,
  verificarPermiso("proveedores", "eliminar"),
  eliminarPagoController
);

export default router;