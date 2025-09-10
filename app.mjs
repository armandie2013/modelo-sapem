import express from "express";
import path from "path";
import methodOverride from "method-override";
import expressEjsLayouts from "express-ejs-layouts";
import session from "express-session";
import { connectDB } from "./config/dbConfig.mjs";
import MongoStore from "connect-mongo";

// Rutas
import viaticosRoutes from "./routes/viaticosRoutes.mjs";
import personasRoutes from "./routes/personasRoutes.mjs";
import authRoutes from "./routes/authRoutes.mjs";
import usuariosRoutes from "./routes/usuariosRoutes.mjs";
import escuelasRoutes from "./routes/escuelasRoutes.mjs";
import proveedorRoutes from "./routes/proveedorRoutes.mjs";
import pedidoMaterialRoutes from "./routes/pedidoMaterialRoutes.mjs";
import planesRoutes from "./routes/planesRoutes.mjs";

const app = express();
const PORT = process.env.PORT || 3500;

// 1. Conexión a la base de datos
connectDB();

// 2. Configuración de middlewares generales
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// 3. Manejo de sesiones
app.use(
  session({
    secret: "clave-super-secreta",
    resave: true, // Fuerza a guardar la sesión en cada request (aunque no haya cambios)
    saveUninitialized: false,
    rolling: true, // Resetea el tiempo de expiración de la cookie en cada request, extendiendo la sesión
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI, // Asegurate de tener esta variable en el .env
      ttl: 60 * 60, // 1 hora en segundos
    }),
    cookie: {
      maxAge: 1000 * 60 * 60, // 1 hora en milisegundos
      httpOnly: true,
      sameSite: "lax",
      // secure: true  // Activar solo si estás usando HTTPS
    },
  })
);

// Middleware para registrar actividad de sesión LUEGO BORRAR
app.use((req, res, next) => {
  console.log("🔑 Sesión ID:", req.sessionID);
  if (req.session.usuario) {
    console.log("👤 Usuario en sesión:", req.session.usuario.email);
  } else {
    console.log("⚠️ No hay usuario en sesión");
  }
  next();
});

// 4. Motor de plantillas EJS y layout
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));
app.use(expressEjsLayouts);
app.set("layout", "layout");

// 5. Archivos estáticos
app.use(express.static(path.resolve("./public")));
app.use("/archivos", express.static("C:/upload"));

// 6. Middleware para datos globales en vistas
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  res.locals.rutaActual = req.path;
  next();
});

app.use((req, res, next) => {
  console.log("🔍 Método:", req.method, "➡️ Ruta:", req.originalUrl);
  next();
});

// 7. Rutas principales
app.use(authRoutes);
app.use("/viaticos", viaticosRoutes);
app.use("/personas", personasRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/escuelas", escuelasRoutes);
app.use("/proveedores", proveedorRoutes);
app.use("/pedidos-materiales", pedidoMaterialRoutes);
app.use('/planes', planesRoutes);

// 8. Landing page como ruta principal
app.get("/", (req, res) => {
  res.render("landing", { title: "Inicio" });
});

// 9. Middleware de ruta no encontrada
app.use((req, res) => {
  res.status(404).send({ mensaje: "Ruta no encontrada" });
});

// 10. Mostrar rutas registradas en consola
const listarRutas = (app) => {
  console.log("\uD83D\uDCCB Rutas registradas:");

  if (!app._router || !app._router.stack) {
    console.warn(
      "\u26A0\uFE0F No hay rutas registradas aún o _router no está disponible."
    );
    return;
  }

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      console.log(
        `${Object.keys(middleware.route.methods).join(", ").toUpperCase()} ${
          middleware.route.path
        }`
      );
    } else if (middleware.name === "router") {
      middleware.handle.stack.forEach((nested) => {
        if (nested.route) {
          console.log(
            `${Object.keys(nested.route.methods).join(", ").toUpperCase()} ${
              nested.route.path
            }`
          );
        }
      });
    }
  });
};

listarRutas(app);

// 11. Iniciar servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
