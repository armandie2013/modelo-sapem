// middlewares/usdNavbar.mjs
import { getUsdDiaAnteriorConFallback } from "../services/cambioService.mjs";

/**
 * Inyecta en res.locals.usdAyer = { fecha, tipoCotizacion } | null
 * Mostramos la cotización del DÍA ANTERIOR con fallback (fines de semana/feriados).
 */
export async function usdNavbarMiddleware(req, res, next) {
  try {
    const found = await getUsdDiaAnteriorConFallback();
    // Queremos que la fecha que muestres sea la realmente encontrada (no la solicitada)
    res.locals.usdAyer = found?.cotizacion
      ? { fecha: found.encontradoEn || found.cotizacion.fecha, tipoCotizacion: found.cotizacion.tipoCotizacion }
      : null;
  } catch (e) {
    console.error("usdNavbarMiddleware error:", e?.message || e);
    res.locals.usdAyer = null;
  }
  next();
}
