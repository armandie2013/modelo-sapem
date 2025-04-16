// middlewares/authMiddleware.mjs

export const verificarSesion = (req, res, next) => {
  if (req.session && req.session.usuario) {
    // El usuario está logueado
    next();
  } else {
    // No hay sesión activa
    res.redirect("/login");
  }
};

export const setUsuarioEnVista = (req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  next();
};
