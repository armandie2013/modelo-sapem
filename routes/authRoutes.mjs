// routes/authRoutes.mjs
import express from "express";
import {
  mostrarFormularioRegistro,
  registrarUsuarioController,
  mostrarFormularioLogin,
  procesarLogin,
  cerrarSesion,
} from "../controllers/authController.mjs";
import { verificarSesionParaLogout } from "../middlewares/verificarSesionParaLogout.mjs";

const router = express.Router();

// Mostrar formulario de registro
router.get("/registro", mostrarFormularioRegistro);

// Procesar formulario de registro
router.post("/registro", registrarUsuarioController);

// Mostrar login
router.get("/login", mostrarFormularioLogin);

// Procesar login
router.post("/login", procesarLogin);

// Cerrar sesión
router.post("/logout", verificarSesionParaLogout, cerrarSesion);

// Cerrar sesión MANUAL
router.get("/logout", verificarSesionParaLogout, cerrarSesion);

export default router;