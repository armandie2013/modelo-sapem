// routes/notasRoutes.mjs
import { Router } from "express";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { verificarPermiso } from "../middlewares/permisosPorAccion.mjs";
import {
  mostrarFormularioNota,
  crearNotaController,
  mostrarFormularioNotaProveedor,
  crearNotaProveedorController,
  apiCargosProveedor
} from "../controllers/notasController.mjs";

const router = Router();

// 🔒 valida que :tipo sea 'credito' o 'debito' y lo normaliza
function validarTipoParam(req, res, next) {
  const t = (req.params.tipo || "").toLowerCase();
  if (t !== "credito" && t !== "debito") {
    return res.status(404).send("Tipo de nota inválido");
  }
  req.params.tipo = t;
  next();
}

// Mapea tipo -> módulo de permisos
function moduloNotaFromTipo(tipo) {
  if (tipo === "credito") return "notasCredito";
  if (tipo === "debito")  return "notasDebito";
  return null;
}

// Middle de permiso dinámico para notas
function permisoNota(action = "crear") {
  return (req, res, next) => {
    const modulo = moduloNotaFromTipo(req.params.tipo);
    if (!modulo) return res.status(404).send("Tipo de nota inválido");
    // Reusa tu verificarPermiso(modulo, action)
    return verificarPermiso(modulo, action)(req, res, next);
  };
}

// --- API (dejala ANTES de las rutas dinámicas para que no la 'capture' :tipo) ---
router.get(
  "/api/cargos-proveedor",
  verificarSesion,
  verificarPermiso("proveedores", "ver"),
  apiCargosProveedor
);

// --- Flujo genérico (sin proveedor preseleccionado) ---
router.get(
  "/:tipo/registrar",
  verificarSesion,
  validarTipoParam,
  permisoNota("crear"),
  mostrarFormularioNota
);

router.post(
  "/:tipo/registrar",
  verificarSesion,
  validarTipoParam,
  permisoNota("crear"),
  crearNotaController
);

// --- Flujo con proveedor ---
router.get(
  "/proveedores/:proveedorId/:tipo",
  verificarSesion,
  validarTipoParam,
  permisoNota("crear"),
  mostrarFormularioNotaProveedor
);

router.post(
  "/proveedores/:proveedorId/:tipo/registrar",
  verificarSesion,
  validarTipoParam,
  permisoNota("crear"),
  crearNotaProveedorController
);

export default router;
