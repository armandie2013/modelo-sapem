import express from "express";
import path from "path";
import methodOverride from "method-override";
import expressEjsLayouts from "express-ejs-layouts";
import session from "express-session";
import MongoStore from "connect-mongo";

import { connectDB } from "./config/dbConfig.mjs";
import { startCargosCron } from "./jobs/cargosCron.mjs";
import { catchUpCargos } from "./services/cargosService.mjs";
import pagosRoutes from "./routes/pagosRoutes.mjs";

// Rutas
import viaticosRoutes from "./routes/viaticosRoutes.mjs";
import personasRoutes from "./routes/personasRoutes.mjs";
import authRoutes from "./routes/authRoutes.mjs";
import usuariosRoutes from "./routes/usuariosRoutes.mjs";
import escuelasRoutes from "./routes/escuelasRoutes.mjs";
import proveedorRoutes from "./routes/proveedorRoutes.mjs";
import pedidoMaterialRoutes from "./routes/pedidoMaterialRoutes.mjs";
import planesRoutes from "./routes/planesRoutes.mjs";
import cargosRoutes from "./routes/cargosRoutes.mjs";

// 👇 RELOJ CENTRALIZADO
import clock from "./utils/clock.mjs";

const app = express();
const PORT = process.env.PORT || 3500;

// 2. Middlewares generales
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// 3. Sesión
app.use(
  session({
    secret: "clave-super-secreta",
    resave: true,
    saveUninitialized: false,
    rolling: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 60 * 60, // 1h
    }),
    cookie: {
      maxAge: 1000 * 60 * 60, // 1h
      httpOnly: true,
      sameSite: "lax",
      // secure: true, // en HTTPS
    },
  })
);

// (debug de sesión; quitá en prod)
app.use((req, res, next) => {
  console.log("🔑 Sesión ID:", req.sessionID);
  console.log(req.session.usuario ? `👤 ${req.session.usuario.email}` : "⚠️ No hay usuario en sesión");
  next();
});

// 4. EJS + layout
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));
app.use(expressEjsLayouts);
app.set("layout", "layout");

// 5. Estáticos
app.use(express.static(path.resolve("./public")));
app.use("/archivos", express.static("C:/upload")); // sugerencia: mover a ENV

// 6. Datos globales para vistas
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  res.locals.rutaActual = req.path;

  // ✅ Helpers de fecha/hora con TZ AR (mostrar SIEMPRE AR; guardar SIEMPRE UTC)
  res.locals.fmtFecha = (d) =>
    d ? new Date(d).toLocaleDateString("es-AR", { timeZone: clock.tz }) : "—";
  res.locals.fmtHora = (d) =>
    d ? new Date(d).toLocaleTimeString("es-AR", { timeZone: clock.tz }) : "—";
  res.locals.fmtFechaHora = (d) =>
    d ? new Date(d).toLocaleString("es-AR", { timeZone: clock.tz }) : "—";

  next();
});

// log de requests
app.use((req, res, next) => {
  console.log("🔍", req.method, req.originalUrl);
  next();
});

// 👉 Ruta de diagnóstico de reloj (opcional)
app.get("/debug/time", (req, res) => {
  const s = clock.getStatus();
  res.json({
    systemNow: new Date().toISOString(),
    clockNow: clock.date().toISOString(),
    offsetMs: s.offsetMs,
    lastSyncOk: s.lastSyncOk,
  });
});

// 7. Rutas
app.use(authRoutes);
app.use("/viaticos", viaticosRoutes);
app.use("/personas", personasRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/escuelas", escuelasRoutes);
app.use("/proveedores", proveedorRoutes);
app.use("/pedidos-materiales", pedidoMaterialRoutes);
app.use("/planes", planesRoutes);
app.use("/tareas", cargosRoutes);
app.use("/pagos", pagosRoutes);

// 8. Landing
app.get("/", (req, res) => {
  res.render("landing", { title: "Inicio" });
});

// 9. 404
app.use((req, res) => {
  res.status(404).send({ mensaje: "Ruta no encontrada" });
});

// 10. Listar rutas
const listarRutas = (app) => {
  console.log("📋 Rutas registradas:");
  if (!app._router || !app._router.stack) return;
  app._router.stack.forEach((mw) => {
    if (mw.route) {
      console.log(`${Object.keys(mw.route.methods).join(", ").toUpperCase()} ${mw.route.path}`);
    } else if (mw.name === "router") {
      mw.handle.stack.forEach((nested) => {
        if (nested.route) {
          console.log(`${Object.keys(nested.route.methods).join(", ").toUpperCase()} ${nested.route.path}`);
        }
      });
    }
  });
};
listarRutas(app);

// 11. Boot ordenado (Clock -> DB -> catchUp -> cron -> listen)
(async () => {
  try {
    // ⏱️ Inicializar reloj (no bloquea el arranque; usa HTTP Date/NTP si puede)
    await clock.init({ waitForFirstSync: false, intervalMs: 15 * 60 * 1000 });

    await connectDB();

    // Si en servicios usás clock.date(), esto mantiene “meses perdidos” con la misma base horaria
    await catchUpCargos(1);

    startCargosCron();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Servidor escuchando en el puerto ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error al iniciar la app:", err);
    process.exit(1);
  }
})();