// routes/usuariosRoutes.mjs

import express from "express";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { accesoPorModulo } from "../middlewares/moduloAccessMiddleware.mjs";
import { listarUsuarios, eliminarUsuario } from "../controllers/usuariosController.mjs";

const router = express.Router();

router.get(
  "/dashboard",
  verificarSesion,
  accesoPorModulo("viaticos"),
  listarUsuarios
);

router.delete(
  "/eliminar/:id",
  verificarSesion,
  accesoPorModulo("viaticos"),
  eliminarUsuario
);

export default router;
