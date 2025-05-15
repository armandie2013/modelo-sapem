import Proveedor from "../models/proveedor.mjs";

export async function crearProveedorService(datos) {
  return await Proveedor.create(datos);
}

export async function obtenerProveedoresService() {
  return await Proveedor.find().sort({ createdAt: 1 });
}

export async function obtenerUltimoProveedorService() {
  return await Proveedor.findOne().sort({ numeroProveedor: 1 });
}