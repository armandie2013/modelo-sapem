import express from "express";
import { listarUsuarios, eliminarUsuario } from "../controllers/usuariosController.mjs";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { verificarAdmin } from "../middlewares/verificarAdmin.mjs";

const router = express.Router();

// Ruta para ver usuarios registrados
router.get("/dashboard", verificarSesion, verificarAdmin, listarUsuarios);

// Ruta para eliminar usuario
router.post("/eliminar/:id", verificarSesion, verificarAdmin, eliminarUsuario);

export default router;