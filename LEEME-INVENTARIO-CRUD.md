> Actualización vigente: ver ACTUALIZACION-CATALOGO-PRODUCTOS.md. La ficha del catálogo puede crearse sin documento; el ingreso de existencias siempre requiere respaldo.

> Actualización: leé primero ACTUALIZACION-INGRESO-DOCUMENTADO.md. El alta libre de productos fue retirada.

# Correcciones de inventario SAPEM

## Aplicación

Este paquete parte del ZIP modelo-sapem(20261029-103115).zip.

1. Detené solamente la aplicación Node de SAPEM y respaldá su carpeta y su base.
2. El ZIP contiene el proyecto completo. Podés copiar únicamente los archivos enumerados abajo conservando sus rutas. No borres archivos del proyecto.
3. Conservá tu .env: no se incluye ni se cambia. No cambies MongoDB, sus servicios, puertos ni las conexiones de otros proyectos.
4. Iniciá la aplicación como lo hacés normalmente. El prepararInventario() que ya está en app.mjs inicializa los nuevos modelos y comprueba las operaciones pendientes.
5. Entrá como administrador. En Personal SAPEM aparecen los permisos de inventario Editar y desactivar, Eliminar sin historial y Anular movimientos. Los usuarios no administradores requieren Ver y los permisos de operación correspondientes; editar borradores también requiere Editar.

## Comportamiento

- Productos, depósitos y destinatarios: alta, consulta, edición, eliminación si no tienen uso, desactivación y reactivación.
- Un depósito principal no se elimina ni desactiva hasta elegir otro principal.
- No se elimina ningún registro con movimientos, equipos, existencias o borradores asociados. El historial se conserva incluso si los movimientos fueron anulados.
- La desactivación requiere no tener material ni equipos asociados. Se ocultan los inactivos de los selectores para nuevas operaciones, pero siguen disponibles para consulta y reactivación.
- No se cambia la unidad ni el control por serie/cantidad de un producto utilizado.
- Equipos: se pueden editar MAC y código patrimonial. La serie, ubicación y estado se controlan mediante ingresos y movimientos; no se borran equipos recibidos desde su ficha.
- Crear una ficha de producto no incorpora existencias. Los ingresos confirmados siguen requiriendo tipo de documento, emisor, número y fecha. El escaneo continúa siendo opcional y puede adjuntarse después.
- Borradores: guardar sin afectar existencias, editar, confirmar y eliminar. Los archivos del borrador se conservan al confirmar y se pueden quitar mientras el registro siga siendo borrador.
- Confirmados: se conservan y se anulan con motivo; no se borran ni se editan sus cantidades. Para una corrección de material, anular y registrar nuevamente.
- Anular revierte saldos, ubicación de equipos y cantidades devueltas. Se conservan fecha, motivo y usuario. Se bloquea la anulación si hay movimientos posteriores relacionados. En materiales sin serie el control es conservador por producto y ubicaciones.
- Para anular una asignación que tiene devoluciones, primero hay que anular esas devoluciones.
- Los comprobantes y PDF anulados muestran claramente ANULADO. Las copias escaneadas originales se conservan.
- Se permiten hasta 3 adjuntos por envío, de 10 MB cada uno, en PDF, PNG o JPG.

## MongoDB local

Se eliminó la dependencia de transacciones multi-documento y de replica set en inventario.

El módulo utiliza un bloqueo persistente de inventario, un diario previo por documento y recuperación al iniciar. Las lecturas y escrituras del módulo se serializan; los demás módulos y proyectos no usan ese bloqueo. Los cambios con errores de validación se revierten. Una pérdida de conexión deja el inventario bloqueado hasta reiniciar la app cuando MongoDB esté disponible.

No es una transacción nativa de MongoDB ni un sustituto general de sus garantías ACID. Está diseñado para esta aplicación local, en una misma máquina. Todas las escrituras de inventario deben realizarse con este código; no ejecutes simultáneamente una versión anterior de SAPEM sobre la misma base ni edites sus colecciones desde otra aplicación durante las operaciones. La recuperación automática de un proceso muerto reconoce el host y el PID anteriores; no roba bloqueos de procesos vivos o de otros hosts.

Las colecciones inv_control_bloqueo, inv_control_operaciones e inv_control_diario contienen el control y el registro de recuperación. No las borres para quitar un bloqueo. Si una recuperación falla, conservá la base y revisá el error antes de continuar.

El app.mjs del ZIP ya llama a prepararInventario(); no requiere modificaciones adicionales para estas correcciones.

## Verificación realizada

Pasaron ambas suites incluidas, con adaptadores simulados:

```
node --experimental-vm-modules tests/inventario-logica.mjs
node --experimental-vm-modules tests/inventario-plantillas.mjs
```

Se verificaron sintaxis, plantillas y JavaScript de formularios; ciclo de stock 15 ingresados, 10 asignados y 3 devueltos; anulaciones en orden; referencias; versiones; borradores; duplicados; concurrencia y recuperación simulada de una pérdida de conexión.

No se ejecutó la aplicación contra MongoDB/Mongoose ni Chromium reales en este entorno. Es necesario verificarla en tu PC antes de utilizarla con datos operativos.

## Prueba manual en tu PC

1. Crear un depósito de prueba sin marcarlo principal; editarlo y eliminarlo.
2. Confirmar que el depósito principal no puede desactivarse ni eliminarse.
3. Desde Ingresos, registrar el documento, crear o seleccionar sus fichas y guardar el borrador; comprobar que no suma stock.
4. Editar el borrador, completar su documento y confirmar un ingreso de equipos con sus series.
5. Asignar parte del material; comprobar existencias en depósito y asignadas.
6. Registrar una devolución parcial; verificar cantidades pendientes y PDF.
7. Comprobar que no se puede eliminar el depósito/producto con material o historial.
8. Intentar anular la asignación con una devolución vigente: debe bloquearla.
9. Anular la devolución, luego la asignación y finalmente el ingreso; comprobar saldos y comprobantes anulados.
10. Desactivar y reactivar un registro sin material; verificar los selectores.
11. Subir un PDF de más de 3 MB y menos de 10 MB y descargarlo desde su comprobante.

## Archivos nuevos o modificados

- `controllers/inventarioController.mjs`
- `controllers/inventarioCrudController.mjs`
- `middlewares/inventarioAccessMiddleware.mjs`
- `models/inventario.mjs`
- `models/inventarioConfiguracion.mjs`
- `models/personaDisponible.mjs`
- `routes/inventarioCrudRoutes.mjs`
- `routes/inventarioRoutes.mjs`
- `services/inventarioConsultasService.mjs`
- `services/inventarioCrudService.mjs`
- `services/inventarioPersistencia.mjs`
- `services/inventarioService.mjs`
- `tests/inventario-logica.mjs`
- `tests/inventario-plantillas.mjs`
- `views/inventarioViews/accionesRegistro.ejs`
- `views/inventarioViews/adjuntosBorrador.ejs`
- `views/inventarioViews/borradores.ejs`
- `views/inventarioViews/comprobante.ejs`
- `views/inventarioViews/editarRegistro.ejs`
- `views/inventarioViews/equipo.ejs`
- `views/inventarioViews/formularioDevolucion.ejs`
- `views/inventarioViews/formularioMovimiento.ejs`
- `views/inventarioViews/lugares.ejs`
- `views/inventarioViews/movimientos.ejs`
- `views/inventarioViews/panel.ejs`
- `views/inventarioViews/permisos.ejs`
- `views/inventarioViews/productos.ejs`
- `views/personasViews/agregarPersona.ejs`
- `views/personasViews/editarPersona.ejs`
