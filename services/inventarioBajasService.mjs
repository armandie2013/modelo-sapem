import mongoose from 'mongoose';
import { Archivo, Baja, Contador, Equipo, Lugar, Movimiento } from '../models/inventario.mjs';
import { ejecutarOperacion } from './inventarioPersistencia.mjs';
import { exigir, fecha, guardarArchivos, moverSaldo, validarArchivos } from './inventarioService.mjs';

const unidad = 1000;
export const estadosBaja = { pendiente: 'Pendiente', confirmada: 'Confirmada', recuperada: 'Recuperada' };
export const motivosBaja = { perdida: 'Pérdida', sustraccion: 'Sustracción' };
export const estadosInformables = ['asignado', 'produccion'];

export function validarId(id) {
  exigir(typeof id === 'string' && mongoose.isValidObjectId(id), 'Registro inválido.');
  return id;
}

export async function informarBaja(body, archivos, usuario) {
  const id = validarId(body.equipo);
  const fechaIncidente = fecha(body.fecha);
  exigir(Object.hasOwn(motivosBaja, body.motivo), 'Seleccioná el motivo.');
  validarArchivos(archivos);

  return ejecutarOperacion(async () => {
    const equipo = await Equipo.findById(id);
    exigir(equipo?.asignacion && estadosInformables.includes(equipo.estado), 'El equipo ya no está asignado ni en producción.');
    const original = await Movimiento.findById(equipo.asignacion);
    const tipo = equipo.estado === 'produccion' ? 'produccion' : 'asignacion';
    exigir(original?.tipo === tipo && original.estado !== 'anulado' && original.destino.equals(equipo.lugar), 'El movimiento original no coincide con el equipo.');
    const item = original.items.find(fila =>
      fila.producto.equals(equipo.producto) && fila.series.some(identidad => identidad.serie === equipo.serie)
    );
    exigir(item && item.cantidad - (item.devuelto || 0) - (item.retirado || 0) >= unidad, 'El equipo no está pendiente en el movimiento original.');

    const contador = await Contador.findByIdAndUpdate('bajas', { $inc: { valor: 1 } }, { upsert: true, new: true });
    const baja = await Baja.create({
      numero: contador.valor, equipo: equipo._id, original: original._id,
      comprobanteOriginal: original.numero, serie: equipo.serie, producto: item.nombre,
      codigo: item.codigo, marca: item.marca, modelo: item.modelo,
      ubicacion: original.destinoNombre, responsable: original.recibe,
      motivo: body.motivo, fecha: fechaIncidente,
      observaciones: String(body.observaciones || '').trim().slice(0, 2000), informadoPor: usuario,
    });

    await moverSaldo(equipo.producto, equipo.lugar, equipo.estado, -unidad);
    await moverSaldo(equipo.producto, equipo.lugar, 'pendiente_baja', unidad);
    equipo.estado = 'pendiente_baja';
    equipo.baja = baja._id;
    item.retirado = (item.retirado || 0) + unidad;
    await equipo.save();
    await original.save();
    await guardarArchivos(undefined, archivos, undefined, baja._id);
    return baja;
  });
}

export async function resolverBaja(id, accion, body, archivos, usuario, permisos) {
  validarId(id);
  validarArchivos(archivos);
  return ejecutarOperacion(async () => {
    const baja = await Baja.findById(id);
    exigir(baja && baja.estado !== 'recuperada', 'El incidente ya fue resuelto o no existe.');
    const pendiente = baja.estado === 'pendiente';
    const equipo = await Equipo.findById(baja.equipo);
    exigir(equipo?.baja?.equals(baja._id) && equipo.estado === (pendiente ? 'pendiente_baja' : 'baja'), 'El estado actual del equipo no coincide con el incidente.');
    const registro = { fecha: new Date(), usuario };

    if (accion === 'confirmar') {
      exigir(permisos.autorizarBajas && pendiente, 'La baja ya fue confirmada o falta permiso.');
      exigir(archivos.length || await Archivo.exists({ baja: baja._id }), 'Adjuntá la denuncia o el respaldo para confirmar la baja.');
      await moverSaldo(equipo.producto, equipo.lugar, 'pendiente_baja', -unidad);
      equipo.estado = 'baja';
      baja.estado = 'confirmada';
      baja.confirmacion = registro;
    } else {
      exigir(accion === 'recuperar' && (permisos.autorizarBajas || (pendiente && permisos.informarBajas)), 'No tenés permiso para recuperar este equipo.');
      const deposito = await Lugar.findOne({ _id: validarId(body.deposito), tipo: 'deposito', activo: { $ne: false } });
      exigir(deposito, 'Seleccioná un depósito activo.');
      if (pendiente) await moverSaldo(equipo.producto, equipo.lugar, 'pendiente_baja', -unidad);
      await moverSaldo(equipo.producto, deposito._id, 'revision', unidad);
      equipo.estado = 'revision';
      equipo.lugar = deposito._id;
      equipo.asignacion = undefined;
      equipo.baja = undefined;
      baja.estado = 'recuperada';
      baja.recuperacion = {
        ...registro, deposito: deposito.nombre,
        observaciones: String(body.observaciones || '').trim().slice(0, 2000),
      };
    }
    await equipo.save();
    await baja.save();
    await guardarArchivos(undefined, archivos, undefined, baja._id);
  });
}

export async function adjuntarABaja(id, archivos) {
  validarId(id);
  exigir(archivos.length, 'Seleccioná al menos un archivo.');
  validarArchivos(archivos);
  return ejecutarOperacion(async () => {
    exigir(await Baja.exists({ _id: id }), 'Incidente inexistente.');
    await guardarArchivos(undefined, archivos, undefined, id);
  });
}
