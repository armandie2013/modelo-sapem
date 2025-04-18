export function verificarSesion(req, res, next) {
  if (!req.session.usuario) {
    return res.redirect("/login");
  }

  // Poner usuario en res.locals para que esté disponible en todas las vistas
  res.locals.usuario = req.session.usuario;

  next();
}