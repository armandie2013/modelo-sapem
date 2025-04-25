import PersonaDisponible from "../models/personaDisponible.mjs";
import { buscarPersonaPorDni } from "../services/personasService.mjs";

export function accesoPorModulo(modulo) {
  return async (req, res, next) => {
    try {
      const datosPersona = await buscarPersonaPorDni(req.session.usuario.dni);

      if (!datosPersona || !datosPersona.modulosPermitidos) {
        return res.status(403).send("Acceso denegado: no autorizado.");
      }

      const modulos = Object.keys(datosPersona.modulosPermitidos);

      if (modulos.includes(modulo)) {
        return next();
      } else {
        return res.status(403).send("Acceso denegado: no autorizado.");
      }
    } catch (error) {
      console.error("Error en accesoPorModulo:", error);
      return res.status(500).send("Error en servidor.");
    }
  };
}