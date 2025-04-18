import Usuario from "../models/usuario.mjs";

export const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find().sort({ nombre: 1 });
    res.render("dashboardUsuarios", { title: "Usuarios Registrados", usuarios });
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    res.status(500).send("Error al listar usuarios");
  }
};

export const eliminarUsuario = async (req, res) => {
  try {
    await Usuario.findByIdAndDelete(req.params.id);
    res.redirect("/usuarios/dashboard");
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).send("Error al eliminar usuario");
  }
};