// services/pagosService.mjs
import Pago from "../models/pago.mjs";

export async function crearPagoService(data) {
  const pago = new Pago(data);
  await pago.save();
  return pago;
}

export async function listarPagosService({ proveedor, desde, hasta } = {}) {
  const q = {};
  if (proveedor) q.proveedor = proveedor;
  if (desde || hasta) {
    q.fecha = {};
    if (desde) q.fecha.$gte = new Date(desde);
    if (hasta) q.fecha.$lte = new Date(hasta);
  }
  return Pago.find(q)
    .populate("proveedor", "numeroProveedor nombreFantasia nombreReal cuit")
    .sort({ fecha: -1, createdAt: -1 })
    .lean();
}

export async function eliminarPagoService(id) {
  return Pago.findByIdAndDelete(id);
}