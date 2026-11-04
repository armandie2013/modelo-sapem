const areas = [
  {
    nombre: 'Administración',
    descripcion: 'Gestión administrativa y financiera.',
    modulos: [
      {
        permiso: 'proveedores',
        nombre: 'Proveedores',
        descripcion: 'Consultá y administrá proveedores.',
        href: '/proveedores'
      },
      {
        permiso: 'planes',
        nombre: 'Planes',
        descripcion: 'Gestioná los planes de servicio.',
        href: '/planes'
      },
      {
        permiso: 'pagos',
        nombre: 'Pagos',
        descripcion: 'Consultá y registrá pagos.',
        href: '/pagos'
      },
      {
        permiso: 'tareas',
        nombre: 'Tareas programadas',
        descripcion: 'Consultá la generación de cargos mensuales.',
        href: '/tareas/cargos'
      }
    ]
  },
  {
    nombre: 'Proyectos',
    descripcion: 'Casos y seguimiento de proyectos.',
    modulos: [
      {
        permiso: 'escuelas',
        nombre: 'Escuelas',
        descripcion: 'Gestión y seguimiento de escuelas.',
        href: '/escuelas/dashboard'
      },
      {
        permiso: 'prediosEscuelas',
        nombre: 'Predios Escuelas',
        descripcion: 'Consultá y administrá los predios.',
        href: '/predios-escuelas/dashboard'
      }
    ]
  },
  {
    nombre: 'Técnica',
    descripcion: 'Operación técnica y soporte.',
    modulos: [
      {
        permiso: 'inventario',
        nombre: 'Inventario',
        descripcion: 'Existencias, ingresos, asignaciones y producción.',
        href: '/inventario'
      },
      { permiso: 'inventario', nombre: 'Equipos en producción', descripcion: 'Instalaciones, responsables y retiros de equipos.', href: '/inventario/produccion' },
      {
        permiso: 'viaticos',
        nombre: 'Órdenes de trabajo',
        descripcion: 'Solicitudes y rendiciones de órdenes de trabajo.',
        href: '/viaticos/dashboard'
      },
      {
        permiso: 'materiales',
        nombre: 'Pedido de materiales',
        descripcion: 'Solicitudes de materiales y seguimiento.',
        href: '/pedidos-materiales/dashboard'
      }
    ]
  }
];

export function obtenerAreasInicio(usuario) {
  if (!usuario) return [];

  const permisos = usuario.modulosPermitidos || {};

  const visibles = areas
    .map(area => ({
      ...area,
      modulos: area.modulos.filter(
        modulo => permisos[modulo.permiso]?.ver === true
      )
    }))
    .filter(area => area.modulos.length > 0);

  // Conserva el acceso administrativo que ya utiliza el navbar.
  // Esto no habilita permisos sobre los módulos operativos.
  if (usuario.rol === 'admin') {
    visibles.push({
      nombre: 'Acceso Admin',
      descripcion: 'Administración de personal y cuentas de usuario.',
      modulos: [
        {
          nombre: 'Personal SAPEM',
          descripcion: 'Gestioná el personal y sus permisos.',
          href: '/personas/dashboard'
        },
        {
          nombre: 'Usuarios registrados',
          descripcion: 'Administrá las cuentas de acceso.',
          href: '/usuarios/dashboard'
        }
      ]
    });
  }

  return visibles;
}

export function mostrarInicio(req, res) {
  const usuario = req.session?.usuario;

  if (!usuario) {
    return res.redirect('/login');
  }

  res.set('Cache-Control', 'no-store');

  return res.render('inicio', {
    title: 'Inicio',
    usuario,
    areasInicio: obtenerAreasInicio(usuario)
  });
}