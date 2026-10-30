# Corrección de todos los listados de inventario

Reemplazá los archivos de la lista siguiente manteniendo sus rutas, incluido el nuevo accionesListado.ejs. No hace falta reinstalar dependencias. Reiniciá la aplicación y recargá con Ctrl+F5. Conservá tu .env.

## Cambios

- Encabezados con descripción y acción principal alineadas en Depósitos, Destinatarios, Productos y los cuatro tipos de movimientos.
- Filtros de Equipos y Asignaciones compactos y alineados junto a Buscar/Filtrar y Limpiar; ya no ocupan varias filas innecesarias en escritorio.
- Acciones por fila con botones del mismo tamaño y en una sola línea, incluyendo Ver existencias, Editar, Desactivar/Reactivar y Eliminar. En tablas anchas se usa desplazamiento horizontal para evitar superposiciones.
- Borradores usa Continuar y Eliminar alineados. Continuar conserva el acceso a editar y confirmar; no confirma de forma automática.
- Ingresos, Asignaciones, Devoluciones y Traspasos muestran Ver comprobante y PDF como botones compactos; Devolver material conserva sus permisos y condiciones.
- Depósitos y Destinatarios separan el estado del nombre. Principal se muestra como dato secundario.
- Tablas con filas alineadas, columnas de acciones ajustadas al contenido, textos largos que pueden partirse, números alineados y mensajes vacíos uniformes.
- Paginación y recuentos con el mismo formato visual.
- Se mantienen colores, navbar, pie, navegación horizontal, rutas, permisos, confirmaciones y lógica de inventario.
- Nuevos estilos limitados a listados. No se modifican los archivos de formularios internos, edición, comprobantes ni PDF. Estos quedan para una siguiente etapa. El selector de asignación para devolver comparte el listado de movimientos, por lo que recibe su presentación común.

## Verificación

Pasaron las comprobaciones de compilación de plantillas y JavaScript con adaptador de EJS simulado, incluyendo filas y vacíos, cuatro tipos de movimientos, anulados, catálogos activos/inactivos y permisos completos/restringidos. Se verificó que los archivos de formularios, edición, comprobantes y PDF permanecen idénticos a la entrega previa y que no se incorporan colores nuevos. No se hizo una prueba visual en un navegador real ni una integración con tu instalación de Windows/MongoDB.

## Archivos a reemplazar

- `views/inventarioViews/accionesListado.ejs`
- `views/inventarioViews/borradores.ejs`
- `views/inventarioViews/equipos.ejs`
- `views/inventarioViews/lugares.ejs`
- `views/inventarioViews/movimientos.ejs`
- `views/inventarioViews/paginacion.ejs`
- `views/inventarioViews/panel.ejs`
- `views/inventarioViews/productos.ejs`
