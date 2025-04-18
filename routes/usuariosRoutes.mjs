import express from "express";
import { listarUsuarios, eliminarUsuario } from "../controllers/usuariosController.mjs";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";

const router = express.Router();

// Ruta para ver usuarios registrados
router.get("/dashboard", verificarSesion, listarUsuarios);

// Ruta para eliminar usuario
router.post("/eliminar/:id", verificarSesion, eliminarUsuario);

export default router;