import PedidoMaterial from "../models/pedidoMaterial.mjs";

export async function obtenerSiguienteNumeroPedidoMaterial() {
  const ultimo = await PedidoMaterial.findOne().sort({ numeroPedido: -1 });
  return ultimo ? ultimo.numeroPedido + 1 : 1;
}