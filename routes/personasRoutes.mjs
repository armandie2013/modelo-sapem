import express from "express";
import {
  mostrarFormularioAgregar,
  agregarPersona,
  listarPersonas,
  mostrarFormularioEditar,
  actualizarPersona,
  eliminarPersona
} from "../controllers/personasController.mjs";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { verificarAdmin } from "../middlewares/verificarAdmin.mjs";

const router = express.Router();

// Listar todas las personas
router.get("/dashboard", verificarSesion, verificarAdmin, listarPersonas);

// Formulario para agregar persona
router.get("/agregar", verificarSesion, verificarAdmin, mostrarFormularioAgregar);

// Acción para agregar persona
router.post("/agregar", verificarSesion, verificarAdmin, agregarPersona);

// Formulario para editar persona
router.get("/editar/:id", verificarSesion, verificarAdmin, mostrarFormularioEditar);

// Acción para actualizar persona
router.put("/editar/:id", verificarSesion, verificarAdmin, actualizarPersona);

// Acción para eliminar persona
router.delete("/eliminar/:id", verificarSesion, verificarAdmin, eliminarPersona);

export default router;