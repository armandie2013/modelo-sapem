// controllers/authController.mjs
import usuario from '../models/usuario.mjs';
import bcrypt from 'bcrypt';

export const registrarUsuarioController = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    // Verificar si ya existe el usuario
    const existeUsuario = await usuario.findOne({ email });
    if (existeUsuario) {
      return res.status(400).render("registro", {
        title: "Registro",
        errores: [{ campo: "email", mensaje: "El correo ya está registrado" }],
        usuario: req.body,
      });
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    const nuevoUsuario = new usuario({
      nombre,
      email,
      password: passwordHash,
      rol: rol || 'usuario', // por defecto
    });

    await nuevoUsuario.save();

    res.redirect('/login');
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    res.status(500).send("Error al registrar usuario");
  }
};