import mongoose from 'mongoose';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';

// Exclusión y diario persistente para el inventario en MongoDB standalone.
// Todas las escrituras de este módulo deben usar ejecutarOperacion().
const contexto = new AsyncLocalStorage();
const host = hostname();
const opciones = { writeConcern: { w: 1, j: true } };
const error = mensaje => Object.assign(new Error(mensaje), { status: 503 });
const colecciones = () => ({
  bloqueo: mongoose.connection.db.collection('inv_control_bloqueo'),
  operaciones: mongoose.connection.db.collection('inv_control_operaciones'),
  diario: mongoose.connection.db.collection('inv_control_diario')
});
const pausa = ms => new Promise(resolve => setTimeout(resolve, ms));
let inicializando;
export function inicializarPersistencia() {
  inicializando ||= (async () => {
    const { diario, operaciones } = colecciones();
    await diario.createIndex({ operacion: 1, coleccion: 1, clave: 1 }, { unique: true });
    await operaciones.createIndex({ estado: 1 });
  })().catch(e => { inicializando = null; throw e; });
  return inicializando;
}
function procesoVivo(pid) {
  if (!Number.isInteger(pid) || pid < 1) return true;
  try { process.kill(pid, 0); return true; }
  catch (e) { return e.code !== 'ESRCH'; }
}
async function restaurar(operacion) {
  const { diario, operaciones } = colecciones();
  // Se borran primero todos los documentos afectados para liberar claves únicas.
  for await (const entrada of diario.find({ operacion })) {
    await mongoose.connection.db.collection(entrada.coleccion).deleteOne({ _id: entrada.documentoId }, opciones);
  }
  for await (const entrada of diario.find({ operacion, existia: true })) {
    await mongoose.connection.db.collection(entrada.coleccion).insertOne(entrada.original, opciones);
  }
  await operaciones.updateOne({ _id: operacion }, { $set: { estado: 'revertida', finalizada: new Date() } }, opciones);
  try { await diario.deleteMany({ operacion }); } catch (e) { console.error('Limpieza de recuperación:', e.message); }
}
async function recuperar() {
  const { operaciones } = colecciones();
  for await (const operacion of operaciones.find({ estado: 'pendiente' })) {
    await restaurar(operacion._id);
  }
}
async function tomarBloqueo() {
  await inicializarPersistencia();
  const { bloqueo } = colecciones();
  const token = randomUUID(), limite = Date.now() + 30000;
  while (true) {
    try {
      await bloqueo.insertOne({ _id: 'inventario', token, host, pid: process.pid, fecha: new Date() }, opciones);
      break;
    } catch (e) {
      if (e.code !== 11000) throw e;
      const previo = await bloqueo.findOne({ _id: 'inventario' });
      if (previo && previo.host === host && !procesoVivo(previo.pid)) {
        const r = await bloqueo.updateOne({ _id: 'inventario', token: previo.token },
          { $set: { token, host, pid: process.pid, fecha: new Date() } }, opciones);
        if (r.modifiedCount === 1) break;
      }
      if (Date.now() >= limite) throw error('Inventario ocupado o pendiente de recuperación. Revisá que no haya otra instancia de la aplicación ejecutándose.');
      await pausa(100);
    }
  }
  try { await recuperar(); }
  catch (e) {
    // No liberar: hasta recuperar, ningún lector debe ver datos parciales.
    throw error('No se pudo recuperar una operación de inventario. Reiniciá la aplicación cuando MongoDB esté disponible. Detalle: ' + e.message);
  }
  return { token, operacion: null, terminado: false, retenido: false };
}
async function liberar(ctx) {
  if (ctx.liberado || ctx.operacion || ctx.retenido) return;
  ctx.liberado = true;
  await colecciones().bloqueo.deleteOne({ _id: 'inventario', token: ctx.token }, opciones);
}
export async function accesoInventario(req, res, next) {
  let ctx;
  try {
    ctx = await tomarBloqueo();
    const fin = () => {
      ctx.terminado = true;
      liberar(ctx).catch(e => console.error('Bloqueo inventario:', e.message));
    };
    res.once('finish', fin);
    res.once('close', fin);
    ctx.usuario = req.session?.usuario ? { id: String(req.session.usuario._id), nombre: `${req.session.usuario.nombre} ${req.session.usuario.apellido}` } : null;
    ctx.ruta = req.originalUrl.split('?')[0];
    contexto.run(ctx, () => next());
  } catch (e) { next(e); }
}
export async function ejecutarOperacion(fn) {
  const existente = contexto.getStore();
  if (!existente) {
    const ctx = await tomarBloqueo();
    return contexto.run(ctx, async () => {
      try { return await ejecutarOperacion(fn); }
      finally { await liberar(ctx); }
    });
  }
  if (existente.operacion) return fn();
  const { operaciones } = colecciones();
  const id = randomUUID();
  await operaciones.insertOne({ _id: id, estado: 'pendiente', creada: new Date(), host, pid: process.pid, usuario: existente.usuario, ruta: existente.ruta }, opciones);
  existente.operacion = id;
  try {
    const resultado = await fn();
    await operaciones.updateOne({ _id: id, estado: 'pendiente' },
      { $set: { estado: 'confirmada', finalizada: new Date() } }, opciones);
    try { await colecciones().diario.deleteMany({ operacion: id }); }
    catch (limpieza) { console.error('Limpieza de diario:', limpieza.message); }
    return resultado;
  } catch (e) {
    if (/Network|Timeout|ServerSelection/.test(e.name || '')) {
      existente.retenido = true;
      throw error('Se perdió la conexión con MongoDB. Reiniciá la aplicación cuando la base esté disponible para recuperar el inventario.');
    }
    try {
      // Si se perdió la respuesta del commit, comprobar el resultado antes de revertir.
      const estado = await operaciones.findOne({ _id: id });
      if (estado?.estado === 'confirmada') throw error('La operación se confirmó, pero se perdió su respuesta. Consultá el listado antes de repetirla.');
      await restaurar(id);
    } catch (recuperacion) {
      existente.retenido = true;
      throw error('La operación requiere recuperación. Reiniciá la aplicación antes de seguir usando inventario. ' + recuperacion.message);
    }
    throw e;
  } finally {
    existente.operacion = null;
    if (existente.terminado) await liberar(existente);
  }
}
async function registrarAntes(modelo, id) {
  const ctx = contexto.getStore();
  if (!ctx?.operacion) return;
  const { diario } = colecciones();
  const coleccion = modelo.collection.collectionName || modelo.collection.name;
  const filtro = { operacion: ctx.operacion, coleccion, clave: String(id) };
  if (await diario.findOne(filtro, { projection: { _id: 1 } })) return;
  const original = await modelo.collection.findOne({ _id: id });
  await diario.updateOne(filtro, { $setOnInsert: { ...filtro, documentoId: id, existia: !!original, original } },
    { ...opciones, upsert: true });
}
export function proteccionInventario(schema) {
  schema.pre('save', async function () { await registrarAntes(this.constructor, this._id); });
  for (const metodo of ['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete']) {
    schema.pre(metodo, async function () {
      if (!contexto.getStore()?.operacion) return;
      const varios = ['updateMany', 'deleteMany'].includes(metodo);
      const consulta = this.model.find(this.getFilter()).select('_id').lean();
      if (!varios) consulta.limit(1);
      const documentos = await consulta;
      for (const doc of documentos) await registrarAntes(this.model, doc._id);
      if (!documentos.length && this.getOptions().upsert) {
        const update = this.getUpdate();
        const id = this.getFilter()._id || update.$setOnInsert?._id || new mongoose.Types.ObjectId();
        const casteado = this.model.schema.path('_id').cast(id);
        this.setUpdate({ ...update, $setOnInsert: { ...update.$setOnInsert, _id: casteado } });
        await registrarAntes(this.model, casteado);
      }
    });
  }
}
export async function recuperarInventarioAlIniciar() {
  const ctx = await tomarBloqueo();
  await liberar(ctx);
}
