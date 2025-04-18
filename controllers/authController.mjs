import Usuario from "../models/usuario.mjs";
import bcrypt from "bcrypt";

// Controlador para registrar un nuevo usuario
export const registrarUsuarioController = async (req, res) => {
  try {
    console.log("Registrando usuario...", req.body);
    const { nombre, apellido, dni, email, password } = req.body;

    // Validar duplicados
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
        path: req.path,
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
      rol: "usuario",
    });

    await nuevoUsuario.save();

    res.redirect("/login");
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    res.status(500).render("registro", {
      title: "Registro",
      errores: [{ mensaje: "Error al registrar usuario" }],
      usuario: req.body,
      path: req.path,
    });
  }
};

// Mostrar formulario de login
export const mostrarFormularioLogin = (req, res) => {
  res.render("login", {
    title: "Iniciar sesión",
    errores: [],
    error: null,
    datos: {},
    path: req.path,
  });
};

// Procesar inicio de sesión
export const procesarLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(401).render("login", {
        title: "Iniciar sesión",
        errores: [{ campo: "email", mensaje: "Correo no registrado" }],
        datos: req.body,
        path: req.path,
      });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).render("login", {
        title: "Iniciar sesión",
        errores: [{ campo: "password", mensaje: "Contraseña incorrecta" }],
        datos: req.body,
        path: req.path,
      });
    }

    console.log("🧑 Usuario autenticado:", usuario);

    // Guardar en sesión
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
    res.status(500).render("login", {
      title: "Iniciar sesión",
      errores: [{ mensaje: "Error del servidor" }],
      datos: req.body,
      path: req.path,
    });
  }
};

// Cerrar sesión
export const cerrarSesion = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};