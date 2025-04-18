import express from "express";
import { registrarUsuarioController, mostrarFormularioLogin, procesarLogin, cerrarSesion } from "../controllers/authController.mjs";

const router = express.Router();

// Mostrar formulario
router.get("/registro", (req, res) => {
  res.render("registro", {
    title: "Registro de Usuario",
    errores: [],
    usuario: {},
  });
});

// Mostrar formulario de registro
router.get('/registro', (req, res) => {
  res.render('registro', { title: 'Registro', errores: [], usuario: {} });
});

// Procesar formulario de registro
router.post('/registro', registrarUsuarioController);

// Login
router.get('/login', mostrarFormularioLogin);
router.post('/login', procesarLogin);


// Logout
router.get("/logout", cerrarSesion);

export default router;
