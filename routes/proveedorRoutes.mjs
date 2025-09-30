// routes/proveedorRoutes.mjs
import { Router } from "express";
import {
  mostrarFormularioProveedor,
  crearProveedorController,
  listarProveedoresController,
  mostrarFormularioEditarProveedor,
  actualizarProveedorController,
  eliminarProveedorController,
  verProveedorController,
  verPeriodoProveedorController,
  descargarEstadoCuentaPdfController,
} from "../controllers/proveedorController.mjs";

import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { verificarPermiso } from "../middlewares/permisosPorAccion.mjs";
import { validacionProveedor } from "../middlewares/validacionProveedor.mjs";
import { manejarErroresValidacion } from "../middlewares/errorMiddleware.mjs";

const router = Router();

router.get(
  "/",
  verificarSesion,
  verificarPermiso("proveedores", "ver"),
  listarProveedoresController
);
router.get(
  "/registrar",
  verificarSesion,
  verificarPermiso("proveedores", "crear"),
  mostrarFormularioProveedor
);
router.post(
  "/registrar",
  verificarSesion,
  verificarPermiso("proveedores", "crear"),
  validacionProveedor,
  manejarErroresValidacion,
  crearProveedorController
);
router.get(
  "/:id/ver",
  verificarSesion,
  verificarPermiso("proveedores", "ver"),
  verProveedorController
);
router.get(
  "/:id/editar",
  verificarSesion,
  verificarPermiso("proveedores", "editar"),
  mostrarFormularioEditarProveedor
);
router.post(
  "/:id/editar",
  verificarSesion,
  verificarPermiso("proveedores", "editar"),
  validacionProveedor,
  manejarErroresValidacion,
  actualizarProveedorController
);
router.delete(
  "/:id",
  verificarSesion,
  verificarPermiso("proveedores", "eliminar"),
  eliminarProveedorController
);
router.get(
  "/:proveedorId/periodo/:periodo",
  verificarSesion,
  verificarPermiso("proveedores", "ver"),
  verPeriodoProveedorController
);

// Compatibilidad: si alguien entra a /proveedores/:id/plan-pago, redirigí al nuevo path
router.get(
  "/:proveedorId/plan-pago",
  verificarSesion,
  verificarPermiso("planesPago", "crear"),
  (req, res) => {
    res.redirect(301, `/planes-pago/proveedores/${req.params.proveedorId}/crear`);
  }
);

router.get(
  "/:proveedorId/estado-cuenta/pdf",
  verificarSesion,
  verificarPermiso("proveedores", "ver"),
  descargarEstadoCuentaPdfController
);

export default router;
