import { randomBytes } from 'node:crypto';
import { mostrar } from './inventarioController.mjs';
import { liberarRevision, listarRevision } from '../services/inventarioRevisionService.mjs';

const ruta = '/inventario/revision';

export async function listado(req, res) {
  const datos = await listarRevision();
  for (const fila of datos.filas) fila.operacion = randomBytes(12).toString('hex');
  mostrar(req, res, 'revision', 'Material a revisar', 'revision', datos);
}

export async function liberar(req, res) {
  req.invVolver = ruta;
  await liberarRevision(req.body, req.session.usuario);
  req.session.invAviso = { ok: true, texto: 'Material marcado como disponible.' };
  res.redirect(303, ruta);
}
