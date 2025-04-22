// services/personasService.mjs

import PersonaDisponible from "../models/personaDisponible.mjs";

// Obtener personas ordenadas
export async function obtenerPersonasOrdenadas() {
  return await PersonaDisponible.find().sort({ numeroOrden: 1 });
}


// Obtener personas por id
export async function obtenerPersonaPorId(id) {
  return await PersonaDisponible.findById(id);
}


// Agregar persona
export async function agregarPersonaService(datos) {
  const modulos = Array.isArray(datos.modulosPermitidos)
    ? datos.modulosPermitidos
    : datos.modulosPermitidos
    ? [datos.modulosPermitidos]
    : [];

  const nuevaPersona = new PersonaDisponible({
    numeroOrden: datos.numeroOrden,
    legajo: datos.legajo,
    nombreApellido: datos.nombreApellido,
    dni: datos.dni,
    cargo: datos.cargo,
    modulosPermitidos: modulos,
  });

  await nuevaPersona.save();
}


// Actualizar persona
export async function actualizarPersonaService(id, datos) {
  const modulos = Array.isArray(datos.modulosPermitidos)
    ? datos.modulosPermitidos
    : datos.modulosPermitidos
    ? [datos.modulosPermitidos]
    : [];

  await PersonaDisponible.findByIdAndUpdate(id, {
    numeroOrden: datos.numeroOrden,
    legajo: datos.legajo,
    nombreApellido: datos.nombreApellido,
    dni: datos.dni,
    cargo: datos.cargo,
    modulosPermitidos: modulos,
  });
}


// Eliminar persona
export async function eliminarPersonaPorId(id) {
  await PersonaDisponible.findByIdAndDelete(id);
}
