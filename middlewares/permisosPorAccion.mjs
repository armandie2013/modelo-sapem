// export function verificarPermiso(modulo, accion) {
//   return (req, res, next) => {
//     console.log("🔎 Verificando permiso:", { modulo, accion });
//     console.log("👤 Usuario en sesión:", req.session.usuario);

//     const usuario = req.session.usuario;

//     if (!usuario || !usuario.modulosPermitidos) {
//       return res.status(403).send("Permiso denegado");
//     };

//     const tienePermiso = usuario.modulosPermitidos?.[modulo]?.[accion] === true;

//     if (tienePermiso) {
//       return next();
//     } else {
//       console.log("🔎 Verificando permisos:", {
//         modulo,
//         accion,
//         permisos: req.session.usuario.modulosPermitidos
//       });
//       return res.status(403).render("noAutorizado",{title: "Permiso Denegado"});
//     }
//   };
// };

// middlewares/permisosPorAccion.mjs
export function verificarPermiso(modulo, accion) {
  return (req, res, next) => {
    const rutaActual = req.originalUrl || "";
    const usuario = req.session?.usuario || null;

    console.log("🔎 Verificando permiso:", { modulo, accion, rutaActual });
    console.log("👤 Usuario en sesión:", usuario ? {
      id: usuario?._id,
      email: usuario?.email,
      rol: usuario?.rol
    } : "Sin sesión");

    // 1) Si no hay sesión → login
    if (!usuario) {
      return res.redirect("/login");
    }

    // 2) Si el objeto de permisos no existe → denegado
    if (!usuario.modulosPermitidos) {
      console.warn("⚠️ Usuario sin 'modulosPermitidos'");
      return res.status(403).render("noAutorizado", {
        title: "Permiso denegado",
        usuario,
        rutaActual,
        moduloActual: modulo,
        accion
      });
    }

    // 3) Evalúa permiso puntual
    const tienePermiso = usuario.modulosPermitidos?.[modulo]?.[accion] === true;

    if (tienePermiso) {
      return next();
    } else {
      console.log("🚫 Sin permiso:", {
        modulo,
        accion,
        permisosDelUsuario: usuario.modulosPermitidos
      });
      return res.status(403).render("noAutorizado", {
        title: "Permiso denegado",
        usuario,
        rutaActual,
        moduloActual: modulo,
        accion
      });
    }
  };
}
