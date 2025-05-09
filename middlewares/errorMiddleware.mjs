import { validationResult } from "express-validator";

export function manejarErroresValidacion(req, res, next) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    req.erroresValidacion = errores.array();
    return next(); // Deja que el controlador maneje el render con errores
  }
  next();
}