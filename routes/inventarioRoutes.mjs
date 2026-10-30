import { similaresProducto } from '../services/inventarioCatalogoService.mjs';
import { Router } from "express";
import multer from "multer";
import * as documento from '../controllers/inventarioDocumentoController.mjs';
import rutasCrud from './inventarioCrudRoutes.mjs';
import { accesoInventario } from '../services/inventarioPersistencia.mjs';

import {
  verificarSesion,
} from "../middlewares/authMiddleware.mjs";

import {
  cargarPermisosInventario,
} from "../middlewares/inventarioAccessMiddleware.mjs";

import * as controlador from "../controllers/inventarioController.mjs";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 3,
    fields: 30,
    fieldSize: 1024 * 1024,
  },
}).array("archivos", 3);

router.use(
  verificarSesion,
  cargarPermisosInventario
);

function permiso(accion) {
  return (req, res, next) => {
    if (
      req.invPermisos.ver &&
      req.invPermisos[accion]
    ) {
      return next();
    }

    res.status(403).render("noAutorizado", {
      title: "Permiso denegado",
      usuario: req.session.usuario,
      rutaActual: req.originalUrl,
      moduloActual: "inventario",
      accion,
    });
  };
}

function csrf(req, res, next) {
  if (
    !req.session.invCsrf ||
    req.body._csrf !== req.session.invCsrf
  ) {
    return res.status(403).send(
      "Formulario vencido o inválido. Volvé a abrir Inventario."
    );
  }

  next();
}

router.use(permiso('ver'), accesoInventario);
router.use(rutasCrud(permiso, csrf));
router.get('/productos/similares', permiso('ver'), async (req, res) => {
  res.json(await similaresProducto({ nombre: String(req.query.nombre || '').slice(0,180), modelo: String(req.query.modelo || '').slice(0,100) }, String(req.query.excluir || '')));
});
router.post('/ingresos/documento', permiso('ingresar'), upload, csrf, documento.guardarDocumento);
router.post('/ingresos/:id/productos', permiso('ingresar'), permiso('administrar'), csrf, documento.nuevoProducto);

router.get(
  "/",
  permiso("ver"),
  controlador.dashboard
);

router.get(
  "/depositos",
  permiso("ver"),
  controlador.depositos
);

router.get(
  "/depositos/nuevo",
  permiso("administrar"),
  controlador.formularioCatalogo("deposito")
);

router.post(
  "/depositos/:id/principal",
  permiso("administrar"),
  csrf,
  controlador.principal
);

router.get(
  "/destinatarios",
  permiso("ver"),
  controlador.destinatarios
);

router.get(
  "/destinatarios/nuevo",
  permiso("administrar"),
  controlador.formularioCatalogo("destino")
);

router.get(
  "/ubicaciones/:id",
  permiso("ver"),
  controlador.ubicacion
);

router.get(
  "/productos",
  permiso("ver"),
  controlador.productos
);

router.get(
  "/productos/nuevo",
  permiso("administrar"),
  controlador.formularioCatalogo('producto')
);

router.get(
  "/equipos",
  permiso("ver"),
  controlador.equipos
);

router.get(
  "/equipos/:id",
  permiso("ver"),
  controlador.equipo
);

router.get(
  "/ingresos",
  permiso("ver"),
  controlador.listado("ingreso")
);

router.get(
  "/ingresos/nuevo",
  permiso("ingresar"),
  controlador.nuevoMovimiento("ingreso")
);

router.get(
  "/asignaciones",
  permiso("ver"),
  controlador.listado("asignacion")
);

router.get(
  "/asignaciones/nuevo",
  permiso("asignar"),
  controlador.nuevoMovimiento("asignacion")
);

router.get(
  "/asignaciones/:id/devolucion",
  permiso("devolver"),
  controlador.formularioDevolucion
);

router.get(
  "/devoluciones",
  permiso("ver"),
  controlador.listado("devolucion")
);

router.get(
  "/devoluciones/nueva",
  permiso("devolver"),
  controlador.seleccionarDevolucion
);

router.get(
  "/traspasos",
  permiso("ver"),
  controlador.listado("traspaso")
);

router.get(
  "/traspasos/nuevo",
  permiso("traspasar"),
  controlador.nuevoMovimiento("traspaso")
);

router.post(
  "/catalogos",
  permiso("administrar"),
  csrf,
  controlador.catalogo
);

router.post(
  "/movimientos",
  permiso("ver"),
  upload,
  csrf,
  (req, res, next) => {
    const accion = {
      ingreso: "ingresar",
      asignacion: "asignar",
      devolucion: "devolver",
      traspaso: "traspasar",
    }[req.body.tipo];

    if (!accion) {
      return res.status(400).send(
        "Operación inválida."
      );
    }

    permiso(accion)(req, res, next);
  },
  controlador.registrar
);

router.post(
  "/movimientos/:id/documentos",
  permiso("ingresar"),
  upload,
  csrf,
  controlador.documento
);

router.post(
  "/movimientos/:id/adjuntos",
  permiso("ver"),
  upload,
  csrf,
  controlador.adjuntar
);

router.get(
  "/movimientos/:id",
  permiso("ver"),
  controlador.detalle
);

router.get(
  "/movimientos/:id/pdf",
  permiso("ver"),
  (req, res, next) => {
    req.params.formato = "pdf";
    next();
  },
  controlador.detalle
);

router.get(
  "/archivos/:id",
  permiso("ver"),
  controlador.archivo
);

router.use(controlador.errorInventario);

export default router;