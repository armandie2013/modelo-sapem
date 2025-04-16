import express from "express";
import { registrarUsuarioController } from "../controllers/authController.mjs";

const router = express.Router();

// Mostrar formulario
router.get("/registro", (req, res) => {
  res.render("register", {
    title: "Registro de Usuario",
    errores: [],
    usuario: {},
  });
});

// Procesar formulario
router.post("/register", registrarUsuarioController);

router.get("/login", (req, res) => {
  res.render("login", { title: "Iniciar Sesión", error: null, username: "" });
});

export default router;
