// routes/viaticosRoutes.mjs

import express from "express";
import {
  crearViaticoController,
  mostrarDashboardViaticos,
  mostrarTodosLosViaticos,
  mostrarFormularioViatico,
  eliminarViaticoController
} from "../controllers/viaticosController.mjs";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { accesoPorModulo } from "../middlewares/moduloAccessMiddleware.mjs";

const router = express.Router();

// Dashboard principal de viáticos (últimos 5)
router.get(
  "/dashboard",
  verificarSesion,
  accesoPorModulo("viaticos"),
  mostrarDashboardViaticos
);

// Formulario para crear viático
router.get(
  "/crear",
  verificarSesion,
  accesoPorModulo("viaticos"),
  mostrarFormularioViatico
);

// Acción para crear viático (POST)
router.post(
  "/crear",
  verificarSesion,
  accesoPorModulo("viaticos"),
  crearViaticoController
);

// Ver todos los viáticos
router.get(
  "/dashboard/todos",
  verificarSesion,
  accesoPorModulo("viaticos"),
  mostrarTodosLosViaticos
);

// Elininar viatico por id
router.delete(
  "/eliminar/:id",
  verificarSesion,
  accesoPorModulo("viaticos"),
  eliminarViaticoController
);

export default router;
