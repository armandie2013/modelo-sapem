import { body, validationResult } from "express-validator";

export const validacionesPredioEscuela = [
  body("predio")
    .trim()
    .notEmpty()
    .withMessage("El número de predio es obligatorio."),

  body("cue")
    .trim()
    .notEmpty()
    .withMessage("El CUE es obligatorio."),

  body("nombreEscuela")
    .trim()
    .notEmpty()
    .withMessage("El nombre de la escuela es obligatorio."),

  body("direccion")
    .trim()
    .notEmpty()
    .withMessage("La dirección es obligatoria."),

  body("ciudad")
    .trim()
    .notEmpty()
    .withMessage("La ciudad es obligatoria."),

  body("departamento")
    .trim()
    .notEmpty()
    .withMessage("El departamento es obligatorio."),

  body("megabytesAsignados")
    .notEmpty()
    .withMessage("Los megabytes asignados son obligatorios.")
    .bail()
    .isFloat({ min: 0 })
    .withMessage("Los megabytes asignados deben ser un número válido."),

  body("isp")
    .trim()
    .notEmpty()
    .withMessage("El ISP es obligatorio."),

  body("tecnologia")
    .trim()
    .notEmpty()
    .withMessage("La tecnología es obligatoria."),
];

export function manejarValidacionPredioEscuela(req, res, next) {
  const errores = validationResult(req);

  if (!errores.isEmpty()) {
    req.erroresValidacion = errores.array();
  }

  next();
}