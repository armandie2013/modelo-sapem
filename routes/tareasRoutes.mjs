// routes/tareasRoutes.mjs
import express from "express";
import { vistaTareasCargos, postGenerarCargosMes } from "../controllers/tareasController.mjs";

const router = express.Router();

// Vista
router.get("/tareas/cargos", vistaTareasCargos);

// Acción manual (mismo que la tarea del 28, idempotente)
router.post("/cargos/mensual", postGenerarCargosMes);

export default router;
