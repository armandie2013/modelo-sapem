import { Borrador, Archivo, Movimiento } from '../models/inventario.mjs';
import { mostrar } from './inventarioController.mjs';
import { accionesTipo, buscarRegistro, editarRegistro, cambiarActivo, eliminarRegistro,
  obtenerBorrador, eliminarBorrador, anularMovimiento } from '../services/inventarioCrudService.mjs';
import { puedeCompletarIngreso } from '../services/inventarioDocumentoService.mjs';
import { exigir } from '../services/inventarioService.mjs';
const secciones = { producto: 'productos', deposito: 'depositos', destino: 'destinatarios', equipo: 'equipos' };
export async function formularioEditar(req, res) {
  const tipoRegistro = req.params.tipo;
  const registro = await buscarRegistro(tipoRegistro, req.params.id);
  mostrar(req, res, 'editarRegistro', 'Editar registro', secciones[tipoRegistro], { tipoRegistro, registro });
}
export async function editar(req, res) {
  req.invVolver = `/inventario/registros/${req.params.tipo}/${req.params.id}/editar`;
  await editarRegistro(req.params.tipo, req.params.id, req.body);
  req.session.invAviso = { ok: true, texto: 'Registro actualizado.' };
  res.redirect(303, '/inventario/' + secciones[req.params.tipo]);
}
export async function activo(req, res) {
  req.invVolver = '/inventario/' + (secciones[req.params.tipo] || '');
  exigir(['si', 'no'].includes(req.body.activo), 'Estado inválido.');
  await cambiarActivo(req.params.tipo, req.params.id, req.body.activo === 'si');
  req.session.invAviso = { ok: true, texto: req.body.activo === 'si' ? 'Registro reactivado.' : 'Registro desactivado.' };
  res.redirect(303, req.invVolver);
}
export async function eliminar(req, res) {
  req.invVolver = '/inventario/' + (secciones[req.params.tipo] || '');
  await eliminarRegistro(req.params.tipo, req.params.id);
  req.session.invAviso = { ok: true, texto: 'Registro eliminado.' };
  res.redirect(303, req.invVolver);
}
export async function borradores(req, res) {
  const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);
  const [registros, cantidadRegistros] = await Promise.all([
    Borrador.find().sort({ updatedAt: -1 }).skip((pagina-1)*25).limit(25).lean(), Borrador.countDocuments()
  ]);
  mostrar(req, res, 'borradores', 'Borradores', 'borradores', { registros, pagina, cantidadRegistros, accionesTipo, usuarioActual: req.session.usuario });
}
export async function abrirBorrador(req, res) {
  const b = await obtenerBorrador(req.params.id);
  exigir(req.invPermisos[accionesTipo[b.tipo]] && (req.invPermisos.editar || puedeCompletarIngreso(b, req.session.usuario, req.invPermisos)), 'No tenés permiso para esta operación.');
  const ruta = b.tipo === 'devolucion' ? `/asignaciones/${b.datos.original}/devolucion`
    : '/' + ({ ingreso: 'ingresos', asignacion: 'asignaciones', traspaso: 'traspasos' }[b.tipo]) + '/nuevo';
  res.redirect(303, `/inventario${ruta}?borrador=${b._id}`);
}
export async function borrarBorrador(req, res) {
  req.invVolver = '/inventario/borradores';
  const b = await obtenerBorrador(req.params.id);
  exigir(req.invPermisos[accionesTipo[b.tipo]], 'No tenés permiso para esta operación.');
  await eliminarBorrador(b._id, req.body.version);
  req.session.invAviso = { ok: true, texto: 'Borrador eliminado; no afectó existencias.' };
  res.redirect(303, req.invVolver);
}
export async function borrarArchivoBorrador(req, res) {
  const b = await obtenerBorrador(req.params.id);
  exigir(req.invPermisos[accionesTipo[b.tipo]], 'No tenés permiso para esta operación.');
  req.invVolver = `/inventario/borradores/${b._id}/editar`;
  const { ejecutarOperacion } = await import('../services/inventarioPersistencia.mjs');
  await ejecutarOperacion(async () => {
    exigir(String(req.body.version) === String(b.version), 'El borrador cambió; recargá la página.');
    const archivo = await Archivo.findOne({ _id: req.params.archivoId, movimiento: b._id });
    exigir(archivo, 'Adjunto inexistente.');
    await Archivo.deleteOne({ _id: archivo._id }); b.version += 1; await b.save();
  });
  req.session.invAviso = { ok: true, texto: 'Adjunto del borrador eliminado.' };
  res.redirect(303, req.invVolver);
}
export async function anular(req, res) {
  req.invVolver = `/inventario/movimientos/${req.params.id}`;
  await anularMovimiento(req.params.id, req.body.motivo, req.session.usuario);
  req.session.invAviso = { ok: true, texto: 'Movimiento anulado. Se revirtieron sus existencias y se conservó el historial.' };
  res.redirect(303, req.invVolver);
}
