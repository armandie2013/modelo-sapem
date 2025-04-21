import express from "express";
import {
  crearViaticoController,
  mostrarDashboardViaticos,
  mostrarTodosLosViaticos,
  mostrarFormularioViatico,
} from "../controllers/viaticosController.mjs";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import Viatico from "../models/viatico.mjs";
import { accesoPorModulo } from "../middlewares/moduloAccessMiddleware.mjs";

const router = express.Router();




router.get(
  "/dashboard",
  verificarSesion,
  accesoPorModulo("viaticos"),
  mostrarDashboardViaticos,
  async (req, res) => {
    const viaticos = await Viatico.find()
      .sort({ fechaDeCreacion: -1 })
      .limit(5);
    res.render("dashboardViaticos", {
      title: "Dashboard de Viáticos",
      usuario: req.session.usuario,
      viaticos,
    });
  }
);

router.get(
  "/crear",
  verificarSesion,
  accesoPorModulo("viaticos"),
  mostrarFormularioViatico
);

router.post("/crear", verificarSesion, accesoPorModulo("viaticos"), crearViaticoController);


router.get("/dashboard/todos", mostrarTodosLosViaticos);



export default router;
