import {
  verificarEmailExistente,
  verificarDniExistente,
  crearUsuarioConHash,
  buscarUsuarioPorEmail,
  validarPassword,
} from "../services/authService.mjs";
import { buscarPersonaPorDni } from "../services/personasService.mjs";

// Mostrar formulario de registro
export const mostrarFormularioRegistro = (req, res) => {
  res.render("registro", {
    title: "Registro",
    errores: [],
    usuario: {},
    path: req.path,
  });
};

// Controlador para registrar un nuevo usuario
export const registrarUsuarioController = async (req, res) => {
  try {
    const { nombre, apellido, dni, email, password, confirmarPassword } =
      req.body;
    const errores = [];

    if (await verificarEmailExistente(email)) {
      errores.push({ campo: "email", mensaje: "Correo ya registrado" });
    }
    if (await verificarDniExistente(dni)) {
      errores.push({ campo: "dni", mensaje: "DNI ya registrado" });
    }
    if (password !== confirmarPassword) {
      errores.push({ campo: "password", mensaje: "Las contraseñas no coinciden" });
    }

    if (errores.length > 0) {
      return res.status(400).render("registro", {
        title: "Registro",
        errores,
        usuario: req.body,
        path: req.path,
      });
    }

    await crearUsuarioConHash({ nombre, apellido, dni, email, password });
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
    const usuario = await buscarUsuarioPorEmail(email);
    const passwordValido = usuario
      ? await validarPassword(password, usuario.password)
      : false;

    if (!usuario || !passwordValido) {
      return res.status(401).render("login", {
        title: "Iniciar sesión",
        errores: [{ mensaje: "Usuario o contraseña incorrectos" }],
        datos: req.body,
        path: req.path,
      });
    }

    console.log("✅ Sesión iniciada para:", usuario.email);

    // Permisos por DNI
    const persona = await buscarPersonaPorDni(usuario.dni);
    const modulosPermitidos = persona?.modulosPermitidos || {};

    // 👇 guardar _id (NO 'id') para que req.usuario._id exista
    req.session.usuario = {
      _id: String(usuario._id),
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
      dni: String(usuario.dni),
      modulosPermitidos,
    };

    console.log("📦 Datos de sesión guardados:", req.session.usuario);

    req.session.save(() => {
      const redirigirA = req.session.redirigirA || "/viaticos/dashboard";
      delete req.session.redirigirA;
      res.redirect(redirigirA);
    });
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
  const email = req.session?.usuario?.email || "desconocido";

  req.session.destroy(() => {
    console.log("🚪 Cerrando sesión para:", email);
    res.redirect("/");
  });
};
