// controllers/cargosController.mjs
import { generarCargosMensuales } from "../services/cargosService.mjs";
// import clock from "../utils/clock.mjs";
/**
 * GET /cargos/mensual
 * Query opcional:
 *   - periodo=YYYY-MM  (genera para ese mes)
 *   - next=1           (si no pasás periodo, genera para el mes siguiente al actual)
 *   - preview=1        (simula, no persiste; devuelve JSON)
 *   - redirect=/ruta   (adónde volver en modo HTML)
 */
export async function getGenerarCargosMes(req, res) {
  try {
    const q = req.query || {};
    const preview = String(q.preview || "") === "1";

    // Resolver la fecha objetivo
    let fecha = new Date();
    if (typeof q.periodo === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(q.periodo)) {
      const [y, m] = q.periodo.split("-").map(Number);
      fecha = new Date(y, m - 1, 1);
    } else if (String(q.next || "") === "1") {
      // Mes siguiente al actual
      fecha = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1);
    } else {
      // Mes actual (primer día)
      fecha = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    }

    // Ejecutar servicio (si tu servicio soporta preview, pasalo; si no, ignóralo)
    const r = await generarCargosMensuales(fecha, { preview });

    // Si es preview => siempre JSON
    if (preview) return res.json({ ok: true, preview: true, ...r });

    // ¿El cliente “prefiere HTML”? (link/botón en navegador)
    const wantsHTML = req.accepts(["html", "json"]) === "html" || !!q.redirect;
    if (wantsHTML) {
      const msg = (r.creados > 0)
        ? `✅ Cargos ${r.periodo}: creados ${r.creados}, ya existentes ${r.existentes}.`
        : `ℹ️ Cargos ${r.periodo}: no se crearon nuevos (existentes ${r.existentes}).`;
      req.session.mensaje = msg;
      const back = q.redirect || req.get("referer") || "/proveedores";
      return res.redirect(back);
    }

    // Por defecto JSON
    return res.json({ ok: true, ...r });
  } catch (err) {
    console.error("getGenerarCargosMes error:", err);
    const wantsHTML = req.accepts(["html", "json"]) === "html";
    if (wantsHTML) {
      req.session.mensaje = "❌ Ocurrió un error generando los cargos.";
      const back = req.query?.redirect || req.get("referer") || "/proveedores";
      return res.redirect(back);
    }
    return res.status(500).json({ ok: false, error: "Error interno" });
  }
}

/**
 * POST /cargos/mensual
 * Body opcional: { periodo: "YYYY-MM" }
 * - Si no acepta JSON -> redirige con mensaje a /tareas/cargos
 * - Si acepta JSON -> devuelve JSON
 */
export async function postGenerarCargosMes(req, res) {
  try {
    // si querés permitir periodo por body, dejalo. Si no, sacá este bloque
    const { periodo } = req.body;
    let fecha = new Date();
    if (typeof periodo === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
      const [y, m] = periodo.split("-").map(Number);
      fecha = new Date(y, m - 1, 1);
    }

    const r = await generarCargosMensuales(fecha);

    // Mensaje “humano”
    req.session.mensaje = `✅ Cargos del período ${r.periodo} generados correctamente. 
${r.creados} nuevos, ${r.existentes} ya existían.`;

    // Volvemos a la vista de tareas
    return res.redirect("/tareas/cargos");
  } catch (err) {
    console.error("postGenerarCargosMes", err);
    req.session.error = "❌ Hubo un error al generar los cargos.";
    return res.redirect("/tareas/cargos");
  }
}
