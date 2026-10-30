# Actas para firma e identificación de productos

Reemplazá los archivos de la lista siguiente respetando sus rutas. Reiniciá la aplicación y recargá con Ctrl+F5. No requiere dependencias nuevas ni cambiar tu MongoDB o .env.

## Carga de productos

Marca y modelo se cargan una sola vez en Productos → Editar. Ejemplo: nombre Router; marca MikroTik; modelo CCR2116. La descripción queda para las características adicionales. Una ficha corresponde a un modelo; los equipos físicos se distinguen por serie, MAC y patrimonio. No se repite la carga de marca/modelo por cada equipo.

Si la ficha existente tiene toda la identificación en Marca, separala: Marca = MikroTik; Modelo = CCR2116. No se extraen ni inventan datos automáticamente del nombre. En Equipos, la lista y el detalle muestran inmediatamente los datos actuales de su producto.

## Comprobante

- Destino y dirección en campos separados, y lo mismo para origen.
- Personas que entregan y reciben, con DNI del receptor identificado por separado.
- Cabecera con logo, tipo de acta, número y fecha.
- Tabla con código, nombre, marca, modelo, cantidad y unidad.
- Identificación individual por serie, MAC y patrimonio, encabezada por producto y marca/modelo.
- Espacio de firmas con aclaración y DNI de ambas partes.
- Tablas con encabezados repetibles y filas que evitan dividirse al imprimir.
- Una sola acta en pantalla: se retiró el visor PDF duplicado. Descargar/imprimir PDF permanece disponible.
- Se conservan seguimiento, adjuntos, anulaciones, documentos adicionales, devoluciones y sus permisos.

## Historial

Los nuevos movimientos guardan marca/modelo y dirección de origen junto al resto de sus datos originales. Las ediciones posteriores del catálogo no cambian estos datos del movimiento. Los comprobantes anteriores sin marca/modelo guardados muestran No registrada/No registrado; no se sustituyen por valores actuales que podrían no corresponder a su fecha. No se reescribe ningún movimiento existente ni se ejecuta una migración.

## Validación y límite

Pasaron las pruebas de plantillas y JavaScript con adaptador de EJS simulado y la lógica con adaptadores de MongoDB/Mongoose simulados. Se verifican marca/modelo guardados en el movimiento, su conservación tras editar el producto y la ausencia de visor duplicado. El diseño de impresión requiere validación con tu Puppeteer/Chromium en Windows: este entorno no tiene un navegador ejecutable disponible. No se generó ni se comprobó visualmente un PDF real aquí.

Prueba local: corregir Marca/Modelo del producto, comprobarlos en Equipos, confirmar una asignación nueva, descargar el PDF y revisar destino/dirección, tabla y firmas. Revisar también un acta anterior: no debe incorporar datos posteriores del catálogo.

## Archivos a reemplazar

- `models/inventario.mjs`
- `services/inventarioService.mjs`
- `views/inventarioViews/comprobante.ejs`
- `views/inventarioViews/equipo.ejs`
- `views/inventarioViews/equipos.ejs`
- `views/inventarioViews/movimientos.ejs`
