import express from "express";
import {
  mostrarFormularioCrearPedidoController,
  crearPedidoMaterialController,
  listarPedidosMaterialesController,
  verPedidoMaterialController,
  eliminarPedidoMaterialController,
  mostrarFormularioEditarPedidoController,
  actualizarPedidoMaterialController,
  generarPDFPedidoMaterialController,
} from "../controllers/pedidoMaterialController.mjs";

import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { verificarPermiso } from "../middlewares/permisosPorAccion.mjs";

const router = express.Router();

// Mostrar formulario de creación
router.get(
  "/crear",
  verificarSesion,
  verificarPermiso("materiales", "crear"),
  mostrarFormularioCrearPedidoController
);

// Procesar creación
router.post(
  "/crear",
  verificarSesion,
  verificarPermiso("materiales", "crear"),
  crearPedidoMaterialController
);

// Dashboard de pedidos
router.get(
  "/dashboard",
  verificarSesion,
  verificarPermiso("materiales", "ver"),
  listarPedidosMaterialesController
);

// Ver detalle de pedido
router.get(
  "/:id/ver",
  verificarSesion,
  verificarPermiso("materiales", "editar"),
  verPedidoMaterialController
);

// Eliminar pedido
router.post(
  "/:id/eliminar",
  verificarSesion,
  verificarPermiso("materiales", "editar"),
  eliminarPedidoMaterialController
);

// Mostrar formulario de edición
router.get(
  "/:id/editar",
  verificarSesion,
  verificarPermiso("materiales", "editar"),
  mostrarFormularioEditarPedidoController
);

// Procesar edición
router.post(
  "/:id/editar",
  verificarSesion,
  verificarPermiso("materiales", "editar"),
  actualizarPedidoMaterialController
);

// Ruta para generar PDF
router.get(
  "/pdf/:id",
  verificarSesion,
  verificarPermiso("materiales", "ver"),
  generarPDFPedidoMaterialController
);

export default router;
