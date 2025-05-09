import { body } from "express-validator";

export const validacionDatosEscuela = [
  body("cue")
    .trim()
    .isLength({ min: 9, max: 9 }).withMessage("El CUE debe tener exactamente 9 dígitos.")
    .isNumeric().withMessage("El CUE debe contener solo números.")
    .custom(value => parseInt(value) > 0).withMessage("El CUE debe ser un número positivo."),

  body("predio")
    .trim()
    .isLength({ min: 6, max: 6 }).withMessage("El predio debe tener exactamente 6 dígitos.")
    .isNumeric().withMessage("El predio debe contener solo números.")
    .custom(value => parseInt(value) > 0).withMessage("El predio debe ser un número positivo.")
];