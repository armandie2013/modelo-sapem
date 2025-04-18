import PersonaDisponible from "../models/personaDisponible.mjs";

export function accesoPorModulo(...modulosRequeridos) {
  return async (req, res, next) => {
    if (!req.session.usuario || !req.session.usuario.dni) {
      console.log("🔒 Usuario no autenticado o sin DNI");
      return res.status(403).send("Acceso denegado: Usuario no autenticado o sin DNI.");
    }

    const dniUsuario = req.session.usuario.dni;
    console.log("🔍 Buscando acceso para DNI:", dniUsuario);

    const datosPersona = await PersonaDisponible.findOne({ dni: dniUsuario });

    console.log("👤 Persona encontrada:", datosPersona);

    if (!datosPersona || !datosPersona.modulosPermitidos) {
      console.log("🚫 Persona no encontrada o sin modulosPermitidos");
      return res.status(403).send("Acceso denegado: No se encontró la persona o no tiene permisos.");
    }

    const tieneAcceso = modulosRequeridos.some((modulo) =>
      datosPersona.modulosPermitidos.includes(modulo)
    );

    console.log("✅ Modulos requeridos:", modulosRequeridos);
    console.log("🧾 Modulos de la persona:", datosPersona.modulosPermitidos);
    console.log("🟢 ¿Tiene acceso?:", tieneAcceso);

    if (!tieneAcceso) {
      return res.status(403).send("Acceso denegado: No tenés permiso para este módulo.");
    }

    next();
  };
}