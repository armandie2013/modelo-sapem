import { validationResult } from "express-validator";
import {
  listarPlanesService, crearPlanService, obtenerPlanPorIdService,
  actualizarPlanService, eliminarPlanService,
} from "../services/planesService.mjs";

export async function dashboardPlanesController(req, res) {
  const planes = await listarPlanesService();
  res.render("planesViews/dashboardPlanes", { title: "Planes", planes, path: req.path });
}
export function mostrarFormularioCrearPlanController(req, res) {
  res.render("planesViews/crearPlan", { title: "Crear Plan", datos: {}, errores: [], path: req.path });
}
export async function crearPlanController(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).render("planesViews/crearPlan", { title:"Crear Plan", datos:req.body, errores:errores.array(), path:req.path });
  }
  try { await crearPlanService(req.body); res.redirect("/planes"); }
  catch (err) {
    res.status(400).render("planesViews/crearPlan", { title:"Crear Plan", datos:req.body, errores:[{msg:err.message}], path:req.path });
  }
}
export async function verPlanController(req, res) {
  const plan = await obtenerPlanPorIdService(req.params.id);
  if (!plan) return res.status(404).render("404", { title: "No encontrado" });
  res.render("planesViews/verPlan", { title:`Plan ${plan.nombre}`, plan, path:req.path });
}
export async function mostrarFormularioEditarPlanController(req, res) {
  const plan = await obtenerPlanPorIdService(req.params.id);
  if (!plan) return res.status(404).render("404", { title: "No encontrado" });
  res.render("planesViews/editarPlan", { title:`Editar Plan ${plan.nombre}`, datos:plan, errores:[], path:req.path });
}
export async function actualizarPlanController(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).render("planesViews/editarPlan", { title:"Editar Plan", datos:{...req.body,_id:req.params.id}, errores:errores.array(), path:req.path });
  }
  try { await actualizarPlanService(req.params.id, req.body); res.redirect("/planes"); }
  catch (err) {
    res.status(400).render("planesViews/editarPlan", { title:"Editar Plan", datos:{...req.body,_id:req.params.id}, errores:[{msg:err.message}], path:req.path });
  }
}
export async function eliminarPlanController(req, res) {
  await eliminarPlanService(req.params.id);
  res.redirect("/planes");
}