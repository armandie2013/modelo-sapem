// routes/cargosRoutes.mjs
import { Router } from "express";
import { postGenerarCargosMes } from "../controllers/cargosController.mjs";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { verificarPermiso } from "../middlewares/permisosPorAccion.mjs";

const router = Router();

// Solo usuarios con permiso para editar proveedores
router.post(
  "/cargos/mensual",
  verificarSesion,
  verificarPermiso("proveedores", "editar"),
  postGenerarCargosMes
);

export default router;