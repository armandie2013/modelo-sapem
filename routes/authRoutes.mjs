// // routes/authRoutes.mjs
// import express from "express";
// import {
//   mostrarFormularioRegistro,
//   registrarUsuarioController,
//   mostrarFormularioLogin,
//   procesarLogin,
//   cerrarSesion,
// } from "../controllers/authController.mjs";
// import { verificarSesionParaLogout } from "../middlewares/verificarSesionParaLogout.mjs";

// const router = express.Router();

// // Mostrar formulario de registro
// router.get("/registro", mostrarFormularioRegistro);

// // Procesar formulario de registro
// router.post("/registro", registrarUsuarioController);

// // Mostrar login
// router.get("/login", mostrarFormularioLogin);

// // Procesar login
// router.post("/login", procesarLogin);

// // Cerrar sesión
// router.post("/logout", verificarSesionParaLogout, cerrarSesion);

// // Cerrar sesión MANUAL
// router.get("/logout", verificarSesionParaLogout, cerrarSesion);

// export default router;

import express from "express";

import {
  mostrarFormularioRegistro,
  registrarUsuarioController,
  mostrarFormularioLogin,
  procesarLogin,
  cerrarSesion,
} from "../controllers/authController.mjs";

import {
  mostrarInicio,
} from "../controllers/inicioController.mjs";

import {
  verificarSesionParaLogout,
} from "../middlewares/verificarSesionParaLogout.mjs";

const router = express.Router();

// Inicio personalizado: el controlador exige sesión.
router.get("/inicio", mostrarInicio);

// Registro.
router.get("/registro", mostrarFormularioRegistro);
router.post("/registro", registrarUsuarioController);

// Inicio de sesión.
router.get("/login", mostrarFormularioLogin);
router.post("/login", procesarLogin);

// Cierre de sesión.
router.post("/logout", verificarSesionParaLogout, cerrarSesion);
router.get("/logout", verificarSesionParaLogout, cerrarSesion);

export default router;