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
      });
    }

    porProducto.get(productoId)[saldo.estado] +=
      saldo.cantidad;

    if (saldo.estado === "asignado") {
      const lugarId = String(saldo.lugar._id);

      if (!porDestino.has(lugarId)) {
        porDestino.set(lugarId, {
          lugar: saldo.lugar,
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
          cantidades.asignado,
      };
    }),

    destinos: [...porDestino.values()].map(
      (destino) => ({
        lugar: destino.lugar,
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
    tipo: seleccion ? "asignacion" : tipo,
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
  } else if (tipo === "asignacion") {
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
  const filtro = {};

  const serie = String(req.query.serie || "")
    .trim()
    .toUpperCase();

  const ubicacion = String(
    req.query.ubicacion || ""
  );

  const estado = String(req.query.estado || "");

  if (serie) {
    filtro.serie = serie;
  }

  if (ubicacion) {
    filtro.lugar = idValido(ubicacion);
  }

  if (
    ["disponible", "revision", "asignado"].includes(
      estado
    )
  ) {
    filtro.estado = estado;
  }

  const [
    equipos,
    cantidadRegistros,
    lugares,
  ] = await Promise.all([
    Equipo.find(filtro)
      .populate("producto lugar")
      .sort({ serie: 1 })
      .skip((pagina - 1) * 25)
      .limit(25)
      .lean(),

    Equipo.countDocuments(filtro),

    Lugar.find()
      .sort({ nombre: 1 })
      .lean(),
  ]);

  return {
    equipos,
    cantidadRegistros,
    lugares,
    pagina,
    serie,
    ubicacion,
    estado,
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
      .sort({ numero: -1 })
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