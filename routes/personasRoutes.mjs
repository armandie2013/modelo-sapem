import express from "express";
import {
  mostrarFormularioAgregar,
  agregarPersona,
  listarPersonas,
  mostrarFormularioEditar,
  actualizarPersona,
  eliminarPersona,
} from "../controllers/personasController.mjs";

const router = express.Router();

router.get("/agregar", mostrarFormularioAgregar);
router.post("/agregar", agregarPersona);

router.get("/dashboard", listarPersonas);

router.get("/editar/:id", mostrarFormularioEditar);
router.put("/editar/:id", actualizarPersona);

router.delete("/eliminar/:id", eliminarPersona);

export default router;