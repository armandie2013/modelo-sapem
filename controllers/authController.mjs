// controllers/authController.mjs
import Usuario from "../models/usuario.mjs";
import bcrypt from "bcrypt";

export const registrarUsuarioController = async (req, res) => {
  try {
    console.log("Registrando usuario...", req.body); // 👈 log útil
    const { nombre, email, password, rol } = req.body;

    // Verificar si ya existe el usuario
    const existeUsuario = await Usuario.findOne({ email });
    if (existeUsuario) {
      return res.status(400).render("registro", {
        title: "Registro",
        errores: [{ campo: "email", mensaje: "El correo ya está registrado" }],
        usuario: req.body,
      });
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    const nuevoUsuario = new Usuario({
      nombre,
      email,
      password: passwordHash,
      rol: rol || "usuario", // por defecto
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
      email: usuario.email,
      rol: usuario.rol,
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
