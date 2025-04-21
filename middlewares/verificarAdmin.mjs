export function verificarAdmin(req, res, next) {
    if (req.session.usuario?.rol === 'admin') {
      next();
    } else {
      res.status(403).render("noAutorizado", {
        title: "Acceso denegado",
        mensaje: "No tenés permisos para acceder a esta sección."
      });
    }
  }