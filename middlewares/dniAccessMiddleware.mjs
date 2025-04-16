export function accesoPorDni(listaPermitidos) {
    return (req, res, next) => {
      // Verificamos que el usuario esté logueado y tenga un dni registrado
      
      if (!req.session.usuario || !req.session.usuario.dni) {
        return res.status(403).send("Acceso denegado: Usuario no autenticado o sin DNI.");
      }
  
      const dniUsuario = req.session.usuario.dni;

      // console.log("🔒 DNI en sesión:", dniUsuario);
      // console.log("🔒 Lista permitidos:", listaPermitidos);
  
      if (listaPermitidos.includes(dniUsuario)) {
        return next();
      } else {
        return res.status(403).send("Acceso denegado: No tenés permiso para este módulo.");
      }
    };
  }
  