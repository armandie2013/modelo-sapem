> Actualización vigente: ver ACTUALIZACION-CATALOGO-PRODUCTOS.md. La ficha del catálogo puede crearse sin documento; el ingreso de existencias siempre requiere respaldo.

# Ingreso obligatorio por documento

## Aplicación sobre el paquete CRUD anterior

Detené solamente SAPEM, respaldá la carpeta del proyecto y copiá los archivos indicados más abajo conservando sus rutas. El ZIP es el proyecto completo y no incluye el .env. No cambies la configuración de MongoDB.

## Flujo corregido

1. Ingresos → Nuevo ingreso abre únicamente el registro del documento.
2. Tipo, número, fecha y emisor son obligatorios. El escaneo continúa siendo opcional, con hasta tres adjuntos de 10 MB.
3. Registrar documento crea un ingreso pendiente, sin existencias.
4. Se habilita la tabla de artículos. Se pueden seleccionar productos ya existentes o crear una ficha desde ese documento.
5. La creación de fichas requiere permisos Ingresar y Administrar. El operador que creó el ingreso puede completar su propio ingreso; para editar ingresos de otro operador se requiere Editar.
6. Cada ficha nueva conserva el documento que justificó su alta. Permanece pendiente y no puede usarse en otro ingreso o asignación antes de confirmar su recepción.
7. Confirmar incorpora el material al stock, vincula la ficha con el comprobante de ingreso y habilita su uso posterior.
8. Eliminar un ingreso pendiente elimina sus fichas nuevas sin uso. Nunca elimina productos existentes utilizados por otros movimientos.

Productos queda como consulta y CRUD del catálogo. Su botón dirige a Ingresos. La URL antigua de alta redirige al nuevo flujo y el POST genérico de catálogos rechaza crear productos directamente. El modelo también requiere respaldo para las fichas nuevas.

Las fichas anteriores se conservan sin inventarles documentos. Se identifican como anteriores a este control; su primer ingreso posterior documentado permite registrar su respaldo. Esto no incorpora existencias automáticamente.

Antes de crear otra ficha desde el formulario de ingreso, guardá los cambios de los renglones que ya hayas completado. La creación agrega automáticamente un renglón pendiente con la cantidad en blanco.

## Pruebas realizadas

Pasaron las dos suites con adaptadores simulados: lógica de inventario y plantillas. Se agregaron controles de documento incompleto, creación vinculada, ausencia de stock antes de confirmar, bloqueo del alta directa y limpieza de fichas sin uso al eliminar el ingreso pendiente. Las pruebas anteriores de CRUD, stock, anulaciones, concurrencia y recuperación también pasan.

No se ejecutaron MongoDB/Mongoose ni Chromium reales en este entorno. Verificá en tu PC antes de cargar datos operativos.

## Prueba manual

1. Desde Productos, comprobar que ya no hay alta libre y que la URL /inventario/productos/nuevo dirige a registrar el documento.
2. Abrir Ingresos → Nuevo ingreso. Debe mostrar documento, no un alta de producto independiente.
3. Completar un remito, guardar y crear una ficha desde ese ingreso. Debe figurar pendiente, sin stock.
4. Completar cantidad y series, confirmar y comprobar el stock y el PDF.
5. Abrir otro ingreso y comprobar que el producto ya confirmado puede seleccionarse.
6. Crear otro documento y una ficha temporal; eliminar ese ingreso pendiente y comprobar que la ficha temporal sin uso desaparece.
7. Verificar los permisos con un usuario que tenga Ingresar pero no Administrar: puede seleccionar fichas existentes y completar su ingreso, pero no crear fichas nuevas.

## Archivos modificados respecto del paquete CRUD anterior

- `controllers/inventarioController.mjs`
- `controllers/inventarioCrudController.mjs`
- `controllers/inventarioDocumentoController.mjs`
- `models/inventario.mjs`
- `routes/inventarioCrudRoutes.mjs`
- `routes/inventarioRoutes.mjs`
- `services/inventarioCrudService.mjs`
- `services/inventarioDocumentoService.mjs`
- `services/inventarioService.mjs`
- `tests/inventario-logica.mjs`
- `tests/inventario-plantillas.mjs`
- `views/inventarioViews/borradores.ejs`
- `views/inventarioViews/documentoIngreso.ejs`
- `views/inventarioViews/formularioMovimiento.ejs`
- `views/inventarioViews/productoDesdeDocumento.ejs`
- `views/inventarioViews/productos.ejs`
