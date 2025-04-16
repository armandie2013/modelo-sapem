import express from 'express';
import path from 'path';
import methodOverride from 'method-override';
import expressEjsLayouts from 'express-ejs-layouts';
import { connectDB } from './config/dbConfig.mjs';
import viaticosRoutes from './routes/viaticosRoutes.mjs';

const app = express();
const PORT = process.env.PORT || 3500;

// Conexión a la base de datos
connectDB();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.resolve('./views'));
app.use(expressEjsLayouts);
app.set('layout', 'layout'); // Usa views/layout.ejs como layout base

// Archivos estáticos
app.use(express.static(path.resolve('./public')));

// Rutas
app.use('/viaticos', viaticosRoutes);

// Ruta base
app.get('/', (req, res) => {
  res.redirect('/viaticos/crear');
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
          console.log(`${Object.keys(nested.route.methods).join(", ").toUpperCase()} /viaticos${nested.route.path}`);
        }
      });
    }
  });
};

listarRutas(app);

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});