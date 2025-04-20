import express from "express";
import {
  crearViaticoController,
  mostrarDashboardViaticos,
  mostrarTodosLosViaticos,
  mostrarFormularioViatico,
} from "../controllers/viaticosController.mjs";
import { verificarSesion } from "../middlewares/authMiddleware.mjs";
import { accesoPorDni } from "../middlewares/dniAccessMiddleware.mjs";
import { dniPermitidosModuloViaticos } from "../utils/dniPermitidos.mjs";
import Viatico from "../models/viatico.mjs";
import { accesoPorModulo } from "../middlewares/moduloAccessMiddleware.mjs";

const router = express.Router();


router.get(
  "/crear",
  verificarSesion,
  // accesoPorDni(dniPermitidosModuloViaticos),
  mostrarFormularioViatico
);

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

// Ruta para procesar la creación del viático
// router.post("/crear", verificarSesion, accesoPorDni(dniPermitidosModuloViaticos), crearViaticoController);
router.post("/crear", verificarSesion, accesoPorModulo("viaticos"), crearViaticoController);
// router.get("/dashboard", mostrarDashboardViaticos);
router.get("/dashboard/todos", mostrarTodosLosViaticos);

// router.get("/crear", mostrarFormularioViatico);
// // router.post("/crear", crearViaticoController);

export default router;
