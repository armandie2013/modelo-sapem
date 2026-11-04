// // controllers/viaticosController.mjs
// import fs from "fs";
// import path from "path";

// import {
//   obtenerDatosFormularioViatico,
//   obtenerUltimosViaticos,
//   obtenerTodosLosViaticos,
//   crearViatico,
//   eliminarViaticoPorId,
//   obtenerViaticoPorId,
//   obtenerPersonasDisponiblesOrdenadas,
//   actualizarViatico,
//   generarPDFViatico
// } from "../services/viaticosService.mjs";

// // ────────────────────────────────────────────────
// // Helper para leer el logo en base64 (MISMO que en proveedores)
// // ────────────────────────────────────────────────
// function leerLogoDataUriDesdeHtml() {
//   try {
//     const p = path.resolve(process.cwd(), "utils", "logoBase64.html");
//     if (!fs.existsSync(p)) return null;
//     const txt = fs.readFileSync(p, "utf8").trim();
//     const m = txt.match(/<img[^>]*src=["']([^"']+)["']/i);
//     return m && m[1] ? m[1] : txt.startsWith("data:") ? txt : null;
//   } catch (e) {
//     console.warn("No se pudo leer utils/logoBase64.html:", e?.message || e);
//     return null;
//   }
// }

// // Mostrar el formulario de creación de viáticos
// export const mostrarFormularioViatico = async (req, res) => {
//   try {
//     const { numeroDeViaje, listaDePersonasDisponibles } =
//       await obtenerDatosFormularioViatico();
//     res.render("viaticosViews/crearViatico", {
//       title: "Crear Viatico",
//       numeroDeViaje,
//       listaDePersonasDisponibles,
//     });
//   } catch (error) {
//     console.error("Error al mostrar formulario de viático:", error);
//     res.status(500).send("Error al mostrar formulario de viático");
//   }
// };

// // Crear nuevo viático
// export const crearViaticoController = async (req, res) => {
//   try {
//     await crearViatico(req, res);
//     console.log("✅ Viático creado correctamente");
//     res.redirect("/viaticos/dashboard");
//   } catch (error) {
//     console.error("❌ Error al crear el viático:", error);
//     res
//       .status(500)
//       .send({ mensaje: "Error al crear el viático", error: error.message });
//   }
// };

// // Mostrar los 5 últimos viáticos
// export const mostrarDashboardViaticos = async (req, res) => {
//   try {
//     const viaticos = await obtenerUltimosViaticos();
//     res.render("viaticosViews/dashboardViaticos", {
//       title: "Últimos Viáticos",
//       viaticos,
//       mostrarTodos: false,
//     });
//   } catch (error) {
//     console.error("Error al cargar dashboard de viáticos:", error);
//     res.status(500).send("Error al cargar el dashboard");
//   }
// };

// // Mostrar todos los viáticos
// export const mostrarTodosLosViaticos = async (req, res) => {
//   try {
//     const viaticos = await obtenerTodosLosViaticos();
//     res.render("viaticosViews/dashboardViaticos", {
//       title: "Todos los Viáticos",
//       viaticos,
//       mostrarTodos: true,
//     });
//   } catch (error) {
//     console.error("Error al cargar todos los viáticos:", error);
//     res.status(500).send("Error al cargar todos los viáticos");
//   }
// };

// // Eliminar viatico por id
// export const eliminarViaticoController = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await eliminarViaticoPorId(id);
//     console.log(`🗑️ Viático eliminado con ID: ${id}`);
//     res.redirect("/viaticos/dashboard/todos");
//   } catch (error) {
//     console.error("❌ Error al eliminar viático:", error);
//     res.status(500).send("Error al eliminar viático");
//   }
// };

// // Ver Viatico
// export const verViaticoController = async (req, res) => {
//   try {
//     const viatico = await obtenerViaticoPorId(req.params.id);
//     const listaDePersonasDisponibles = await obtenerPersonasDisponiblesOrdenadas();
//     if (!viatico) return res.status(404).send("Viático no encontrado");

//     res.render("viaticosViews/verViatico", {
//       title: "Detalle del Viático",
//       viatico,
//       listaDePersonasDisponibles,
//       soloLectura: true,
//     });
//   } catch (error) {
//     console.error("Error al mostrar viático:", error);
//     res.status(500).send("Error al mostrar viático");
//   }
// };

// // Controlador para mostrar un viático en modo edición
// export async function mostrarFormularioEditarViatico(req, res) {
//   try {
//     const viatico = await obtenerViaticoPorId(req.params.id);
//     const listaDePersonasDisponibles = await obtenerPersonasDisponiblesOrdenadas();

//     res.render("viaticosViews/editarViatico", {
//       viatico,
//       listaDePersonasDisponibles,
//     });
//   } catch (error) {
//     console.error("Error al mostrar formulario de edición:", error);
//     res.status(500).send("Error al mostrar formulario de edición");
//   }
// }

// // Controlador para actualizar un viático existente
// export async function actualizarViaticoController(req, res) {
//   try {
//     await actualizarViatico(req.params.id, req.body);
//     res.redirect("/viaticos/dashboard");
//   } catch (error) {
//     console.error("Error al actualizar viático:", error);
//     res.status(500).send("Error al actualizar viático");
//   }
// }

// // Editar viatico (si todavía lo usás, apunta igual al service)
// export async function editarViaticoController(req, res) {
//   try {
//     const { id } = req.params;
//     await actualizarViatico(id, req.body);
//     res.redirect("/viaticos/dashboard");
//   } catch (error) {
//     console.error("Error al editar viático:", error);
//     res.status(500).send("Error al editar viático");
//   }
// }

// // Generar PDF desde verViatico (Puppeteer, service)
// export const generarPDFViaticoController = async (req, res) => {
//   try {
//     const { id } = req.params;
//     // Si tu service soporta recibir logoDataUri, podrías pasarlo acá también
//     const pdfBuffer = await generarPDFViatico(id, req);

//     res.set({
//       "Content-Type": "application/pdf",
//       "Content-Disposition": `inline; filename=orden-trabajo-${id}.pdf`,
//     });

//     res.send(pdfBuffer);
//   } catch (error) {
//     console.error("Error al generar PDF del viático:", error);
//     res.status(500).send("Error al generar PDF");
//   }
// };

// // Renderizar y mostrar verViaticoPdf (preview HTML)
// export async function mostrarVistaPDF(req, res) {
//   const { id } = req.params;
//   try {
//     const viatico = await obtenerViaticoPorId(id);
//     if (!viatico) return res.status(404).send("Viático no encontrado");

//     // ✅ MISMO MECANISMO QUE EN PROVEEDOR: logoDataUri desde utils/logoBase64.html
//     const logoDataUri = leerLogoDataUriDesdeHtml();

//     res.render("viaticosViews/verViaticoPdf", {
//       viatico,
//       logoDataUri,
//       layout: false,
//     });
//   } catch (error) {
//     console.error("Error al cargar vista PDF de viático:", error);
//     res.status(500).send("Error al cargar PDF");
//   }
// }

// // controllers/viaticosController.mjs
// import fs from "fs";
// import path from "path";

// import {
//   obtenerDatosFormularioViatico,
//   obtenerUltimosViaticos,
//   obtenerTodosLosViaticos,
//   crearViatico,
//   eliminarViaticoPorId,
//   obtenerViaticoPorId,
//   obtenerPersonasDisponiblesOrdenadas,
//   actualizarViatico,
//   generarPDFViatico
// } from "../services/viaticosService.mjs";

// // ────────────────────────────────────────────────
// // Helper para leer el logo en base64 (MISMO que en proveedores)
// // ────────────────────────────────────────────────
// function leerLogoDataUriDesdeHtml() {
//   try {
//     const p = path.resolve(process.cwd(), "utils", "logoBase64.html");
//     if (!fs.existsSync(p)) return null;
//     const txt = fs.readFileSync(p, "utf8").trim();
//     const m = txt.match(/<img[^>]*src=["']([^"']+)["']/i);
//     return m && m[1] ? m[1] : txt.startsWith("data:") ? txt : null;
//   } catch (e) {
//     console.warn("No se pudo leer utils/logoBase64.html:", e?.message || e);
//     return null;
//   }
// }

// // Mostrar el formulario de creación de viáticos
// export const mostrarFormularioViatico = async (req, res) => {
//   try {
//     const { numeroDeViaje, listaDePersonasDisponibles } =
//       await obtenerDatosFormularioViatico();

//     res.render("viaticosViews/crearViatico", {
//       title: "Crear Viatico",
//       numeroDeViaje,
//       listaDePersonasDisponibles,
//     });
//   } catch (error) {
//     console.error("Error al mostrar formulario de viático:", error);
//     res.status(500).send("Error al mostrar formulario de viático");
//   }
// };

// // Crear nuevo viático
// export const crearViaticoController = async (req, res) => {
//   try {
//     const nuevoViatico = await crearViatico(req, res);
//     const id = nuevoViatico._id.toString();
//     console.log("✅ Viático creado correctamente, ID:", id);

//     // 🔹 Devolvemos una página mínima que:
//     //    1) abre el PDF en una nueva pestaña
//     //    2) redirige la pestaña actual al dashboard
//     res.send(`<!DOCTYPE html>
// <html lang="es">
// <head>
//   <meta charset="utf-8" />
//   <title>Generando viático...</title>
// </head>
// <body>
//   <script>
//     // Abre el PDF en otra pestaña
//     window.open('/viaticos/${id}/pdf', '_blank');
//     // Vuelve esta pestaña al dashboard
//     window.location.href = '/viaticos/dashboard';
//   </script>
// </body>
// </html>`);
//   } catch (error) {
//     console.error("❌ Error al crear el viático:", error);
//     res
//       .status(500)
//       .send({ mensaje: "Error al crear el viático", error: error.message });
//   }
// };

// // Mostrar los 10 últimos viáticos
// export const mostrarDashboardViaticos = async (req, res) => {
//   try {
//     const viaticos = await obtenerUltimosViaticos();
//     res.render("viaticosViews/dashboardViaticos", {
//       title: "Últimos Viáticos",
//       viaticos,
//       mostrarTodos: false,
//     });
//   } catch (error) {
//     console.error("Error al cargar dashboard de viáticos:", error);
//     res.status(500).send("Error al cargar el dashboard");
//   }
// };

// // Mostrar todos los viáticos
// export const mostrarTodosLosViaticos = async (req, res) => {
//   try {
//     const viaticos = await obtenerTodosLosViaticos();
//     res.render("viaticosViews/dashboardViaticos", {
//       title: "Todos los Viáticos",
//       viaticos,
//       mostrarTodos: true,
//     });
//   } catch (error) {
//     console.error("Error al cargar todos los viáticos:", error);
//     res.status(500).send("Error al cargar todos los viáticos");
//   }
// };

// // Eliminar viatico por id
// export const eliminarViaticoController = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await eliminarViaticoPorId(id);
//     console.log(`🗑️ Viático eliminado con ID: ${id}`);
//     res.redirect("/viaticos/dashboard/todos");
//   } catch (error) {
//     console.error("❌ Error al eliminar viático:", error);
//     res.status(500).send("Error al eliminar viático");
//   }
// };

// // Ver Viatico
// export const verViaticoController = async (req, res) => {
//   try {
//     const viatico = await obtenerViaticoPorId(req.params.id);
//     const listaDePersonasDisponibles = await obtenerPersonasDisponiblesOrdenadas();
//     if (!viatico) return res.status(404).send("Viático no encontrado");

//     res.render("viaticosViews/verViatico", {
//       title: "Detalle del Viático",
//       viatico,
//       listaDePersonasDisponibles,
//       soloLectura: true,
//     });
//   } catch (error) {
//     console.error("Error al mostrar viático:", error);
//     res.status(500).send("Error al mostrar viático");
//   }
// };

// // Controlador para mostrar un viático en modo edición
// export async function mostrarFormularioEditarViatico(req, res) {
//   try {
//     const viatico = await obtenerViaticoPorId(req.params.id);
//     const listaDePersonasDisponibles = await obtenerPersonasDisponiblesOrdenadas();

//     res.render("viaticosViews/editarViatico", {
//       viatico,
//       listaDePersonasDisponibles,
//     });
//   } catch (error) {
//     console.error("Error al mostrar formulario de edición:", error);
//     res.status(500).send("Error al mostrar formulario de edición");
//   }
// }

// // Controlador para actualizar un viático existente
// export async function actualizarViaticoController(req, res) {
//   try {
//     await actualizarViatico(req.params.id, req.body);
//     res.redirect("/viaticos/dashboard");
//   } catch (error) {
//     console.error("Error al actualizar viático:", error);
//     res.status(500).send("Error al actualizar viático");
//   }
// }

// // Editar viatico (si todavía lo usás, apunta igual al service)
// export async function editarViaticoController(req, res) {
//   try {
//     const { id } = req.params;
//     await actualizarViatico(id, req.body);
//     res.redirect("/viaticos/dashboard");
//   } catch (error) {
//     console.error("Error al editar viático:", error);
//     res.status(500).send("Error al editar viático");
//   }
// }

// // Generar PDF desde verViatico (Puppeteer, service)
// export const generarPDFViaticoController = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const pdfBuffer = await generarPDFViatico(id, req);

//     res.set({
//       "Content-Type": "application/pdf",
//       "Content-Disposition": `inline; filename=orden-trabajo-${id}.pdf`,
//     });

//     res.send(pdfBuffer);
//   } catch (error) {
//     console.error("Error al generar PDF del viático:", error);
//     res.status(500).send("Error al generar PDF");
//   }
// };

// // Renderizar y mostrar verViaticoPdf (preview HTML)
// export async function mostrarVistaPDF(req, res) {
//   const { id } = req.params;
//   try {
//     const viatico = await obtenerViaticoPorId(id);
//     if (!viatico) return res.status(404).send("Viático no encontrado");

//     const logoDataUri = leerLogoDataUriDesdeHtml();

//     res.render("viaticosViews/verViaticoPdf", {
//       viatico,
//       logoDataUri,
//       layout: false,
//     });
//   } catch (error) {
//     console.error("Error al cargar vista PDF de viático:", error);
//     res.status(500).send("Error al cargar PDF");
//   }
// }



// LO DE ARRIBA NO BORRAR HASTA ESTAR SEGURO DE QUE LO DE ABAJO FUNCIONA BIEN //


// // controllers/viaticosController.mjs
// import fs from "fs";
// import path from "path";

// import {
//   obtenerDatosFormularioViatico,
//   obtenerUltimosViaticos,
//   obtenerTodosLosViaticos,
//   crearViatico,
//   eliminarViaticoPorId,
//   obtenerViaticoPorId,
//   obtenerPersonasDisponiblesOrdenadas,
//   actualizarViatico,
//   generarPDFViatico
// } from "../services/viaticosService.mjs";

// // ────────────────────────────────────────────────
// // Helper para leer el logo en base64 desde utils/logoBase64.html
// // ────────────────────────────────────────────────
// function leerLogoDataUriDesdeHtml() {
//   try {
//     const p = path.resolve(process.cwd(), "utils", "logoBase64.html");
//     if (!fs.existsSync(p)) return null;
//     const txt = fs.readFileSync(p, "utf8").trim();
//     const m = txt.match(/<img[^>]*src=["']([^"']+)["']/i);
//     return m && m[1] ? m[1] : txt.startsWith("data:") ? txt : null;
//   } catch (e) {
//     console.warn("No se pudo leer utils/logoBase64.html:", e?.message || e);
//     return null;
//   }
// }

// // ────────────────────────────────────────────────
// // Mostrar Formulario de Creación
// // ────────────────────────────────────────────────
// export const mostrarFormularioViatico = async (req, res) => {
//   try {
//     const { numeroDeViaje, listaDePersonasDisponibles } =
//       await obtenerDatosFormularioViatico();

//     res.render("viaticosViews/crearViatico", {
//       title: "Crear Viático",
//       numeroDeViaje,
//       listaDePersonasDisponibles,
//     });
//   } catch (error) {
//     console.error("Error al mostrar formulario de viático:", error);
//     res.status(500).send("Error al mostrar formulario de viático");
//   }
// };

// // ────────────────────────────────────────────────
// // Crear un nuevo viático
// // ABRIR PDF SIEMPRE en pestaña nueva + FALLBACK visible
// // ────────────────────────────────────────────────
// export const crearViaticoController = async (req, res) => {
//   try {
//     const nuevoViatico = await crearViatico(req, res);

//     if (!nuevoViatico || !nuevoViatico._id) {
//       return res.redirect("/viaticos/dashboard");
//     }

//     const id = nuevoViatico._id.toString();
//     console.log("✅ Viático creado con ID:", id);

//     // Página mínima que intenta abrir el PDF en pestaña nueva
//     // y, si está bloqueado, muestra botón para abrirlo manualmente.
//     res.send(`<!DOCTYPE html>
// <html lang="es">
// <head>
//   <meta charset="utf-8" />
//   <title>Generando viático...</title>
//   <style>
//     body {
//       font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
//       margin: 0;
//       padding: 0;
//       background: #f3f4f6;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       min-height: 100vh;
//     }
//     .card {
//       background: #ffffff;
//       border-radius: 0.75rem;
//       padding: 1.75rem 1.5rem;
//       box-shadow: 0 10px 25px rgba(15,23,42,0.12);
//       max-width: 420px;
//       width: 100%;
//       text-align: center;
//       border: 1px solid #e5e7eb;
//     }
//     h1 {
//       font-size: 1.1rem;
//       margin-bottom: 0.5rem;
//       color: #111827;
//     }
//     p {
//       font-size: 0.85rem;
//       color: #4b5563;
//       margin: 0.35rem 0;
//     }
//     .btn {
//       display: inline-flex;
//       align-items: center;
//       justify-content: center;
//       margin-top: 1rem;
//       padding: 0.5rem 1.2rem;
//       font-size: 0.85rem;
//       border-radius: 9999px;
//       border: none;
//       cursor: pointer;
//       background: #4f46e5;
//       color: #ffffff;
//     }
//     .btn:hover {
//       background: #4338ca;
//     }
//     .small {
//       font-size: 0.75rem;
//       color: #6b7280;
//       margin-top: 0.75rem;
//     }
//     .hidden {
//       display: none;
//     }
//   </style>
// </head>
// <body>
//   <div class="card">
//     <h1>Generando viático…</h1>
//     <p>Intentando abrir el PDF en una pestaña nueva.</p>
//     <p id="msgPopup" class="small hidden">
//       Parece que el navegador bloqueó la ventana emergente.<br/>
//       Hacé clic en el botón de abajo para abrir el PDF manualmente.
//     </p>

//     <button id="btnAbrirPdf" class="btn hidden" type="button">
//       Abrir PDF
//     </button>

//     <p class="small">
//       Luego vas a ser redirigido al dashboard de viáticos.
//     </p>
//   </div>

//   <script>
//     (function () {
//       var pdfURL = '/viaticos/${id}/pdf';
//       var dashboardURL = '/viaticos/dashboard';
//       var msgPopup = document.getElementById('msgPopup');
//       var btnAbrir = document.getElementById('btnAbrirPdf');

//       // 1) Intentar abrir en pestaña nueva automáticamente
//       var nuevaPestana = window.open(pdfURL, '_blank');

//       var popupBloqueado =
//         !nuevaPestana ||
//         nuevaPestana.closed ||
//         typeof nuevaPestana.closed === 'undefined';

//       if (popupBloqueado) {
//         // No redirigimos todavía: mostramos mensaje + botón
//         console.warn('Popup bloqueada: el usuario deberá abrir el PDF manualmente.');
//         if (msgPopup) msgPopup.classList.remove('hidden');
//         if (btnAbrir) {
//           btnAbrir.classList.remove('hidden');
//           btnAbrir.addEventListener('click', function () {
//             var win = window.open(pdfURL, '_blank');
//             // Aunque volviera a bloquear, igual navegamos al dashboard
//             window.location.href = dashboardURL;
//           });
//         }
//       } else {
//         // Si la pestaña se abrió bien, redirigimos enseguida al dashboard
//         window.location.href = dashboardURL;
//       }
//     })();
//   </script>
// </body>
// </html>`);
//   } catch (error) {
//     console.error("❌ Error al crear el viático:", error);
//     res.status(500).send("Error al crear el viático");
//   }
// };

// // ────────────────────────────────────────────────
// // Dashboard últimos 10
// // ────────────────────────────────────────────────
// export const mostrarDashboardViaticos = async (req, res) => {
//   try {
//     const viaticos = await obtenerUltimosViaticos();
//     res.render("viaticosViews/dashboardViaticos", {
//       title: "Últimos Viáticos",
//       viaticos,
//       mostrarTodos: false,
//     });
//   } catch (error) {
//     console.error("Error al cargar dashboard de viáticos:", error);
//     res.status(500).send("Error al cargar el dashboard");
//   }
// };

// // ────────────────────────────────────────────────
// // Todos los viáticos
// // ────────────────────────────────────────────────
// export const mostrarTodosLosViaticos = async (req, res) => {
//   try {
//     const viaticos = await obtenerTodosLosViaticos();
//     res.render("viaticosViews/dashboardViaticos", {
//       title: "Todos los Viáticos",
//       viaticos,
//       mostrarTodos: true,
//     });
//   } catch (error) {
//     console.error("Error al cargar todos los viáticos:", error);
//     res.status(500).send("Error al cargar todos los viáticos");
//   }
// };

// // ────────────────────────────────────────────────
// // Eliminar viático
// // ────────────────────────────────────────────────
// export const eliminarViaticoController = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await eliminarViaticoPorId(id);
//     console.log("🗑️ Viático eliminado:", id);
//     res.redirect("/viaticos/dashboard/todos");
//   } catch (error) {
//     console.error("❌ Error al eliminar viático:", error);
//     res.status(500).send("Error al eliminar viático");
//   }
// };

// // ────────────────────────────────────────────────
// // Ver viático (solo lectura)
// // ────────────────────────────────────────────────
// export const verViaticoController = async (req, res) => {
//   try {
//     const viatico = await obtenerViaticoPorId(req.params.id);
//     const listaDePersonasDisponibles = await obtenerPersonasDisponiblesOrdenadas();
//     if (!viatico) return res.status(404).send("Viático no encontrado");

//     res.render("viaticosViews/verViatico", {
//       title: "Detalle del Viático",
//       viatico,
//       listaDePersonasDisponibles,
//       soloLectura: true,
//     });
//   } catch (error) {
//     console.error("Error al mostrar viático:", error);
//     res.status(500).send("Error al mostrar viático");
//   }
// };

// // ────────────────────────────────────────────────
// // Editar viático - Form
// // ────────────────────────────────────────────────
// export async function mostrarFormularioEditarViatico(req, res) {
//   try {
//     const viatico = await obtenerViaticoPorId(req.params.id);
//     const listaDePersonasDisponibles = await obtenerPersonasDisponiblesOrdenadas();

//     res.render("viaticosViews/editarViatico", {
//       viatico,
//       listaDePersonasDisponibles,
//     });
//   } catch (error) {
//     console.error("Error al mostrar formulario de edición:", error);
//     res.status(500).send("Error al mostrar formulario de edición");
//   }
// }

// // ────────────────────────────────────────────────
// // Editar viático - Guardar cambios
// // ────────────────────────────────────────────────
// export async function actualizarViaticoController(req, res) {
//   try {
//     await actualizarViatico(req.params.id, req.body);
//     res.redirect("/viaticos/dashboard");
//   } catch (error) {
//     console.error("Error al actualizar viático:", error);
//     res.status(500).send("Error al actualizar viático");
//   }
// }

// // Alias (por compatibilidad)
// export async function editarViaticoController(req, res) {
//   try {
//     const { id } = req.params;
//     await actualizarViatico(id, req.body);
//     res.redirect("/viaticos/dashboard");
//   } catch (error) {
//     console.error("Error al editar viático:", error);
//     res.status(500).send("Error al editar viático");
//   }
// }

// // ────────────────────────────────────────────────
// // PDF en línea (Puppeteer)
// // ────────────────────────────────────────────────
// export const generarPDFViaticoController = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const pdfBuffer = await generarPDFViatico(id, req);

//     res.set({
//       "Content-Type": "application/pdf",
//       "Content-Disposition": `inline; filename=orden-trabajo-${id}.pdf`,
//     });

//     res.send(pdfBuffer);
//   } catch (error) {
//     console.error("Error al generar PDF del viático:", error);
//     res.status(500).send("Error al generar PDF");
//   }
// };

// // ────────────────────────────────────────────────
// // Vista HTML previa del PDF
// // ────────────────────────────────────────────────
// export async function mostrarVistaPDF(req, res) {
//   const { id } = req.params;
//   try {
//     const viatico = await obtenerViaticoPorId(id);
//     if (!viatico) return res.status(404).send("Viático no encontrado");

//     const logoDataUri = leerLogoDataUriDesdeHtml();

//     res.render("viaticosViews/verViaticoPdf", {
//       viatico,
//       logoDataUri,
//       layout: false,
//     });
//   } catch (error) {
//     console.error("Error al cargar vista PDF de viático:", error);
//     res.status(500).send("Error al cargar PDF");
//   }
// }



// controllers/viaticosController.mjs
import fs from "fs";
import path from "path";

import {
  obtenerDatosFormularioViatico,
  obtenerUltimosViaticos,
  obtenerTodosLosViaticos,
  crearViatico,
  eliminarViaticoPorId,
  obtenerViaticoPorId,
  obtenerPersonasDisponiblesOrdenadas,
  actualizarViatico,
  generarPDFViatico
} from "../services/viaticosService.mjs";

// ────────────────────────────────────────────────
// Helper para leer el logo en base64 desde utils/logoBase64.html
// ────────────────────────────────────────────────
function leerLogoDataUriDesdeHtml() {
  try {
    const p = path.resolve(process.cwd(), "utils", "logoBase64.html");
    if (!fs.existsSync(p)) return null;
    const txt = fs.readFileSync(p, "utf8").trim();
    const m = txt.match(/<img[^>]*src=["']([^"']+)["']/i);
    return m && m[1] ? m[1] : txt.startsWith("data:") ? txt : null;
  } catch (e) {
    console.warn("No se pudo leer utils/logoBase64.html:", e?.message || e);
    return null;
  }
}

// ────────────────────────────────────────────────
// Helper: normalizar texto (minúsculas + sin tildes)
// ────────────────────────────────────────────────
function normalizarTexto(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ────────────────────────────────────────────────
// Helper: obtener fecha ISO (YYYY-MM-DD) desde un campo fecha
// ────────────────────────────────────────────────
function obtenerFechaISO(d) {
  if (!d) return null;
  try {
    const dateObj = d instanceof Date ? d : new Date(d);
    if (isNaN(dateObj.getTime())) return null;
    return dateObj.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────
// Helper: construir filtros a partir de req.query
// Devuelve:
//  - hayFiltros (bool)
//  - filtroFn(viatico) → bool
//  - queryLimpia (para reenviar a la vista)
// ────────────────────────────────────────────────
function construirFiltrosDesdeQuery(queryRaw = {}) {
  const queryLimpia = {
    viajante: (queryRaw.viajante || "").trim(),
    destino: (queryRaw.destino || "").trim(),
    creador: (queryRaw.creador || "").trim(),
    desde: (queryRaw.desde || "").trim(),
    hasta: (queryRaw.hasta || "").trim()
  };

  const hayFiltros = !!(
    queryLimpia.viajante ||
    queryLimpia.destino ||
    queryLimpia.creador ||
    queryLimpia.desde ||
    queryLimpia.hasta
  );

  if (!hayFiltros) {
    return {
      hayFiltros: false,
      filtroFn: () => true,
      queryLimpia
    };
  }

  const vVia = normalizarTexto(queryLimpia.viajante);
  const vDes = normalizarTexto(queryLimpia.destino);
  const vCre = normalizarTexto(queryLimpia.creador);
  const fechaDesde = queryLimpia.desde || null;
  const fechaHasta = queryLimpia.hasta || null;

  function filtroFn(viatico) {
    // Viajante
    if (vVia) {
      const lista = Array.isArray(viatico.viajantes) ? viatico.viajantes : [];
      const hayCoincidencia = lista.some(vj =>
        normalizarTexto(vj?.nombre || "").includes(vVia)
      );
      if (!hayCoincidencia) return false;
    }

    // Destino
    if (vDes) {
      const txtDestino = normalizarTexto(viatico.destino || "");
      if (!txtDestino.includes(vDes)) return false;
    }

    // Creado por
    if (vCre) {
      const txtCreador = normalizarTexto(viatico.creadoPor || "");
      if (!txtCreador.includes(vCre)) return false;
    }

    // Fechas
    if (fechaDesde || fechaHasta) {
      const iso = obtenerFechaISO(viatico.fechaDeCreacion) || "";
      if (!iso) return false;

      if (fechaDesde && iso < fechaDesde) return false;
      if (fechaHasta && iso > fechaHasta) return false;
    }

    return true;
  }

  return { hayFiltros, filtroFn, queryLimpia };
}

// ────────────────────────────────────────────────
// Mostrar Formulario de Creación
// ────────────────────────────────────────────────
export const mostrarFormularioViatico = async (req, res) => {
  try {
    const { numeroDeViaje, listaDePersonasDisponibles } =
      await obtenerDatosFormularioViatico();

    res.render("viaticosViews/crearViatico", {
      title: "Crear orden de trabajo",
      numeroDeViaje,
      listaDePersonasDisponibles
    });
  } catch (error) {
    console.error("Error al mostrar formulario de viático:", error);
    res.status(500).send("Error al mostrar formulario de orden de trabajo");
  }
};

// ────────────────────────────────────────────────
// Crear un nuevo viático
// ABRIR PDF SIEMPRE en pestaña nueva + FALLBACK visible
// ────────────────────────────────────────────────
export const crearViaticoController = async (req, res) => {
  try {
    const nuevoViatico = await crearViatico(req, res);

    if (!nuevoViatico || !nuevoViatico._id) {
      return res.redirect("/viaticos/dashboard");
    }

    const id = nuevoViatico._id.toString();
    console.log("✅ Viático creado con ID:", id);

    // Página mínima que intenta abrir el PDF en pestaña nueva
    // y, si está bloqueado, muestra botón para abrirlo manualmente.
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Generando orden de trabajo...</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 0;
      padding: 0;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #ffffff;
      border-radius: 0.75rem;
      padding: 1.75rem 1.5rem;
      box-shadow: 0 10px 25px rgba(15,23,42,0.12);
      max-width: 420px;
      width: 100%;
      text-align: center;
      border: 1px solid #e5e7eb;
    }
    h1 {
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
      color: #111827;
    }
    p {
      font-size: 0.85rem;
      color: #4b5563;
      margin: 0.35rem 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-top: 1rem;
      padding: 0.5rem 1.2rem;
      font-size: 0.85rem;
      border-radius: 9999px;
      border: none;
      cursor: pointer;
      background: #4f46e5;
      color: #ffffff;
    }
    .btn:hover {
      background: #4338ca;
    }
    .small {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.75rem;
    }
    .hidden {
      display: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Generando orden de trabajo…</h1>
    <p>Intentando abrir el PDF en una pestaña nueva.</p>
    <p id="msgPopup" class="small hidden">
      Parece que el navegador bloqueó la ventana emergente.<br/>
      Hacé clic en el botón de abajo para abrir el PDF manualmente.
    </p>

    <button id="btnAbrirPdf" class="btn hidden" type="button">
      Abrir PDF
    </button>

    <p class="small">
      Luego vas a ser redirigido al dashboard de órdenes de trabajo.
    </p>
  </div>

  <script>
    (function () {
      var pdfURL = '/viaticos/${id}/pdf';
      var dashboardURL = '/viaticos/dashboard';
      var msgPopup = document.getElementById('msgPopup');
      var btnAbrir = document.getElementById('btnAbrirPdf');

      // 1) Intentar abrir en pestaña nueva automáticamente
      var nuevaPestana = window.open(pdfURL, '_blank');

      var popupBloqueado =
        !nuevaPestana ||
        nuevaPestana.closed ||
        typeof nuevaPestana.closed === 'undefined';

      if (popupBloqueado) {
        // No redirigimos todavía: mostramos mensaje + botón
        console.warn('Popup bloqueada: el usuario deberá abrir el PDF manualmente.');
        if (msgPopup) msgPopup.classList.remove('hidden');
        if (btnAbrir) {
          btnAbrir.classList.remove('hidden');
          btnAbrir.addEventListener('click', function () {
            var win = window.open(pdfURL, '_blank');
            // Aunque volviera a bloquear, igual navegamos al dashboard
            window.location.href = dashboardURL;
          });
        }
      } else {
        // Si la pestaña se abrió bien, redirigimos enseguida al dashboard
        window.location.href = dashboardURL;
      }
    })();
  </script>
</body>
</html>`);
  } catch (error) {
    console.error("❌ Error al crear el viático:", error);
    res.status(500).send("Error al crear la orden de trabajo");
  }
};

// ────────────────────────────────────────────────
// Dashboard últimos viáticos / con filtros
// ────────────────────────────────────────────────
export const mostrarDashboardViaticos = async (req, res) => {
  try {
    const { hayFiltros, filtroFn, queryLimpia } = construirFiltrosDesdeQuery(
      req.query || {}
    );

    let viaticos;

    if (hayFiltros) {
      // Con filtros: buscamos en TODOS y filtramos en memoria
      const todos = await obtenerTodosLosViaticos();
      viaticos = (todos || []).filter(filtroFn);
    } else {
      // Sin filtros: solo últimos (como antes)
      viaticos = await obtenerUltimosViaticos();
    }

    res.render("viaticosViews/dashboardViaticos", {
      title: hayFiltros ? "Órdenes de trabajo filtradas" : "Últimas órdenes de trabajo",
      viaticos,
      mostrarTodos: hayFiltros, // si hay filtros, mostramos como "modo todos"
      query: queryLimpia
    });
  } catch (error) {
    console.error("Error al cargar dashboard de viáticos:", error);
    res.status(500).send("Error al cargar el dashboard");
  }
};

// ────────────────────────────────────────────────
// Todos los viáticos (lista completa + filtros)
// ────────────────────────────────────────────────
export const mostrarTodosLosViaticos = async (req, res) => {
  try {
    const { hayFiltros, filtroFn, queryLimpia } = construirFiltrosDesdeQuery(
      req.query || {}
    );

    const todos = await obtenerTodosLosViaticos();
    const viaticos = hayFiltros ? (todos || []).filter(filtroFn) : todos;

    res.render("viaticosViews/dashboardViaticos", {
      title: "Todas las órdenes de trabajo",
      viaticos,
      mostrarTodos: true,
      query: queryLimpia
    });
  } catch (error) {
    console.error("Error al cargar todos los viáticos:", error);
    res.status(500).send("Error al cargar todos las órdenes de trabajo");
  }
};

// ────────────────────────────────────────────────
// Eliminar viático
// ────────────────────────────────────────────────
export const eliminarViaticoController = async (req, res) => {
  try {
    const { id } = req.params;
    await eliminarViaticoPorId(id);
    console.log("🗑️ Viático eliminado:", id);
    res.redirect("/viaticos/dashboard/todos");
  } catch (error) {
    console.error("❌ Error al eliminar viático:", error);
    res.status(500).send("Error al eliminar orden de trabajo");
  }
};

// ────────────────────────────────────────────────
// Ver viático (solo lectura)
// ────────────────────────────────────────────────
export const verViaticoController = async (req, res) => {
  try {
    const viatico = await obtenerViaticoPorId(req.params.id);
    const listaDePersonasDisponibles = await obtenerPersonasDisponiblesOrdenadas();
    if (!viatico) return res.status(404).send("Orden de trabajo no encontrada");

    res.render("viaticosViews/verViatico", {
      title: "Detalle de la orden de trabajo",
      viatico,
      listaDePersonasDisponibles,
      soloLectura: true
    });
  } catch (error) {
    console.error("Error al mostrar viático:", error);
    res.status(500).send("Error al mostrar orden de trabajo");
  }
};

// ────────────────────────────────────────────────
// Editar viático - Form
// ────────────────────────────────────────────────
export async function mostrarFormularioEditarViatico(req, res) {
  try {
    const viatico = await obtenerViaticoPorId(req.params.id);
    const listaDePersonasDisponibles = await obtenerPersonasDisponiblesOrdenadas();

    res.render("viaticosViews/editarViatico", {
      viatico,
      listaDePersonasDisponibles
    });
  } catch (error) {
    console.error("Error al mostrar formulario de edición:", error);
    res.status(500).send("Error al mostrar formulario de edición");
  }
}

// ────────────────────────────────────────────────
// Editar viático - Guardar cambios
// ────────────────────────────────────────────────
export async function actualizarViaticoController(req, res) {
  try {
    await actualizarViatico(req.params.id, req.body);
    res.redirect("/viaticos/dashboard");
  } catch (error) {
    console.error("Error al actualizar viático:", error);
    res.status(500).send("Error al actualizar orden de trabajo");
  }
}

// Alias (por compatibilidad)
export async function editarViaticoController(req, res) {
  try {
    const { id } = req.params;
    await actualizarViatico(id, req.body);
    res.redirect("/viaticos/dashboard");
  } catch (error) {
    console.error("Error al editar viático:", error);
    res.status(500).send("Error al editar orden de trabajo");
  }
}

// ────────────────────────────────────────────────
// PDF en línea (Puppeteer)
// ────────────────────────────────────────────────
export const generarPDFViaticoController = async (req, res) => {
  try {
    const { id } = req.params;
    const pdfBuffer = await generarPDFViatico(id, req);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=orden-trabajo-${id}.pdf`
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error al generar PDF del viático:", error);
    res.status(500).send("Error al generar PDF");
  }
};

// ────────────────────────────────────────────────
// Vista HTML previa del PDF
// ────────────────────────────────────────────────
export async function mostrarVistaPDF(req, res) {
  const { id } = req.params;
  try {
    const viatico = await obtenerViaticoPorId(id);
    if (!viatico) return res.status(404).send("Orden de trabajo no encontrada");

    const logoDataUri = leerLogoDataUriDesdeHtml();

    res.render("viaticosViews/verViaticoPdf", {
      viatico,
      logoDataUri,
      layout: false
    });
  } catch (error) {
    console.error("Error al cargar vista PDF de viático:", error);
    res.status(500).send("Error al cargar PDF");
  }
}
