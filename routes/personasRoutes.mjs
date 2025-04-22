// routes/personasRoutes.mjs

import express from "express";
import {
  mostrarFormularioAgregar,
  agregarPersona,
  listarPersonas,
  mostrarFormularioEditar,
  actualizarPersona,
  eliminarPersona,
} from "../controllers/personasController.mjs";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { verificarAdmin } from "../middlewares/verificarAdmin.mjs";

const router = express.Router();

// Listar personas
router.get(
  "/dashboard",
  verificarSesion,
  verificarAdmin,
  listarPersonas
);

// Mostrar formulario para agregar persona
router.get(
  "/agregar",
  verificarSesion,
  verificarAdmin,
  mostrarFormularioAgregar
);

// Agregar persona
router.post(
  "/agregar",
  verificarSesion,
  verificarAdmin,
  agregarPersona
);

// Mostrar formulario para editar persona
router.get(
  "/editar/:id",
  verificarSesion,
  verificarAdmin,
  mostrarFormularioEditar
);

// Actualizar persona
router.put(
  "/editar/:id",
  verificarSesion,
  verificarAdmin,
  actualizarPersona
);

// Eliminar persona
router.delete(
  "/eliminar/:id",
  verificarSesion,
  verificarAdmin,
  eliminarPersona
);

export default router;
