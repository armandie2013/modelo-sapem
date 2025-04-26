import express from "express";
import {
  crearViaticoController,
  mostrarDashboardViaticos,
  mostrarTodosLosViaticos,
  mostrarFormularioViatico,
  eliminarViaticoController,
  verViaticoController,
  editarViaticoController,
  mostrarFormularioEditarViatico
} from "../controllers/viaticosController.mjs";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { verificarPermiso } from "../middlewares/permisosPorAccion.mjs";
import { obtenerUltimosViaticos } from "../services/viaticosService.mjs";

const router = express.Router();

// Dashboard principal de viáticos (últimos 5)
router.get(
  "/dashboard",
  verificarSesion,
  verificarPermiso("viaticos", "ver"),
  mostrarDashboardViaticos
);

// Ver todos los viáticos
router.get(
  "/dashboard/todos",
  verificarSesion,
  verificarPermiso("viaticos", "ver"),
  mostrarTodosLosViaticos
);

// Formulario para crear viático
router.get(
  "/crear",
  verificarSesion,
  verificarPermiso("viaticos", "crear"),
  mostrarFormularioViatico
);

// Crear viático
router.post(
  "/crear",
  verificarSesion,
  verificarPermiso("viaticos", "crear"),
  crearViaticoController
);

// Ver viático
router.get(
  "/:id",
  verificarSesion,
  verificarPermiso("viaticos", "ver"),
  verViaticoController
);

// Formulario para editar
router.get(
  "/:id/editar",
  verificarSesion,
  verificarPermiso("viaticos", "editar"),
  mostrarFormularioEditarViatico
);

// Actualizar viático
router.put(
  "/:id",
  verificarSesion,
  verificarPermiso("viaticos", "editar"),
  editarViaticoController
);

// Eliminar viático
router.delete(
  "/:id",
  verificarSesion,
  verificarPermiso("viaticos", "eliminar"),
  eliminarViaticoController
);

// 🆕 Endpoint para listar viáticos en formato JSON
router.get(
  "/api/listar",
  verificarSesion,
  verificarPermiso("viaticos", "ver"),
  async (req, res) => {
    try {
      const viaticos = await obtenerUltimosViaticos(); // o todos, depende de lo que quieras mostrar
      res.json(viaticos);
    } catch (error) {
      console.error("Error al obtener viáticos para API:", error);
      res.status(500).json({ mensaje: "Error interno" });
    }
  }
);

export default router;