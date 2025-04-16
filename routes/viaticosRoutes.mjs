import express from "express";
import { crearViaticoController, mostrarDashboardViaticos, mostrarTodosLosViaticos } from "../controllers/viaticosController.mjs";

const router = express.Router();

// Ruta para renderizar el formulario de creación de viáticos
router.get("/crear", (req, res) => {
  console.log("Entró a /viaticos/crear");
  res.render("crearViatico", {
    title: "Nuevo Viático",
    errores: [],
    viatico: {},
  });
});

router.get("/dashboard", verificarSesion, async (req, res) => {
  const viaticos = await Viatico.find().sort({ fechaDeCreacion: -1 }).limit(5);
  res.render("dashboardViaticos", {
    title: "Dashboard de Viáticos",
    usuario: req.session.usuario,
    viaticos,
  });
});

// Ruta para procesar la creación del viático
router.post("/crear", crearViaticoController);
router.get("/dashboard", mostrarDashboardViaticos);
router.get("/dashboard/todos", mostrarTodosLosViaticos);

export default router;