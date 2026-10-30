import { Producto, Contador } from '../models/inventario.mjs';
import { ejecutarOperacion } from './inventarioPersistencia.mjs';
const texto = v => String(v ?? '').trim();
function exigir(ok, mensaje) { if (!ok) { const e = new Error(mensaje); e.status = 400; throw e; } }
export function normalizarProducto(v) {
  return texto(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    .replace(/\b(MK|MIKROTI)\b/g, 'MIKROTIK').replace(/[^A-Z0-9]/g, '');
}
export function sonSimilares(a, b) {
  const x = normalizarProducto(a.nombre), y = normalizarProducto(b.nombre);
  const mx = normalizarProducto(a.modelo), my = normalizarProducto(b.modelo);
  if ((x && y && (x.includes(y) || y.includes(x))) || (mx && my && mx === my)) return true;
  const tokens = v => texto(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().match(/[A-Z0-9]+/g) || [];
  const ta = tokens(a.nombre), tb = tokens(b.nombre);
  if (ta.length >= 2 && tb.length >= 2 && ta.filter(t => tb.includes(t)).length / Math.max(ta.length, tb.length) >= 0.75) return true;
  const numeros = String(a.modelo || a.nombre || '').match(/\d{3,}/g) || [];
  const otros = String(b.modelo || b.nombre || '').match(/\d{3,}/g) || [];
  return numeros.some(n => otros.includes(n));
}
export async function similaresProducto(body, excluir = '') {
  const productos = await Producto.find().lean();
  return productos.filter(p => String(p._id) !== String(excluir) && sonSimilares(body, p)).slice(0, 12);
}
export async function datosProducto(body, excluir = '') {
  const ficha = excluir ? await Producto.findById(excluir) : null;
  exigir(!excluir || ficha, 'Producto inexistente.');
  if (ficha) body = { ...body, codigo: ficha.codigo };
  const datos = { codigo: texto(body.codigo).toUpperCase(), nombre: texto(body.nombre),
    marca: texto(body.marca), modelo: texto(body.modelo), descripcion: texto(body.descripcion),
    unidad: texto(body.unidad) || 'unidad', serializado: body.serializado === 'si' };
  exigir(datos.codigo && datos.codigo.length <= 60, 'Ingresá un código de hasta 60 caracteres.');
  exigir(datos.nombre && datos.nombre.length <= 180, 'Ingresá un nombre de hasta 180 caracteres.');
  exigir(datos.marca.length <= 100 && datos.modelo.length <= 100 && datos.descripcion.length <= 2000 && datos.unidad.length <= 30, 'Los datos del producto superan el largo permitido.');
  exigir(['si', 'no'].includes(body.serializado), 'Indicá el tipo de control.');
  const existente = await Producto.findOne({ codigo: datos.codigo });
  exigir(!existente || String(existente._id) === String(excluir), 'Ya existe un producto con ese código.');
  const similares = await similaresProducto(datos, excluir);
  exigir(!similares.length || body.confirmarSimilar === 'si',
    'Hay productos similares: ' + similares.map(p => `${p.codigo} · ${p.nombre} (${p.marca || ''} ${p.modelo || ''})`).join('; ') + '. Revisá las fichas existentes o marcá que se trata de un producto distinto.');
  return datos;
}
export async function crearProductoCatalogo(body) {
  return ejecutarOperacion(async () => {
    const codigos = await Producto.find().select('codigo').lean();
    const maximo = codigos.reduce((max, producto) => {
      const match = /^PR(\d{4})$/.exec(producto.codigo || '');
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    await Contador.updateOne(
      { _id: 'productos' },
      { $setOnInsert: { valor: maximo } },
      { upsert: true }
    );
    const actual = await Contador.findById('productos');
    if (actual.valor < maximo) {
      await Contador.updateOne({ _id: 'productos' }, { $set: { valor: maximo } });
    }
    const contador = await Contador.findByIdAndUpdate(
      'productos',
      { $inc: { valor: 1 } },
      { new: true }
    );
    exigir(contador.valor <= 9999, 'Se agotaron los códigos PR0001 a PR9999. Debe ampliarse el formato.');
    const codigo = `PR${String(contador.valor).padStart(4, '0')}`;
    return Producto.create(await datosProducto({ ...body, codigo }));
  });
}
