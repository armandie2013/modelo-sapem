import PedidoMaterial from "../models/pedidoMaterial.mjs";
import puppeteer from "puppeteer";
import ejs from "ejs";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { obtenerSiguienteNumeroDePedido } from "../utils/obtenerSiguienteNumeroDePedido.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear nuevo pedido con número automático
export async function crearPedidoMaterialService(datos) {
  const numeroPedido = await obtenerSiguienteNumeroDePedido();
  return await PedidoMaterial.create({ ...datos, numeroPedido });
}

// Obtener todos los pedidos
export async function obtenerPedidosMaterialesService() {
  return await PedidoMaterial.find().sort({ numeroPedido: -1 });
}

// Obtener uno por ID
export async function obtenerPedidoMaterialPorIdService(id) {
  return await PedidoMaterial.findById(id);
}

// Eliminar por ID
export async function eliminarPedidoMaterialService(id) {
  return await PedidoMaterial.findByIdAndDelete(id);
}

// Editar pedido
export async function actualizarPedidoMaterialService(id, datos) {
  return await PedidoMaterial.findByIdAndUpdate(id, datos, { new: true });
}

// Generar PDF del pedido
export async function generarPDFPedidoMaterialService(idPedido) {
  const pedido = await PedidoMaterial.findById(idPedido).lean();
  if (!pedido) throw new Error("Pedido no encontrado");

  const rutaVista = path.join(__dirname, "../views/pedidoMaterialViews/verPedidoMaterialPDF.ejs");
  const html = await ejs.renderFile(rutaVista, { pedido });

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const buffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", bottom: "20mm", left: "10mm", right: "10mm" },
  });

  await browser.close();
  return buffer;
}