// controllers/cambioController.mjs
import {
  getUsdUltima,
  getUsdPorFecha,
  getUsdPorFechaConFallback,
} from "../services/cambioService.mjs";

function isValidISODate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !isNaN(d.getTime()) && s === d.toISOString().slice(0, 10);
}

/**
 * GET /api/cambio/usd
 * GET /api/cambio/usd?fecha=YYYY-MM-DD
 * GET /api/cambio/usd?fecha=YYYY-MM-DD&fallback=false
 * GET /api/cambio/usd?fecha=YYYY-MM-DD&fallback=true&maxDias=14
 */
export async function obtenerUsd(req, res) {
  try {
    const { fecha, fallback = "true", maxDias } = req.query;

    if (fecha && !isValidISODate(fecha)) {
      return res.status(400).json({ ok: false, error: "Formato de fecha inválido (YYYY-MM-DD)" });
    }

    // Sin fecha: última publicada
    if (!fecha) {
      const data = await getUsdUltima();
      return res.json({ ok: true, data });
    }

    // Sin fallback: puede devolver null si ese día no hubo publicación
    if (fallback === "false") {
      const data = await getUsdPorFecha(fecha);
      return res.json({ ok: true, data });
    }

    // Con fallback hacia atrás
    const found = await getUsdPorFechaConFallback(fecha, maxDias ? Number(maxDias) : undefined);
    if (!found) return res.json({ ok: true, data: null });

    return res.json({
      ok: true,
      data: found.cotizacion, // { fecha, tipoCotizacion }
      meta: {
        fechaSolicitada: found.fechaSolicitada,
        encontradoEn: found.encontradoEn,
        fallback: true,
      },
    });
  } catch (err) {
    console.error("obtenerUsd error:", err?.message || err);
    return res.status(502).json({ ok: false, error: "No se pudo obtener la cotización" });
  }
}
