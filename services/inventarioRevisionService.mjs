import { Baja, Equipo, Lugar, Movimiento, Producto, Revision, Saldo } from '../models/inventario.mjs';
import { ejecutarOperacion } from './inventarioPersistencia.mjs';
import { cantidad, exigir, moverSaldo } from './inventarioService.mjs';
import { idValido } from './inventarioConsultasService.mjs';

export async function listarRevision() {
  const [equipos, saldos, productos, lugares, revisiones] = await Promise.all([
    Equipo.find({ estado: 'revision' }).sort({ serie: 1 }).lean(),
    Saldo.find({ estado: 'revision', cantidad: { $gt: 0 } }).lean(),
    Producto.find().sort({ nombre: 1 }).lean(),
    Lugar.find({ tipo: 'deposito' }).lean(),
    Revision.find().sort({ createdAt: -1 }).limit(25).lean(),
  ]);
  const porProducto = new Map(productos.map(p => [String(p._id), p]));
  const porLugar = new Map(lugares.map(l => [String(l._id), l]));
  const series = new Set(equipos.map(e => e.serie));
  const conSeries = new Set(equipos.map(e => String(e.producto)));
  const agrupados = saldos.filter(s => !porProducto.get(String(s.producto))?.serializado && !conSeries.has(String(s.producto)));
  const [movimientos, bajas, referencias] = await Promise.all([
    Movimiento.find({ 'items.series.serie': { $in: [...series] }, estado: { $ne: 'anulado' }, estadoRecepcion: 'revision' })
      .sort({ numero: -1 }).lean(),
    Baja.find({ equipo: { $in: equipos.map(e => e._id) }, estado: 'recuperada' }).lean(),
    agrupados.length ? Movimiento.find({
      'items.producto': { $in: agrupados.map(s => s.producto) },
      destino: { $in: agrupados.map(s => s.lugar) },
      estado: { $ne: 'anulado' }, estadoRecepcion: 'revision',
    }).sort({ numero: -1 }).lean() : [],
  ]);
  const origenPorSerie = new Map();
  for (const mov of movimientos) {
    for (const item of mov.items) {
      for (const { serie } of item.series || []) {
        const clave = String(mov.destino) + ':' + serie;
        if (!series.has(serie) || origenPorSerie.has(clave)) continue;
        const etiqueta = mov.tipo === 'traspaso' ? 'Traspaso' : mov.originalTipo === 'produccion' ? 'Retiro de producción' : 'Devolución';
        origenPorSerie.set(clave, {
          texto: etiqueta + ' N.º ' + mov.numero, fecha: mov.createdAt || mov.fecha,
          url: '/inventario/movimientos/' + mov._id,
        });
      }
    }
  }
  const origenPorEquipo = new Map();
  for (const baja of bajas) {
    if (!baja.recuperacion?.fecha) continue;
    const anterior = origenPorEquipo.get(String(baja.equipo));
    if (anterior && new Date(anterior.fecha) >= new Date(baja.recuperacion.fecha)) continue;
    origenPorEquipo.set(String(baja.equipo), {
      texto: 'Recuperación de baja N.º ' + baja.numero, fecha: baja.recuperacion.fecha,
      url: '/inventario/bajas/' + baja._id,
    });
  }
  const filas = equipos.map(equipo => {
    const movimiento = origenPorSerie.get(String(equipo.lugar) + ':' + equipo.serie);
    const baja = origenPorEquipo.get(String(equipo._id));
    const origen = baja && (!movimiento || new Date(baja.fecha) >= new Date(movimiento.fecha)) ? baja : movimiento;
    return { ...equipo, equipo: equipo._id, cantidad: 1000, origen };
  });
  const referenciasPorSaldo = new Map();
  for (const mov of referencias) {
    for (const item of mov.items) {
      if (item.serializado) continue;
      const clave = String(item.producto) + ':' + String(mov.destino);
      if (!referenciasPorSaldo.has(clave)) referenciasPorSaldo.set(clave, []);
      const lista = referenciasPorSaldo.get(clave);
      if (lista.length < 3) lista.push({ numero: mov.numero, url: '/inventario/movimientos/' + mov._id });
    }
  }
  filas.push(...agrupados.map(saldo => ({
    ...saldo, referencias: referenciasPorSaldo.get(String(saldo.producto) + ':' + String(saldo.lugar)) || [],
  })));
  const completar = fila => ({
    ...fila, producto: porProducto.get(String(fila.producto)), lugar: porLugar.get(String(fila.lugar)),
  });
  return { filas: filas.map(completar).filter(f => f.producto && f.lugar), revisiones: revisiones.map(completar) };
}

export async function liberarRevision(body, usuario) {
  const operacion = idValido(body.operacion);
  const productoId = idValido(body.producto);
  const lugarId = idValido(body.lugar);
  const equipoId = body.equipo ? idValido(body.equipo) : null;
  const unidades = equipoId ? 1000 : cantidad(body.cantidad);
  return ejecutarOperacion(async () => {
    const anterior = await Revision.findById(operacion);
    if (anterior) {
      exigir(String(anterior.usuario) === String(usuario._id) &&
        String(anterior.producto) === String(productoId) && String(anterior.lugar) === String(lugarId) &&
        String(anterior.equipo || '') === String(equipoId || '') && anterior.cantidad === unidades,
      'La solicitud de revisión ya fue utilizada.');
      return anterior;
    }
    const [producto, lugar, equipo] = await Promise.all([
      Producto.findById(productoId),
      Lugar.findOne({ _id: lugarId, tipo: 'deposito' }),
      equipoId ? Equipo.findOne({ _id: equipoId, producto: productoId, lugar: lugarId, estado: 'revision' }) : null,
    ]);
    exigir(producto && lugar, 'El producto o depósito no existe.');
    if (equipoId) {
      exigir(equipo, 'El equipo ya no está pendiente de revisión en ese depósito.');
    } else {
      exigir(!producto.serializado && !await Equipo.exists({ producto: productoId }), 'Seleccioná la serie que revisaste.');
    }
    await moverSaldo(productoId, lugarId, 'revision', -unidades);
    await moverSaldo(productoId, lugarId, 'disponible', unidades);
    if (equipo) {
      equipo.estado = 'disponible';
      await equipo.save();
    }
    return Revision.create({
      _id: operacion, producto: productoId, lugar: lugarId, equipo: equipoId || undefined,
      serie: equipo?.serie, cantidad: unidades, usuario: usuario._id,
      operador: [usuario.nombre, usuario.apellido].filter(Boolean).join(' ') || String(usuario._id),
    });
  });
}
