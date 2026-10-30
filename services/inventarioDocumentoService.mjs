import { crearProductoCatalogo } from './inventarioCatalogoService.mjs';
import { randomUUID } from 'node:crypto';
import { Producto, Borrador } from '../models/inventario.mjs';
import { respaldo, exigir } from './inventarioService.mjs';
import { guardarBorrador, obtenerBorrador } from './inventarioCrudService.mjs';
import { ejecutarOperacion } from './inventarioPersistencia.mjs';
export function puedeCompletarIngreso(b, usuario, permisos) {
  return b.tipo === 'ingreso' && permisos.ingresar &&
    (permisos.editar || String(b.creadoPor.id) === String(usuario._id));
}
export async function registrarDocumento(body, usuario, files) {
  respaldo(body); // El documento tiene que ser válido antes de crear el ingreso pendiente.
  return guardarBorrador({ ...body, tipo: 'ingreso', items: '[]', clave: randomUUID() }, usuario, files);
}
export async function crearProductoDocumentado(id, body) {
  return ejecutarOperacion(async () => {
    const ingreso = await obtenerBorrador(id);
    exigir(ingreso.tipo === 'ingreso', 'Seleccioná un ingreso de mercadería pendiente.');
    const documento = respaldo(ingreso.datos);
    exigir(['si', 'no'].includes(body.serializado), 'Indicá el tipo de control.');
    const producto = await crearProductoCatalogo(body);
    let filas; try { filas = JSON.parse(ingreso.datos.items || '[]'); } catch { filas = []; }
    exigir(Array.isArray(filas) && filas.length < 100, 'El ingreso admite hasta 100 renglones.');
    filas.push({ producto: String(producto._id), cantidad: '', series: '' });
    ingreso.datos = { ...ingreso.datos, items: JSON.stringify(filas) };
    ingreso.productos = [...new Set([...(ingreso.productos || []).map(String), String(producto._id)])];
    ingreso.version += 1; await ingreso.save();
    return producto;
  });
}
