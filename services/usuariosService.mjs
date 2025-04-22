// services/usuariosService.mjs

import Usuario from "../models/usuario.mjs";


// Obtener usuarios
export async function obtenerUsuariosOrdenados() {
  return await Usuario.find().sort({ nombre: 1 });
};


// Eliminar usuario
export async function eliminarUsuarioPorId(id) {
  return await Usuario.findByIdAndDelete(id);
};
