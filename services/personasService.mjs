// services/personasService.mjs

import PersonaDisponible from "../models/personaDisponible.mjs";

// Obtener personas ordenadas
export async function obtenerPersonasOrdenadas() {
  return await PersonaDisponible.find().sort({ numeroOrden: 1 });
};


// Obtener personas por id
export async function obtenerPersonaPorId(id) {
  return await PersonaDisponible.findById(id);
};


// Agregar persona
export async function agregarPersonaService(datos) {
  const nuevaPersona = new PersonaDisponible({
    numeroOrden: datos.numeroOrden,
    legajo: datos.legajo,
    nombreApellido: datos.nombreApellido,
    dni: datos.dni,
    cargo: datos.cargo,
    modulosPermitidos: datos.modulosPermitidos || {}
  });

  await nuevaPersona.save();
};


// Actualizar persona
export async function actualizarPersonaService(id, datos) {
  await PersonaDisponible.findByIdAndUpdate(id, {
    numeroOrden: datos.numeroOrden,
    legajo: datos.legajo,
    nombreApellido: datos.nombreApellido,
    dni: datos.dni,
    cargo: datos.cargo,
    modulosPermitidos: datos.modulosPermitidos || {}
  }, { runValidators: true }); // ✅ IMPORTANTE
}


// Eliminar persona
export async function eliminarPersonaPorId(id) {
  await PersonaDisponible.findByIdAndDelete(id);
};

// Buscamos persona por dni
export async function buscarPersonaPorDni(dni) {
  return await PersonaDisponible.findOne({ dni: dni }).lean();
}