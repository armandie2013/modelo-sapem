// services/usuariosService.mjs

import Usuario from "../models/usuario.mjs";


// Obtener usuarios
export async function obtenerUsuariosOrdenados() {
  return await Usuario.find().sort({ apellido: 1 });
};


// Eliminar usuario
export async function eliminarUsuarioPorId(id) {
  return await Usuario.findByIdAndDelete(id);
};

// Buscar usuario por email
export async function buscarUsuarioPorEmail(email) {
  return await Usuario.findOne({ email }).select('nombre apellido email rol dni modulosPermitidos password').lean();
}
