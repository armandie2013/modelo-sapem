// // services/pagosService.mjs
// import Pago from "../models/pago.mjs";

// export async function crearPagoService(data) {
//   const pago = new Pago(data);
//   await pago.save();
//   return pago;
// }

// export async function listarPagosService({ proveedor, desde, hasta } = {}) {
//   const q = {};
//   if (proveedor) q.proveedor = proveedor;
//   if (desde || hasta) {
//     q.fecha = {};
//     if (desde) q.fecha.$gte = new Date(desde);
//     if (hasta) q.fecha.$lte = new Date(hasta);
//   }
//   return Pago.find(q)
//     .populate("proveedor", "numeroProveedor nombreFantasia nombreReal cuit")
//     .sort({ fecha: -1, createdAt: -1 })
//     .lean();
// }

// export async function eliminarPagoService(id) {
//   return Pago.findByIdAndDelete(id);
// }

import Pago from "../models/pago.mjs";

const FECHA_YMD_RE = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

function crearFechaLocalYMD(valor, finDelDia = false) {
  const texto = String(valor || "").trim();

  if (!FECHA_YMD_RE.test(texto)) {
    return null;
  }

  const [anio, mes, dia] = texto
    .split("-")
    .map(Number);

  const fecha = finDelDia
    ? new Date(
        anio,
        mes - 1,
        dia,
        23,
        59,
        59,
        999,
      )
    : new Date(
        anio,
        mes - 1,
        dia,
        0,
        0,
        0,
        0,
      );

  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }

  return fecha;
}

export async function crearPagoService(data) {
  const pago = new Pago(data);

  await pago.save();

  return pago;
}

export async function listarPagosService(
  {
    proveedor,
    desde,
    hasta,
  } = {},
) {
  const q = {};

  if (proveedor) {
    q.proveedor = proveedor;
  }

  const fechaDesde = crearFechaLocalYMD(
    desde,
    false,
  );

  const fechaHasta = crearFechaLocalYMD(
    hasta,
    true,
  );

  if (fechaDesde || fechaHasta) {
    q.fecha = {};

    if (fechaDesde) {
      q.fecha.$gte = fechaDesde;
    }

    if (fechaHasta) {
      q.fecha.$lte = fechaHasta;
    }
  }

  return Pago.find(q)
    .populate(
      "proveedor",
      "numeroProveedor nombreFantasia nombreReal cuit",
    )
    .sort({
      fecha: -1,
      createdAt: -1,
    })
    .lean();
}

export async function eliminarPagoService(id) {
  return Pago.findByIdAndDelete(id);
}