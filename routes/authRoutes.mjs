import express from 'express';
import { registrarUsuarioController } from '../controllers/authController.mjs';

const router = express.Router();

// Mostrar formulario
router.get('/registro', (req, res) => {
  res.render('register', {
    title: "Registro de Usuario",
    errores: [],
    usuario: {},
  });
});

// Procesar formulario
router.post('/register', registrarUsuarioController);

export default router;