import mongoose from "mongoose";
import Configuracion from "../models/inventarioConfiguracion.mjs";

import {
  Producto,
  Lugar,
  Saldo,
  Equipo,
  Movimiento,
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

export async function consultarGeneral() {
  const [productos, saldos] = await Promise.all([
    Producto.find()
      .sort({ nombre: 1 })
      .lean(),

    Saldo.find({
      cantidad: { $gt: 0 },
    })
      .populate("lugar")
      .lean(),
  ]);

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
      });
    }

    porProducto.get(productoId)[saldo.estado] +=
      saldo.cantidad;

    if (["asignado", "produccion"].includes(saldo.estado)) {
      const lugarId = String(saldo.lugar._id) + ":" + saldo.estado;

      if (!porDestino.has(lugarId)) {
        porDestino.set(lugarId, {
          lugar: saldo.lugar,
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
          cantidades.produccion,
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

  const saldos = await Saldo.find({
    lugar: {
      $in: lugares.map((lugar) => lugar._id),
    },
    cantidad: { $gt: 0 },
  }).lean();

  return lugares.map((lugar) => ({
    ...lugar,

    principal:
      String(configuracion?.depositoPrincipal || "") ===
      String(lugar._id),

    productos: new Set(
      saldos
        .filter(
          (saldo) =>
            String(saldo.lugar) ===
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

  const saldos = await Saldo.find({
    lugar: lugar._id,
    cantidad: { $gt: 0 },
  })
    .populate("producto")
    .lean();

  return { lugar, saldos };
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
    $sum: "$items.devuelto",
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
  if (["disponible", "revision", "asignado", "produccion"].includes(estado)) filtro.estado = estado;

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

  const pagina = paginaDe(req);

  const filtro = {
    "items.series.serie": equipo.serie,
  };

  const [
    movimientos,
    cantidadRegistros,
  ] = await Promise.all([
    Movimiento.find(filtro)
      .sort({ numero: 1 })
      .skip((pagina - 1) * 25)
      .limit(25)
      .lean(),

    Movimiento.countDocuments(filtro),
  ]);

  return {
    equipo,
    movimientos,
    cantidadRegistros,
    pagina,
  };
}