// routes/usuariosRoutes.mjs

import express from "express";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { accesoPorModulo } from "../middlewares/moduloAccessMiddleware.mjs";
import { listarUsuarios, eliminarUsuario } from "../controllers/usuariosController.mjs";
import { verificarAdmin } from "../middlewares/verificarAdmin.mjs";

const router = express.Router();

router.get(
  "/dashboard",
  verificarSesion,
  verificarAdmin,
  // accesoPorModulo("viaticos"),
  listarUsuarios
);

router.delete(
  "/eliminar/:id",
  verificarSesion,
  verificarAdmin,
  // accesoPorModulo("viaticos"),
  eliminarUsuario
);

export default router;
