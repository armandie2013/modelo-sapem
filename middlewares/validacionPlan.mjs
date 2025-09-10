import { body } from "express-validator";

export const validacionPlan = [
  body("nombre").trim().notEmpty().withMessage("El nombre del plan es obligatorio"),
  body("detalle").optional().trim().isLength({ max: 1000 }).withMessage("Detalle demasiado largo"),
  body("importe").notEmpty().withMessage("El importe es obligatorio").bail()
    .isFloat({ min: 0 }).withMessage("El importe debe ser un número >= 0"),
];