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

router.get("/dashboard", verificarSesion, verificarAdmin, listarPersonas);

router.get("/agregar", verificarSesion, verificarAdmin, mostrarFormularioAgregar);
router.post("/agregar", verificarSesion, verificarAdmin, agregarPersona);


router.get("/editar/:id", verificarSesion, verificarAdmin, mostrarFormularioEditar);
router.put("/editar/:id", verificarSesion, actualizarPersona);

router.delete("/eliminar/:id", verificarSesion, verificarAdmin, eliminarPersona);

export default router;