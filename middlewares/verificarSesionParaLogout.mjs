// middlewares/verificarSesionParaLogout.mjs

// Verifica si hay una sesión activa. Si hay sesión, permite seguir (cerrar sesión normalmente). Si no hay sesión, redirige a /login automáticamente.

export function verificarSesionParaLogout(req, res, next) {
    if (req.session && req.session.usuario) {
      // Hay sesión activa, puede cerrar sesión
      return next();
    } else {
      // No hay sesión, lo redirige directo al login
      return res.redirect("/login");
    };
  };