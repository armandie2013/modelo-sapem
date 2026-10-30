import { datosProducto } from './inventarioCatalogoService.mjs';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Producto, Lugar, Saldo, Equipo, Movimiento, Archivo, Borrador, Anulacion } from '../models/inventario.mjs';
import Configuracion from '../models/inventarioConfiguracion.mjs';
import { ejecutarOperacion } from './inventarioPersistencia.mjs';
import { exigir, crearMovimiento, respaldo } from './inventarioService.mjs';
export const accionesTipo = { ingreso: 'ingresar', asignacion: 'asignar', devolucion: 'devolver', traspaso: 'traspasar' };
export function validarId(id) { exigir(mongoose.isValidObjectId(id), 'Identificador inválido.'); return id; }
const texto = v => String(v ?? '').trim();
const usuarioNombre = u => `${u.nombre} ${u.apellido}`;
export async function buscarRegistro(tipo, id) {
  exigir(['producto', 'deposito', 'destino', 'equipo'].includes(tipo), 'Tipo de registro inválido.');
  const modelo = tipo === 'producto' ? Producto : tipo === 'equipo' ? Equipo : Lugar;
  const registro = await modelo.findById(validarId(id));
  exigir(registro && (!['deposito', 'destino'].includes(tipo) || registro.tipo === tipo), 'Registro inexistente.');
  return registro;
}
async function tieneHistoria(tipo, registro) {
  return tipo === 'producto'
    ? !!await Movimiento.exists({ 'items.producto': registro._id })
    : !!await Movimiento.exists({ $or: [{ origen: registro._id }, { destino: registro._id }] });
}
async function sinExistencias(tipo, registro) {
  const campo = tipo === 'producto' ? 'producto' : 'lugar';
  exigir(!await Saldo.exists({ [campo]: registro._id, cantidad: { $gt: 0 } }),
    'El registro todavía tiene material. Primero registrá su devolución, traspaso o la anulación correspondiente.');
  exigir(!await Equipo.exists({ [campo]: registro._id }), 'Todavía hay equipos asociados a este registro.');
}
async function noPrincipal(tipo, registro) {
  if (tipo !== 'deposito') return;
  const config = await Configuracion.findById('general').lean();
  exigir(String(config?.depositoPrincipal || '') !== String(registro._id), 'Elegí otro depósito principal antes de eliminar o desactivar este.');
}
export async function editarRegistro(tipo, id, body) {
  return ejecutarOperacion(async () => {
    const registro = await buscarRegistro(tipo, id);
    exigir(String(body.version) === String(registro.__v || 0), 'El registro cambió desde que abriste el formulario. Recargá la página.');
    if (tipo === 'producto') {
      exigir(['si', 'no'].includes(body.serializado), 'Tipo de control inválido.');
      const serializado = body.serializado === 'si';
      const cambiaControl = serializado !== registro.serializado || texto(body.unidad) !== registro.unidad;
      if (cambiaControl) {
        exigir(!await tieneHistoria(tipo, registro), 'No se puede cambiar unidad ni control de un producto con movimientos.');
        await sinExistencias(tipo, registro);
        exigir(!await Borrador.exists({ productos: registro._id }), 'El producto está en un borrador.');
      }
      Object.assign(registro, await datosProducto(body, registro._id));
    } else if (tipo === 'equipo') {
      // Serie, producto, ubicación y estado cambian únicamente mediante operaciones de inventario.
      registro.mac = texto(body.mac); registro.patrimonio = texto(body.patrimonio);
    } else {
      registro.nombre = texto(body.nombre); registro.direccion = texto(body.direccion);
      registro.responsable = texto(body.responsable); registro.dni = texto(body.dni);
    }
    registro.increment();
    return registro.save();
  });
}
export async function cambiarActivo(tipo, id, activo) {
  exigir(tipo !== 'equipo', 'El estado de un equipo se administra mediante sus movimientos.');
  return ejecutarOperacion(async () => {
    const registro = await buscarRegistro(tipo, id);
    if (!activo) {
      await noPrincipal(tipo, registro); await sinExistencias(tipo, registro);
      const campo = tipo === 'producto' ? 'productos' : 'lugares';
      exigir(!await Borrador.exists({ [campo]: registro._id }), 'El registro está utilizado en un borrador.');
    }
    registro.activo = activo; registro.increment(); return registro.save();
  });
}
export async function eliminarRegistro(tipo, id) {
  exigir(tipo !== 'equipo', 'Un equipo recibido no se borra directamente. Corregí o anulá su ingreso.');
  return ejecutarOperacion(async () => {
    const registro = await buscarRegistro(tipo, id);
    await noPrincipal(tipo, registro);
    exigir(!await tieneHistoria(tipo, registro), 'Tiene historial: conservá el registro y usá Desactivar cuando no tenga material.');
    await sinExistencias(tipo, registro);
    const campo = tipo === 'producto' ? 'productos' : 'lugares';
    exigir(!await Borrador.exists({ [campo]: registro._id }), 'El registro está utilizado en un borrador.');
    await Saldo.deleteMany({ [tipo === 'producto' ? 'producto' : 'lugar']: registro._id, cantidad: 0 });
    await registro.constructor.deleteOne({ _id: registro._id });
  });
}
const camposBorrador = ['tipo', 'fecha', 'origen', 'destino', 'original', 'estadoRecepcion', 'entrega', 'recibe',
  'dniRecibe', 'observaciones', 'documentoTipo', 'documentoNumero', 'documentoFecha', 'emisor', 'documentoRepetido', 'items', 'clave'];
export async function obtenerBorrador(id) {
  const b = await Borrador.findById(validarId(id)); exigir(b, 'Borrador inexistente.'); return b;
}
function validarAdjuntos(files) {
  for (const f of files) {
    const b = f.buffer;
    const pdf = b.subarray(0, 5).toString() === '%PDF-';
    const png = b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
    const jpg = b.length > 3 && b[0] === 255 && b[1] === 216 && b[2] === 255;
    exigir(pdf || png || jpg, 'Adjuntá únicamente PDF, PNG o JPG válidos.');
    f.tipoSeguro = pdf ? 'application/pdf' : png ? 'image/png' : 'image/jpeg';
  }
}
export async function guardarBorrador(body, usuario, files = []) {
  return ejecutarOperacion(async () => {
    exigir(Object.hasOwn(accionesTipo, body.tipo), 'Operación inválida.');
    validarAdjuntos(files);
    const b = body.borradorId ? await obtenerBorrador(body.borradorId) : new Borrador({
      tipo: body.tipo, datos: {}, creadoPor: { id: usuario._id, nombre: usuarioNombre(usuario) }
    });
    exigir(b.tipo === body.tipo, 'No se puede cambiar el tipo de un borrador.');
    if (body.borradorId) exigir(String(body.borradorVersion) === String(b.version), 'El borrador fue modificado. Recargá su formulario.');
    const datos = Object.fromEntries(camposBorrador.map(campo => [campo, texto(body[campo])]));
    let filas = []; try { filas = JSON.parse(datos.items || '[]'); } catch { exigir(false, 'Detalle inválido.'); }
    exigir(Array.isArray(filas) && filas.length <= 100, 'El borrador admite hasta 100 renglones.');
    b.productos = [...new Set(filas.map(f => texto(f.producto)).filter(mongoose.isValidObjectId))];
    b.lugares = [...new Set([datos.origen, datos.destino].filter(mongoose.isValidObjectId))];
    datos.clave = body.borradorId ? b.datos.clave : randomUUID();
    if (b.tipo === 'ingreso') respaldo(datos);
    for (const fila of filas) {
      const valor = texto(fila.cantidad);
      exigir(!valor || (/^\d+$/.test(valor) && Number.isSafeInteger(Number(valor)) && Number(valor) <= 1000000000 && (Number(valor) > 0 || b.tipo === 'devolucion')), 'Las cantidades del borrador deben ser enteras.');
    }
    b.datos = datos; b.version += 1; await b.save();
    for (const f of files) await new Archivo({ movimiento: b._id,
      nombre: f.originalname.replace(/[\\/\r\n]/g, '_').slice(0, 150), mime: f.tipoSeguro, datos: f.buffer }).save();
    return b;
  });
}
export async function confirmarBorrador(body, usuario, files) {
  return ejecutarOperacion(async () => {
    const b = await obtenerBorrador(body.borradorId);
    exigir(b.tipo === body.tipo && String(body.borradorVersion) === String(b.version), 'El borrador cambió. Recargá el formulario.');
    const mov = await crearMovimiento({ ...body, clave: b.datos.clave }, usuario, files, { id: b._id });
    await Borrador.deleteOne({ _id: b._id }); return mov;
  });
}
export async function eliminarBorrador(id, version) {
  return ejecutarOperacion(async () => {
    const b = await obtenerBorrador(id);
    exigir(String(version) === String(b.version), 'El borrador cambió. Recargá el listado.');
    await Archivo.deleteMany({ movimiento: b._id }); await Borrador.deleteOne({ _id: b._id });
  });
}
async function modificarSaldo(producto, lugar, estado, cantidad) {
  if (cantidad < 0) {
    const r = await Saldo.updateOne({ producto, lugar, estado, cantidad: { $gte: -cantidad } }, { $inc: { cantidad } });
    exigir(r.modifiedCount === 1, 'No hay existencias suficientes para revertir el movimiento.');
  } else await Saldo.updateOne({ producto, lugar, estado }, { $inc: { cantidad } }, { upsert: true });
}
export async function anularMovimiento(id, motivo, usuario) {
  return ejecutarOperacion(async () => {
    exigir(texto(motivo).length >= 5 && texto(motivo).length <= 2000, 'Indicá el motivo de anulación (entre 5 y 2000 caracteres).');
    const mov = await Movimiento.findById(validarId(id));
    exigir(mov && mov.estado !== 'anulado', 'Movimiento inexistente o ya anulado.');
    if (mov.tipo === 'asignacion') exigir(mov.items.every(i => i.devuelto === 0), 'Primero anulá las devoluciones vinculadas.');
    for (const item of mov.items) {
      const filtro = { _id: { $ne: mov._id }, numero: { $gt: mov.numero }, estado: { $ne: 'anulado' } };
      if (item.serializado) filtro['items.series.serie'] = { $in: item.series.map(s => s.serie) };
      else {
        filtro['items.producto'] = item.producto;
        filtro.$or = [{ origen: { $in: [mov.origen, mov.destino].filter(Boolean) } },
          { destino: { $in: [mov.origen, mov.destino].filter(Boolean) } }];
      }
      exigir(!await Movimiento.exists(filtro), `Hay movimientos posteriores relacionados con ${item.nombre}. Revertí primero esas operaciones.`);
    }
    const original = mov.tipo === 'devolucion' ? await Movimiento.findById(mov.original) : null;
    if (mov.tipo === 'devolucion') exigir(original && original.estado !== 'anulado', 'La asignación original no está vigente.');
    for (const item of mov.items) {
      const salidaEstado = mov.tipo === 'asignacion' ? 'asignado' : mov.tipo === 'devolucion' ? mov.estadoRecepcion : 'disponible';
      await modificarSaldo(item.producto, mov.destino, salidaEstado, -item.cantidad);
      if (mov.origen) await modificarSaldo(item.producto, mov.origen, mov.tipo === 'devolucion' ? 'asignado' : 'disponible', item.cantidad);
      for (const serie of item.series) {
        const equipo = await Equipo.findOne({ producto: item.producto, serie: serie.serie, lugar: mov.destino, estado: salidaEstado });
        exigir(equipo, `La serie ${serie.serie} ya no está en la ubicación o estado esperados.`);
        if (mov.tipo === 'ingreso') await Equipo.deleteOne({ _id: equipo._id });
        else {
          equipo.lugar = mov.origen; equipo.estado = mov.tipo === 'devolucion' ? 'asignado' : 'disponible';
          equipo.asignacion = mov.tipo === 'devolucion' ? original._id : undefined;
          await equipo.save();
        }
      }
      if (original) {
        const fila = original.items.find(i => i.producto.equals(item.producto));
        exigir(fila && fila.devuelto >= item.cantidad, 'El historial de devoluciones no coincide.');
        fila.devuelto -= item.cantidad;
      }
    }
    if (original) await original.save();
    const registro = await Anulacion.create({ movimiento: mov._id, fecha: new Date(), motivo: texto(motivo), usuario: usuarioNombre(usuario) });
    mov.estado = 'anulado'; mov.anulacion = { registro: registro._id, fecha: registro.fecha, motivo: registro.motivo, usuario: registro.usuario };
    await mov.save(); return mov;
  });
}
