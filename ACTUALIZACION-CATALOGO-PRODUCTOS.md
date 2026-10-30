> Para los ajustes visuales más recientes ver ACTUALIZACION-FRONT-COMPACTO.md.

# Actualización: catálogo independiente de productos

Reemplazá los archivos indicados manteniendo sus rutas. Reiniciá la aplicación y recargá la página. No reemplaces tu .env. No requiere cambiar la instalación, el servicio ni la configuración de MongoDB.

## Comportamiento

- Productos es un catálogo sin cantidades: código, nombre, marca, modelo, descripción, unidad, control y estado.
- El permiso administrar habilita crear fichas. Editar, eliminar y desactivar mantienen sus permisos actuales.
- Crear una ficha no genera stock, equipos ni movimientos. Los ingresos siguen requiriendo tipo, número, fecha y emisor del documento.
- El ingreso ofrece el desplegable y un buscador por código, nombre, marca y modelo; al seleccionar un resultado agrega un renglón para cantidad y series.
- Crear desde un ingreso agrega la ficha al catálogo y al detalle pendiente. Guardá primero el borrador si modificaste otras líneas.
- Código repetido bloqueado. Al crear o editar se buscan coincidencias de nombres normalizados, modelos, números de modelo y palabras. Incluye inactivos. MK y MIKROTI se comparan con MIKROTIK. Es una ayuda heurística, no una identificación automática infalible.
- Se muestran posibles coincidencias mientras escribís y el servidor vuelve a verificarlas al guardar. Si es un producto distinto, marcá la confirmación expresa. No se permite omitir la unicidad del código.
- Los datos descriptivos pueden editarse sin cambiar los comprobantes emitidos. Unidad y control siguen protegidos si hay movimientos, existencias o referencias en borradores.
- Borrar requiere que no haya historial, equipos, saldo positivo ni referencias en borradores. El historial anulado también se conserva. Si hay historia, desactivar requiere no tener material ni referencias pendientes.
- Eliminar un borrador no elimina fichas del catálogo, incluidas las creadas con la versión anterior. Las fichas anteriores siguen disponibles, sin duplicarlas ni modificar sus existencias.
- Cantidades enteras en formularios de movimientos y devoluciones, y validación del servidor al confirmar y guardar borradores. Se conserva la escala interna anterior (1000 por unidad) para no reinterpretar registros ya cargados. No se convierte ni redondea material histórico.

## Validación

Pasaron las pruebas de sintaxis y plantillas, y la lógica con adaptadores simulados: stock, movimientos, anulaciones, borradores, concurrencia y recuperación, además de catálogo sin stock, código duplicado, advertencia de similares, confirmación expresa, edición, eliminación y rechazo de fracciones. No se probó contra MongoDB real ni en tu Windows.

Comprobación en tu instalación: crear MikroTik RB5009 sin documento; verificar que no aumente stock; intentar MK 5009 y revisar advertencia; ingresar dos unidades con remito y dos series; comprobar inventario; editar nombre y comprobar que el comprobante histórico conserve su texto; comprobar bloqueo de borrado tras el movimiento.

## Archivos a reemplazar respecto de la última entrega

- `controllers/inventarioController.mjs`
- `models/inventario.mjs`
- `routes/inventarioRoutes.mjs`
- `services/inventarioCatalogoService.mjs`
- `services/inventarioCrudService.mjs`
- `services/inventarioDocumentoService.mjs`
- `services/inventarioService.mjs`
- `tests/inventario-logica.mjs`
- `views/inventarioViews/editarRegistro.ejs`
- `views/inventarioViews/formularioCatalogo.ejs`
- `views/inventarioViews/formularioDevolucion.ejs`
- `views/inventarioViews/formularioMovimiento.ejs`
- `views/inventarioViews/productoDesdeDocumento.ejs`
- `views/inventarioViews/productos.ejs`
- `views/inventarioViews/similitudProducto.ejs`
