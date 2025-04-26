// controllers/usuariosController.mjs

import { obtenerUsuariosOrdenados, eliminarUsuarioPorId } from "../services/usuariosService.mjs";


// Listar usuarios
export const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await obtenerUsuariosOrdenados();
    res.render("usuariosViews/dashboardUsuarios", { title: "Usuarios Registrados", usuarios });
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    res.status(500).send("Error al listar usuarios");
  }
};


// Eliminar usuario
export const eliminarUsuario = async (req, res) => {
  try {
    await eliminarUsuarioPorId(req.params.id);
    res.redirect("/usuarios/dashboard");
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).send("Error al eliminar usuario");
  }
};
