import { body } from "express-validator";

export const validacionProveedor = [
  body("nombreFantasia")
    .trim()
    .notEmpty().withMessage("El nombre de fantasía es obligatorio"),

  body("nombreReal")
    .trim()
    .notEmpty().withMessage("El nombre real es obligatorio"),

  body("cuit")
  .trim()
  .matches(/^\d{11}$/).withMessage("CUIT debe contener exactamente 11 dígitos numéricos"),

  body("domicilio")
    .trim()
    .notEmpty().withMessage("El domicilio es obligatorio"),

  body("domicilioFiscal")
    .trim()
    .notEmpty().withMessage("El domicilio fiscal es obligatorio"),

  body("telefonoCelular")
  .optional()
  .trim()
  .matches(/^\d{10}$/).withMessage("Teléfono celular debe contener exactamente 10 dígitos numéricos"),

  body("telefonoFijo")
    .optional()
    .trim(),

  body("email")
    .optional()
    .trim()
    .isEmail().withMessage("Debe ingresar un email válido"),

 body("cbu")
  .optional()
  .trim()
  .matches(/^\d{22}$/).withMessage("CBU debe contener exactamente 22 dígitos numéricos"),

  body("categoria")
    .trim()
    .notEmpty().withMessage("La categoría es obligatoria"),

  body("condicionIva")
    .trim()
    .notEmpty().withMessage("La condición IVA es obligatoria"),
];