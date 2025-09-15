// routes/notasRoutes.mjs
import { Router } from "express";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { verificarPermiso } from "../middlewares/permisosPorAccion.mjs";
import {
  apiCargosProveedor,
  mostrarFormularioNota,
  crearNotaController,
  mostrarFormularioNotaProveedor,
  crearNotaProveedorController,
} from "../controllers/notasController.mjs";

const router = Router();

// 🔒 valida que :tipo sea 'credito' o 'debito'
function validarTipoParam(req, res, next) {
  const t = (req.params.tipo || "").toLowerCase();
  if (t !== "credito" && t !== "debito") {
    return res.status(404).send("Tipo de nota inválido");
  }
  req.params.tipo = t; // normalizado
  next();
}

// --- API (antes de rutas dinámicas) ---
router.get(
  "/api/cargos-proveedor",
  verificarSesion,
  verificarPermiso("proveedores", "ver"),
  apiCargosProveedor
);

// --- Flujo genérico ---
router.get(
  "/:tipo/registrar",
  verificarSesion,
  verificarPermiso("proveedores", "editar"),
  validarTipoParam,
  mostrarFormularioNota
);

router.post(
  "/:tipo/registrar",
  verificarSesion,
  verificarPermiso("proveedores", "editar"),
  validarTipoParam,
  crearNotaController
);

// --- Flujo con proveedor ---
router.get(
  "/proveedores/:proveedorId/:tipo",
  verificarSesion,
  verificarPermiso("proveedores", "editar"),
  validarTipoParam,
  mostrarFormularioNotaProveedor
);

router.post(
  "/proveedores/:proveedorId/:tipo/registrar",
  verificarSesion,
  verificarPermiso("proveedores", "editar"),
  validarTipoParam,
  crearNotaProveedorController
);

export default router;
