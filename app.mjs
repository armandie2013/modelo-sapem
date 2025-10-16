import express from "express";
import path from "path";
import methodOverride from "method-override";
import expressEjsLayouts from "express-ejs-layouts";
import session from "express-session";
import MongoStore from "connect-mongo";
import { fmtHora, fmtHoraCorta, fmtFecha, fmtFechaHora } from "./utils/formatFechas.mjs";
import { connectDB } from "./config/dbConfig.mjs";
import { startCargosCron } from "./jobs/cargosCron.mjs";
import { catchUpCargos } from "./services/cargosService.mjs";
import cambioRoutes from "./routes/cambioRoutes.mjs";
import { usdNavbarMiddleware } from "./middlewares/usdNavbar.mjs";

import viaticosRoutes from "./routes/viaticosRoutes.mjs";
import personasRoutes from "./routes/personasRoutes.mjs";
import authRoutes from "./routes/authRoutes.mjs";
import usuariosRoutes from "./routes/usuariosRoutes.mjs";
import escuelasRoutes from "./routes/escuelasRoutes.mjs";
import proveedorRoutes from "./routes/proveedorRoutes.mjs";
import pedidoMaterialRoutes from "./routes/pedidoMaterialRoutes.mjs";
import planesRoutes from "./routes/planesRoutes.mjs";
import cargosRoutes from "./routes/cargosRoutes.mjs";
import notasRoutes from "./routes/notasRoutes.mjs";
import pagosRoutes from "./routes/pagosRoutes.mjs";
import planPagoRoutes from "./routes/planPagoRoutes.mjs";
import tareasRoutes from "./routes/tareasRoutes.mjs";

import clock from "./utils/clock.mjs";

const app = express();
const PORT = process.env.PORT || 3500;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.use(
  session({
    secret: "clave-super-secreta",
    resave: true,
    saveUninitialized: false,
    rolling: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 60 * 60,
    }),
    cookie: {
      maxAge: 1000 * 60 * 60,
      httpOnly: true,
      sameSite: "lax",
      // secure: true, // en HTTPS
    },
  })
);

// 👇 hidratar req.usuario desde la sesión (¡clave!)
app.use((req, res, next) => {
  req.usuario = req.session?.usuario || null;
  next();
});

app.use((req, res, next) => {
  console.log("🔑 Sesión ID:", req.sessionID);
  console.log(req.session.usuario ? `👤 ${req.session.usuario.email}` : "⚠️ No hay usuario en sesión");
  next();
});

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));
app.use(expressEjsLayouts);
app.set("layout", "layout");

app.use(express.static(path.resolve("./public")));
app.use("/archivos", express.static("C:/upload"));

app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  res.locals.rutaActual = req.path;
  res.locals.fmtHora = fmtHora;
  res.locals.fmtHoraCorta = fmtHoraCorta;
  res.locals.fmtFecha = fmtFecha;
  res.locals.fmtFechaHora = fmtFechaHora;
  next();
});

app.use((req, res, next) => {
  console.log("🔍", req.method, req.originalUrl);
  next();
});

app.get("/debug/time", (req, res) => {
  const s = clock.getStatus();
  res.json({
    systemNow: new Date().toISOString(),
    clockNow: clock.date().toISOString(),
    offsetMs: s.offsetMs,
    lastSyncOk: s.lastSyncOk,
  });
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  return usdNavbarMiddleware(req, res, next);
});

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
app.use("/notas", notasRoutes);
app.use("/planes-pago", planPagoRoutes);
app.use(tareasRoutes);
app.use("/api/cambio", cambioRoutes);

app.get("/", (req, res) => {
  res.render("landing", { title: "Inicio" });
});

app.use((req, res) => {
  res.status(404).send({ mensaje: "Ruta no encontrada" });
});

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

(async () => {
  try {
    await clock.init({ waitForFirstSync: false, intervalMs: 15 * 60 * 1000 });
    await connectDB();

    // Evitamos backfill automático
    // await catchUpCargos(1);

    startCargosCron();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Servidor escuchando en el puerto ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error al iniciar la app:", err);
    process.exit(1);
  }
})();
