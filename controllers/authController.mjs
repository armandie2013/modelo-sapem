// controllers/authController.mjs

import Usuario from "../models/usuario.mjs";
import bcrypt from "bcrypt";

export const registrarUsuarioController = async (req, res) => {
  try {
    console.log("Registrando usuario...", req.body); // 👈 log útil
    const { nombre, apellido, dni, email, password, rol } = req.body;

    // Verificar duplicados por DNI o Email
    const existeEmail = await Usuario.findOne({ email });
    const existeDni = await Usuario.findOne({ dni });

    if (existeEmail || existeDni) {
      const errores = [];
      if (existeEmail)
        errores.push({ campo: "email", mensaje: "Correo ya registrado" });
      if (existeDni)
        errores.push({ campo: "dni", mensaje: "DNI ya registrado" });
      return res.status(400).render("registro", {
        title: "Registro",
        errores,
        usuario: req.body,
      });
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    const nuevoUsuario = new Usuario({
      nombre,
      apellido,
      dni,
      email,
      password: passwordHash,
      // rol: rol || "usuario", // por defecto, antes habiliar el campo rol en el formulario de registro
      rol: "usuario", // por defecto, antes habiliar el campo rol en el formulario de registro
    });

    await nuevoUsuario.save();

    res.redirect("/login");
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    res.status(500).send("Error al registrar usuario");
  }
};

export const mostrarFormularioLogin = (req, res) => {
  res.render("login", {
    title: "Iniciar sesión",
    errores: [],
    error: null,
    datos: {},
  });
};

export const procesarLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(401).render("login", {
        title: "Iniciar sesión",
        errores: [{ campo: "email", mensaje: "Correo no registrado" }],
        datos: req.body,
      });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).render("login", {
        title: "Iniciar sesión",
        errores: [{ campo: "password", mensaje: "Contraseña incorrecta" }],
        datos: req.body,
      });
    }

    // Guardamos el usuario en sesión
    req.session.usuario = {
      id: usuario._id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
      dni: String(usuario.dni),
    };

    res.redirect("/viaticos/dashboard");
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).send("Error del servidor");
  }
};

export const cerrarSesion = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};
