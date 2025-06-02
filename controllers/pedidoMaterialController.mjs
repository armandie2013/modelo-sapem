import {
  crearPedidoMaterialService,
  obtenerPedidosMaterialesService,
  obtenerPedidoMaterialPorIdService,
  eliminarPedidoMaterialService,
  actualizarPedidoMaterialService,
  generarPDFPedidoMaterialService,
} from "../services/pedidoMaterialService.mjs";

import { obtenerSiguienteNumeroPedidoMaterial } from "../utils/obtenerSiguienteNumeroPedidoMaterial.mjs";

// Mostrar formulario
export async function mostrarFormularioCrearPedidoController(req, res) {
  const numeroPedido = await obtenerSiguienteNumeroPedidoMaterial();
  res.render("pedidoMaterialViews/crearPedidoMaterial", {
    title: "Nuevo Pedido de Materiales",
    numeroPedido,
    errores: [],
    datos: {},
  });
}

// Procesar creación
export async function crearPedidoMaterialController(req, res) {
  try {
    const datos = {
      fecha: new Date(),
      numeroPedido: await obtenerSiguienteNumeroPedidoMaterial(),
      areaSolicitante: req.body.areaSolicitante,
      proyecto: req.body.proyecto,
      items: JSON.parse(req.body.items),
      creadoPor: req.session?.usuario
        ? `${req.session.usuario.nombre} ${req.session.usuario.apellido}`
        : "Desconocido",
    };

    await crearPedidoMaterialService(datos);
    res.redirect("/pedidos-materiales/dashboard");
  } catch (error) {
    console.error("Error al crear pedido:", error);
    res.status(500).send("Error al crear el pedido");
  }
}

// Listar pedidos
export async function listarPedidosMaterialesController(req, res) {
  const pedidos = await obtenerPedidosMaterialesService();
  res.render("pedidoMaterialViews/dashboardPedidoMaterial", {
    title: "Listado de Pedidos de Materiales",
    pedidos,
  });
}

// Ver pedido
export async function verPedidoMaterialController(req, res) {
  const pedido = await obtenerPedidoMaterialPorIdService(req.params.id);
  res.render("pedidoMaterialViews/verPedidoMaterial", {
    title: "Detalle del Pedido",
    pedido,
  });
}

// Eliminar
export async function eliminarPedidoMaterialController(req, res) {
  try {
    await eliminarPedidoMaterialService(req.params.id);
    res.redirect("/pedidos-materiales/dashboard");
  } catch (error) {
    console.error("Error al eliminar pedido:", error);
    res.status(500).send("Error al eliminar el pedido");
  }
}

// Editar
export async function mostrarFormularioEditarPedidoController(req, res) {
  try {
    const pedido = await obtenerPedidoMaterialPorIdService(req.params.id);
    if (!pedido) return res.status(404).send("Pedido no encontrado");

    res.render("pedidoMaterialViews/editarPedidoMaterial", {
      title: "Editar Pedido de Materiales",
      pedido,
      errores: [],
    });
  } catch (error) {
    console.error("Error al mostrar formulario de edición:", error);
    res.status(500).send("Error al cargar el pedido");
  }
}

// Procesar edicion
export async function actualizarPedidoMaterialController(req, res) {
  try {
    const items = JSON.parse(req.body.items);

    const datos = {
      areaSolicitante: req.body.areaSolicitante,
      proyecto: req.body.proyecto,
      items,
      editadoPor: req.session?.usuario
        ? `${req.session.usuario.nombre} ${req.session.usuario.apellido}`
        : "Desconocido",
    };

    await actualizarPedidoMaterialService(req.params.id, datos);
    res.redirect("/pedidos-materiales/dashboard");
  } catch (error) {
    console.error("Error al actualizar pedido:", error);
    res.status(500).send("Error al actualizar el pedido");
  }
}

export async function generarPDFPedidoMaterialController(req, res) {
  try {
    const { id } = req.params;

    const buffer = await generarPDFPedidoMaterialService(id);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="pedido_material_${id}.pdf"`,
      "Content-Length": buffer.length,
    });

    res.send(buffer);
  } catch (error) {
    console.error("Error al generar PDF del pedido:", error);
    res.status(500).send("Error al generar PDF");
  }
}
