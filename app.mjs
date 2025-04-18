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
import usuariosRoutes from "./routes/usuariosRoutes.mjs";

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
    secret: "clave_super_segura",
    resave: false,
    saveUninitialized: false,
  })
);

// 4. Motor de plantillas EJS y layout
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));
app.use(expressEjsLayouts);
app.set("layout", "layout");

// 5. Archivos estáticos
app.use(express.static(path.resolve("./public")));

// 6. Middleware para datos globales en vistas
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  res.locals.rutaActual = req.path;
  next();
});

// 7. Rutas principales
app.use(authRoutes);
app.use("/viaticos", viaticosRoutes);
app.use("/personas", personasRoutes);
app.use("/usuarios", usuariosRoutes);

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
    console.warn("\u26A0\uFE0F No hay rutas registradas aún o _router no está disponible.");
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

// 11. Iniciar servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
