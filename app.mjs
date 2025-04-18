import express from "express";
import path from "path";
import methodOverride from "method-override";
import expressEjsLayouts from "express-ejs-layouts";
import session from "express-session";
import { connectDB } from "./config/dbConfig.mjs";

// Rutas
import viaticosRoutes from "./routes/viaticosRoutes.mjs";
import personasRoutes from "./routes/personasRoutes.mjs";
import authRoutes from "./routes/authRoutes.mjs";

const app = express();
const PORT = process.env.PORT || 3500;

// Conexión a la base de datos
connectDB();

// Middlewares generales
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// Manejo de sesiones
app.use(
  session({
    secret: "clave_super_segura",
    resave: false,
    saveUninitialized: false,
  })
);

// Motor de plantillas EJS
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));
app.use(expressEjsLayouts);
app.set("layout", "layout");

// Archivos estáticos
app.use(express.static(path.resolve("./public")));

// Este middleware pone el usuario y la ruta actual en todas las vistas
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  res.locals.rutaActual = req.path;
  next();
});

// Rutas principales
app.use(authRoutes);
app.use("/viaticos", viaticosRoutes);
app.use("/personas", personasRoutes);

// Landing page como página principal
app.get("/", (req, res) => {
  res.render("landing", { title: "Inicio" });
});

// Middleware de ruta no encontrada
app.use((req, res) => {
  res.status(404).send({ mensaje: "Ruta no encontrada" });
});

// Mostrar rutas registradas
const listarRutas = (app) => {
  console.log("📋 Rutas registradas:");

  if (!app._router || !app._router.stack) {
    console.warn("⚠️ No hay rutas registradas aún o _router no está disponible.");
    return;
  }

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      console.log(`${Object.keys(middleware.route.methods).join(", ").toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === "router") {
      middleware.handle.stack.forEach((nested) => {
        if (nested.route) {
          console.log(`${Object.keys(nested.route.methods).join(", ").toUpperCase()} ${nested.route.path}`);
        }
      });
    }
  });
};

listarRutas(app);

// Iniciar servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
