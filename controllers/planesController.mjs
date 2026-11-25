import { validationResult } from "express-validator";
import {
  listarPlanesService,
  crearPlanService,
  obtenerPlanPorIdService,
  actualizarPlanService,
  eliminarPlanService,
} from "../services/planesService.mjs";

export async function dashboardPlanesController(req, res) {
  const planes = await listarPlanesService();
  const busqueda = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 200) : "";
  const estado = ["activos", "inactivos", "todos"].includes(req.query.estado) ? req.query.estado : "todos";
  const normalizar = valor => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
  const texto = normalizar(busqueda);
  const filtrados = planes.filter(plan =>
    (estado === "todos" || (estado === "activos" ? plan.activo !== false : plan.activo === false)) &&
    normalizar([plan.nombre, plan.detalle].join(" ")).includes(texto)
  );

  // Orden alfabético (locale ES, sin distinguir acentos/mayúsculas)
  const planesOrdenados = [...filtrados].sort((a, b) =>
    String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", {
      sensitivity: "base",
      numeric: true,
    })
  );

  res.render("planesViews/dashboardPlanes", {
    title: "Planes",
    planes: planesOrdenados,
    busqueda, estado, totalPlanes: planes.length,
    path: req.path,
  });
}
export function mostrarFormularioCrearPlanController(req, res) {
  res.render("planesViews/crearPlan", {
    title: "Crear Plan",
    datos: {},
    errores: [],
    path: req.path,
  });
}
export async function crearPlanController(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res
      .status(400)
      .render("planesViews/crearPlan", {
        title: "Crear Plan",
        datos: req.body,
        errores: errores.array(),
        path: req.path,
      });
  }
  try {
    await crearPlanService(req.body);
    res.redirect("/planes");
  } catch (err) {
    res
      .status(400)
      .render("planesViews/crearPlan", {
        title: "Crear Plan",
        datos: req.body,
        errores: [{ msg: err.message }],
        path: req.path,
      });
  }
}
export async function verPlanController(req, res) {
  const plan = await obtenerPlanPorIdService(req.params.id);
  if (!plan) return res.status(404).render("404", { title: "No encontrado" });
  res.render("planesViews/verPlan", {
    title: `Plan ${plan.nombre}`,
    plan,
    path: req.path,
  });
}
export async function mostrarFormularioEditarPlanController(req, res) {
  const plan = await obtenerPlanPorIdService(req.params.id);
  if (!plan) return res.status(404).render("404", { title: "No encontrado" });
  res.render("planesViews/editarPlan", {
    title: `Editar Plan ${plan.nombre}`,
    datos: plan,
    errores: [],
    path: req.path,
  });
}
export async function actualizarPlanController(req, res) {
  req.body.activo = [req.body.activo].flat().some(valor =>
    valor === true || valor === "true" || valor === "on" || valor === "1"
  );
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res
      .status(400)
      .render("planesViews/editarPlan", {
        title: "Editar Plan",
        datos: { ...req.body, _id: req.params.id },
        errores: errores.array(),
        path: req.path,
      });
  }
  try {
    await actualizarPlanService(req.params.id, req.body);
    res.redirect("/planes");
  } catch (err) {
    res
      .status(400)
      .render("planesViews/editarPlan", {
        title: "Editar Plan",
        datos: { ...req.body, _id: req.params.id },
        errores: [{ msg: err.message }],
        path: req.path,
      });
  }
}
export async function eliminarPlanController(req, res) {
  try {
    await eliminarPlanService(req.params.id);
    res.redirect("/planes");
  } catch (error) {
    const plan = await obtenerPlanPorIdService(req.params.id);
    if (!plan) return res.status(404).send("Plan inexistente.");
    res.status(400).render("planesViews/editarPlan", {
      title: "Editar Plan", datos: plan, errores: [{ msg: error.message }], path: req.path,
    });
  }
}
