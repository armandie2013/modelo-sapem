export const accionesInventario = [
  "ver",
  "editar",
  "eliminar",
  "anular",
  "administrar",
  "ingresar",
  "asignar",
  "devolver",
  "traspasar",
];

export function cargarPermisosInventario(
  req,
  res,
  next
) {
  try {
    const usuario = req.session?.usuario;

    const permisos =
      usuario?.modulosPermitidos?.inventario || {};

    const puedeVer =
      !!usuario &&
      permisos.ver === true;

    req.invPermisos = Object.fromEntries(
      accionesInventario.map((accion) => [
        accion,
        puedeVer && permisos[accion] === true,
      ])
    );

    res.locals.permisosInventario =
      req.invPermisos;

    next();
  } catch (error) {
    next(error);
  }
}