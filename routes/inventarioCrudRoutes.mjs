import { Router } from 'express';
import * as c from '../controllers/inventarioCrudController.mjs';
export default function rutasCrud(permiso, csrf) {
  const router = Router();
  router.get('/registros/:tipo/:id/editar', permiso('editar'), c.formularioEditar);
  router.post('/registros/:tipo/:id/editar', permiso('editar'), csrf, c.editar);
  router.post('/registros/:tipo/:id/activo', permiso('editar'), csrf, c.activo);
  router.post('/registros/:tipo/:id/eliminar', permiso('eliminar'), csrf, c.eliminar);
  router.get('/borradores', permiso('ver'), c.borradores);
  router.get('/borradores/:id/editar', permiso('ver'), c.abrirBorrador);
  router.post('/borradores/:id/eliminar', permiso('eliminar'), csrf, c.borrarBorrador);
  router.post('/borradores/:id/archivos/:archivoId/eliminar', permiso('eliminar'), csrf, c.borrarArchivoBorrador);
  router.post('/movimientos/:id/anular', permiso('anular'), csrf, c.anular);
  return router;
}
