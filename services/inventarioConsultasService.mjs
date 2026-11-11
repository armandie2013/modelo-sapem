import mongoose from "mongoose";
import Configuracion from "../models/inventarioConfiguracion.mjs";

import {
  Producto,
  Lugar,
  Saldo,
  Equipo,
  Movimiento,
  Baja,
  Revision,
} from "../models/inventario.mjs";

import {
  exigir,
} from "./inventarioService.mjs";

export const tiposMovimiento = {
  ingreso: {
    titulo: "Ingresos",
    singular: "Nuevo ingreso",
    ruta: "ingresos",
    accion: "ingresar",
  },
  asignacion: {
    titulo: "Asignaciones",
    singular: "Nueva asignación",
    ruta: "asignaciones",
    accion: "asignar",
  },
  produccion: { titulo: "Equipos en producción", singular: "Nueva puesta en producción", ruta: "produccion", accion: "producir" },
  devolucion: {
    titulo: "Devoluciones",
    singular: "Registrar devolución",
    ruta: "devoluciones",
    accion: "devolver",
  },
  traspaso: {
    titulo: "Traspasos",
    singular: "Nuevo traspaso",
    ruta: "traspasos",
    accion: "traspasar",
  },
};

export const paginaDe = (req) =>
  Math.max(
    1,
    Math.min(
      100000,
      Number.parseInt(req.query.pagina, 10) || 1
    )
  );

export function idValido(id) {
  exigir(
    mongoose.isValidObjectId(id),
    "Identificador inválido."
  );

  return id;
}

async function consultarExistencias(lugares) {
  const filtro = lugares ? { lugar: { $in: lugares.map(lugar => lugar._id) } } : {};
  const [productos, saldos, equipos] = await Promise.all([
    Producto.find().sort({ nombre: 1 }).lean(),
    Saldo.find({ ...filtro, cantidad: { $gt: 0 } }).lean(),
    Equipo.find({ ...filtro, estado: { $in: ['disponible', 'revision', 'asignado', 'produccion', 'pendiente_baja', 'baja'] } })
      .select('producto lugar estado').lean(),
  ]);
  const serializados = new Set(productos.filter(producto => producto.serializado).map(producto => String(producto._id)));
  // Los registros de equipos también identifican productos serializados del catálogo anterior.
  for (const equipo of equipos) serializados.add(String(equipo.producto));
  const existencias = saldos.filter(saldo => !serializados.has(String(saldo.producto)));
  const porEstado = new Map();
  for (const equipo of equipos) {
    const clave = String(equipo.producto) + ':' + String(equipo.lugar) + ':' + equipo.estado;
    if (!porEstado.has(clave)) porEstado.set(clave, { ...equipo, cantidad: 0 });
    porEstado.get(clave).cantidad += 1000;
  }
  return { productos, saldos: [...existencias, ...porEstado.values()] };
}

export async function consultarGeneral() {
  const [{ productos, saldos }, lugares] = await Promise.all([
    consultarExistencias(),
    Lugar.find().lean(),
  ]);
  const lugarPorId = new Map(lugares.map(lugar => [String(lugar._id), lugar]));

  const porProducto = new Map();
  const porDestino = new Map();

  for (const saldo of saldos) {
    const productoId = String(saldo.producto);

    if (!porProducto.has(productoId)) {
      porProducto.set(productoId, {
        disponible: 0,
        revision: 0,
        asignado: 0,
        produccion: 0,
        pendiente_baja: 0,
        baja: 0,
      });
    }

    porProducto.get(productoId)[saldo.estado] +=
      saldo.cantidad;

    if (["asignado", "produccion"].includes(saldo.estado)) {
      const lugar = lugarPorId.get(String(saldo.lugar));
      if (!lugar) continue;
      const lugarId = String(lugar._id) + ":" + saldo.estado;

      if (!porDestino.has(lugarId)) {
        porDestino.set(lugarId, {
          lugar,
          estado: saldo.estado,
          productos: new Set(),
        });
      }

      porDestino
        .get(lugarId)
        .productos.add(productoId);
    }
  }

  return {
    resumen: productos.map((producto) => {
      const cantidades = porProducto.get(
        String(producto._id)
      ) || {
        disponible: 0,
        revision: 0,
        asignado: 0,
        produccion: 0,
        pendiente_baja: 0,
        baja: 0,
      };

      return {
        ...producto,
        ...cantidades,

        fisico:
          cantidades.disponible +
          cantidades.revision,

        total:
          cantidades.disponible +
          cantidades.revision +
          cantidades.asignado +
          cantidades.produccion + cantidades.pendiente_baja,
      };
    }),

    destinos: [...porDestino.values()].map(
      (destino) => ({
        lugar: destino.lugar,
        estado: destino.estado,
        productos: destino.productos.size,
      })
    ),
  };
}

export async function consultarLugares(tipo) {
  const [lugares, configuracion] = await Promise.all([
    Lugar.find({ tipo })
      .sort({ nombre: 1 })
      .lean(),

    Configuracion.findById("general").lean(),
  ]);

  const { saldos } = await consultarExistencias(lugares);

  return lugares.map((lugar) => ({
    ...lugar,

    principal:
      String(configuracion?.depositoPrincipal || "") ===
      String(lugar._id),

    productos: new Set(
      saldos
        .filter(
          (saldo) =>
            saldo.estado !== "baja" && String(saldo.lugar) ===
            String(lugar._id)
        )
        .map((saldo) => String(saldo.producto))
    ).size,
  }));
}

export async function consultarUbicacion(id) {
  const lugar = await Lugar.findById(
    idValido(id)
  ).lean();

  exigir(lugar, "Ubicación inexistente.");

  const { productos, saldos } = await consultarExistencias([lugar]);
  const porId = new Map(productos.map(producto => [String(producto._id), producto]));
  return { lugar, saldos: saldos.filter(saldo => saldo.estado !== "baja").map(saldo => ({ ...saldo, producto: porId.get(String(saldo.producto)) })).filter(saldo => saldo.producto) };
}

export async function consultarMovimientos(
  req,
  tipo,
  seleccion = false
) {
  const pagina = paginaDe(req);

  const filtro = {
    tipo: seleccion ? { $in: ["asignacion", "produccion"] } : tipo,
  };

  const estado = String(req.query.estado || "");

  const devuelto = {
    $add: [{ $sum: "$items.devuelto" }, { $sum: "$items.retirado" }],
  };

  const total = {
    $sum: "$items.cantidad",
  };

  if (seleccion) {
    filtro.estado = { $ne: "anulado" };
    filtro.$expr = {
      $lt: [devuelto, total],
    };
  } else if (["asignacion", "produccion"].includes(tipo)) {
    if (estado) filtro.estado = estado === "anulado" ? "anulado" : { $ne: "anulado" };
    if (estado === "activa") {
      filtro.$expr = {
        $eq: [devuelto, 0],
      };
    }

    if (estado === "parcial") {
      filtro.$expr = {
        $and: [
          { $gt: [devuelto, 0] },
          { $lt: [devuelto, total] },
        ],
      };
    }

    if (estado === "cerrada") {
      filtro.$expr = {
        $eq: [devuelto, total],
      };
    }
  }

  const [
    movimientos,
    cantidadRegistros,
  ] = await Promise.all([
    Movimiento.find(filtro)
      .sort({ numero: -1 })
      .skip((pagina - 1) * 25)
      .limit(25)
      .lean(),

    Movimiento.countDocuments(filtro),
  ]);

  return {
    movimientos,
    pagina,
    cantidadRegistros,
    estado,
  };
}

export async function consultarEquipos(req) {
  const pagina = paginaDe(req);
  const serie = String(req.query.serie || "").trim().toUpperCase();
  const q = String(req.query.q || "").trim().slice(0, 180);
  const ubicacion = String(req.query.ubicacion || "");
  const estado = String(req.query.estado || "");
  const filtro = {};
  if (serie) filtro.serie = serie; // Compatibilidad con enlaces de serie exacta.
  if (ubicacion) filtro.lugar = new mongoose.Types.ObjectId(idValido(ubicacion));
  if (["disponible", "revision", "asignado", "produccion", "pendiente_baja", "baja"].includes(estado)) filtro.estado = estado;

  const camposBusqueda = [
    "producto.codigo", "producto.nombre", "producto.marca", "producto.modelo",
    "serie", "mac", "patrimonio",
  ];
  const terminos = q.split(/\s+/).filter(Boolean);
  // Escapar metacaracteres: el texto del usuario nunca se ejecuta como regex.
  const literal = texto => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pipeline = [
    { $match: filtro },
    { $lookup: { from: Producto.collection.name, localField: "producto", foreignField: "_id", as: "producto" } },
    { $unwind: { path: "$producto", preserveNullAndEmptyArrays: true } },
  ];
  if (terminos.length) {
    pipeline.push({ $match: { $and: terminos.map(termino => ({
      $or: camposBusqueda.map(campo => ({ [campo]: { $regex: literal(termino), $options: "i" } })),
    })) } });
  }
  pipeline.push(
    // El orden se aplica al resultado completo antes de paginar.
    { $sort: { "producto.codigo": 1, serie: 1, _id: 1 } },
    { $facet: {
      equipos: [
        { $skip: (pagina - 1) * 25 }, { $limit: 25 },
        { $lookup: { from: Lugar.collection.name, localField: "lugar", foreignField: "_id", as: "lugar" } },
        { $unwind: { path: "$lugar", preserveNullAndEmptyArrays: true } },
      ],
      total: [{ $count: "cantidad" }],
    } },
  );
  const [resultado, lugares] = await Promise.all([
    Equipo.aggregate(pipeline).collation({ locale: "es", numericOrdering: true, strength: 2 }),
    Lugar.find().sort({ nombre: 1 }).lean(),
  ]);
  return {
    equipos: resultado[0]?.equipos || [],
    cantidadRegistros: resultado[0]?.total[0]?.cantidad || 0,
    lugares, pagina, q, serie, ubicacion, estado,
  };
}

export async function consultarEquipo(req) {
  const equipo = await Equipo.findById(
    idValido(req.params.id)
  )
    .populate("producto lugar")
    .lean();

  exigir(equipo, "Equipo inexistente.");

  const [movimientos, bajas, revisiones] = await Promise.all([
    Movimiento.find({ "items.series.serie": equipo.serie })
      .select("numero tipo fecha createdAt estado estadoRecepcion origenNombre destinoNombre").lean(),
    Baja.find({ equipo: equipo._id }).lean(),
    Revision.find({ equipo: equipo._id }).lean(),
  ]);
  const ubicaciones = await Lugar.find({ _id: { $in: revisiones.map(revision => revision.lugar) } })
    .select("nombre").lean();
  const nombreUbicacion = new Map(ubicaciones.map(lugar => [String(lugar._id), lugar.nombre]));
  const etiquetas = {
    ingreso: "Ingreso", asignacion: "Asignación", produccion: "Puesta en producción",
    devolucion: "Devolución", traspaso: "Traspaso",
  };
  const eventos = movimientos.map(mov => ({
    fecha: mov.fecha, registrado: mov.createdAt || mov.fecha,
    operacion: etiquetas[mov.tipo] || mov.tipo,
    estado: mov.estado === "anulado" ? "Anulado" : mov.estadoRecepcion === "revision" ? "A revisar" : "",
    origen: mov.origenNombre, destino: mov.destinoNombre,
    referencia: "Movimiento N.º " + mov.numero, url: "/inventario/movimientos/" + mov._id,
  }));
  for (const baja of bajas) {
    const referencia = "Incidente N.º " + baja.numero;
    const url = "/inventario/bajas/" + baja._id;
    eventos.push({
      fecha: baja.fecha, registrado: baja.createdAt || baja.fecha,
      operacion: baja.motivo === "sustraccion" ? "Sustracción informada" : "Pérdida informada",
      estado: "Pendiente de baja", origen: baja.ubicacion, referencia, url,
    });
    if (baja.confirmacion?.fecha) eventos.push({
      fecha: baja.confirmacion.fecha, registrado: baja.confirmacion.fecha,
      operacion: "Baja confirmada", estado: "Dado de baja", origen: baja.ubicacion,
      referencia: "Acta de baja N.º " + baja.numero, url: url + "/acta",
    });
    if (baja.recuperacion?.fecha) eventos.push({
      fecha: baja.recuperacion.fecha, registrado: baja.recuperacion.fecha,
      operacion: "Recuperación", estado: "A revisar",
      destino: baja.recuperacion.deposito, referencia, url,
    });
  }
  for (const revision of revisiones) eventos.push({
    fecha: revision.createdAt, registrado: revision.createdAt,
    operacion: "Revisión completada", estado: "Disponible",
    destino: nombreUbicacion.get(String(revision.lugar)), referencia: revision.operador,
  });
  const diaLocal = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  for (const evento of eventos) evento.dia = diaLocal.format(new Date(evento.fecha));
  eventos.sort((a, b) => a.dia.localeCompare(b.dia) || new Date(a.registrado) - new Date(b.registrado));
  const pagina = Math.min(paginaDe(req), Math.max(1, Math.ceil(eventos.length / 25)));
  const inicio = (pagina - 1) * 25;
  return {
    equipo, pagina, cantidadRegistros: eventos.length,
    eventos: eventos.slice(inicio, inicio + 25).map((evento, indice) => ({ ...evento, numero: inicio + indice + 1 })),
  };
}
