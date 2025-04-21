export function verificarSesion(req, res, next) {
  if (req.session && req.session.usuario) {
    res.locals.usuario = req.session.usuario;
    return next();
  }

  // Guardar la ruta original para volver después del login
  req.session.redirigirA = req.originalUrl;
  return res.redirect('/login');
}