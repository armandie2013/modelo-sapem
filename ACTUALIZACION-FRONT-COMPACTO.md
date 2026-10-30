> Para la corrección posterior de todas las secciones, ver ACTUALIZACION-LISTADOS-INVENTARIO.md.

# Inventario: optimización visual del espacio

Sobre la última versión del catálogo, reemplazá únicamente:

- views/inventarioViews/panel.ejs
- views/inventarioViews/dashboard.ejs

Reiniciá la aplicación y recargá con Ctrl+F5. No hay dependencias nuevas ni cambios de base de datos, permisos o .env.

Se conservan los colores, las pestañas horizontales, el navbar y el pie actuales. Todos los cambios de estilo quedan limitados al inventario. El ancho máximo de contenido pasa a 1568 px y el contenedor exterior a 1600 px. Se reducen márgenes, rellenos y redondeos. Botones de 32 px, acciones de tabla de 28 px, texto de tabla de 14 px. Los controles de móvil conservan 40 px y los formularios se apilan. Las tablas anchas y las pestañas se desplazan horizontalmente. La tabla general alinea números a la derecha y resalta el total. Las acciones de General se ubican junto al encabezado y se apilan cuando falta espacio. Las acciones y confirmaciones mantienen su funcionamiento actual.

Validación: pasaron las comprobaciones de plantillas y JavaScript. Se verificó que la paleta de colores del módulo no incorpora colores nuevos y que solo se modifican los dos archivos indicados. No se realizó una comprobación visual en un navegador real ni en tu Windows; la imagen anterior era una propuesta.
