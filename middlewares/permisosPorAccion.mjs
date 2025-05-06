export function verificarPermiso(modulo, accion) {
  return (req, res, next) => {
    console.log("🔎 Verificando permiso:", { modulo, accion });
    console.log("👤 Usuario en sesión:", req.session.usuario);

    const usuario = req.session.usuario;

    if (!usuario || !usuario.modulosPermitidos) {
      return res.status(403).send("Permiso denegado");
    };

    const tienePermiso = usuario.modulosPermitidos?.[modulo]?.[accion] === true;

    if (tienePermiso) {
      return next();
    } else {
      console.log("🔎 Verificando permisos:", {
        modulo,
        accion,
        permisos: req.session.usuario.modulosPermitidos
      });
      return res.status(403).render("noAutorizado",{title: "Permiso Denegado"});
    }
  };
};