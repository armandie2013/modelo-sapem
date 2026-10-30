# Ajuste de carga de material y catálogo

Esta actualización usa como base el ZIP modelo-sapem(20261029-152746).zip que enviaste.

Reemplazá únicamente estos archivos y recargá con Ctrl+F5:

- views/inventarioViews/formularioMovimiento.ejs
- views/inventarioViews/productos.ejs

Cambios: Cantidad de 85 px y alineada arriba junto al selector y las series; buscador en un bloque destacado con título, instrucciones, resultados verticales y mensaje sin coincidencias; Unidad y Control separados en Productos y leídos de su ficha. No se cambian datos ni permisos. El formulario compartido aplica el ajuste también a Asignaciones y Traspasos. Las cantidades continúan siendo enteras y el ingreso exige documento.

Unidad es el campo del producto y Control indica si se identifica por serie o por cantidad. Los equipos heredan estos datos del producto; sus datos individuales son serie, MAC, patrimonio, ubicación y estado. Para cambiar la unidad visible, corregí la ficha del producto cuando sus referencias e historial lo permitan; no se asigna un valor nuevo desde la vista.

Verificación: pasaron la compilación simulada de las plantillas y la sintaxis de JavaScript. No se comprobó visualmente en un navegador real. Conservá tu .env. No se requiere instalar dependencias ni modificar MongoDB.
