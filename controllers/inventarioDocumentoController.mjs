import { mostrar } from './inventarioController.mjs';
import { registrarDocumento, crearProductoDocumentado, puedeCompletarIngreso } from '../services/inventarioDocumentoService.mjs';
import { obtenerBorrador } from '../services/inventarioCrudService.mjs';
import { exigir } from '../services/inventarioService.mjs';
export function formularioDocumento(req, res) {
  mostrar(req, res, 'documentoIngreso', 'Nuevo ingreso · documento de respaldo', 'ingresos');
}
export async function guardarDocumento(req, res) {
  req.invVolver = '/inventario/ingresos/nuevo';
  const b = await registrarDocumento(req.body, req.session.usuario, req.files || []);
  req.session.invAviso = { ok: true, texto: 'Documento registrado. Ahora cargá el material recibido.' };
  res.redirect(303, `/inventario/ingresos/nuevo?borrador=${b._id}`);
}
export async function nuevoProducto(req, res) {
  req.invVolver = `/inventario/ingresos/nuevo?borrador=${req.params.id}`;
  const b = await obtenerBorrador(req.params.id);
  exigir(puedeCompletarIngreso(b, req.session.usuario, req.invPermisos), 'No tenés permiso para completar este ingreso.');
  await crearProductoDocumentado(b._id, req.body);
  req.session.invAviso = { ok: true, texto: 'Ficha creada y vinculada al documento. Completá cantidad y series; todavía no ingresó al stock.' };
  res.redirect(303, req.invVolver);
}
