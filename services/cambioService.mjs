// services/cambioService.mjs
// Servicio de cotizaciones con parse robusto y fallback histórico

import { httpGet } from "./http.mjs";
import clock from "../utils/clock.mjs";

/**
 * Formato esperado (resumen):
 * {
 *   status: 200,
 *   results: [
 *     {
 *       fecha: "YYYY-MM-DD",
 *       detalle: [
 *         { codigoMoneda: "USD", descripcion: "DOLAR E.E.U.U.", tipoCotizacion: 1234.56 }
 *       ]
 *     }
 *   ]
 * }
 */

function parseBcraUsdResponse(data) {
  // Si la API devolvió "n/d" o vacío, tratamos como null
  if (data == null || (typeof data === "string" && data.trim().toLowerCase() === "n/d")) {
    return null;
  }

  const results = data?.results;
  if (!Array.isArray(results) || results.length === 0) return null;

  for (const r of results) {
    const fecha = typeof r?.fecha === "string" ? r.fecha.slice(0, 10) : null;
    const detalle = Array.isArray(r?.detalle) ? r.detalle : [];

    const item =
      detalle.find((d) => String(d?.codigoMoneda || "").toUpperCase() === "USD") ||
      detalle.find((d) => /D[ÓO]LAR/.test(String(d?.descripcion || "").toUpperCase())) ||
      detalle.find((d) => d && d.tipoCotizacion !== undefined && d.tipoCotizacion !== null);

    if (item && item.tipoCotizacion != null) {
      const tipo = Number(item.tipoCotizacion);
      if (!Number.isNaN(tipo)) {
        return {
          fecha: fecha || toLocalISO(clock.date()),
          tipoCotizacion: tipo,
        };
      }
    }
  }
  return null;
}

function toLocalISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ayerISO() {
  const now = clock.date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return toLocalISO(d);
}

/** Última cotización publicada (puede ser HOY si ya publicaron) */
export async function getUsdUltima() {
  const { data } = await httpGet("/Cotizaciones/USD", {
    cacheTtlMs: Number(process.env.CAMBIO_CACHE_TTL_MS || 30_000),
  });
  return parseBcraUsdResponse(data);
}

/** Cotización USD para una fecha exacta (puede devolver null si no hubo publicación ese día) */
export async function getUsdPorFecha(fechaISO) {
  const { data } = await httpGet("/Cotizaciones/USD", {
    params: { fechadesde: fechaISO, fechahasta: fechaISO },
    cacheTtlMs: Number(process.env.CAMBIO_CACHE_TTL_MS || 30_000),
  });
  return parseBcraUsdResponse(data);
}

/**
 * Intenta fecha exacta y, si no hay, retrocede 1 día hasta `maxDias` (por defecto 7).
 * Devuelve: { fechaSolicitada, encontradoEn, cotizacion } o null
 */
export async function getUsdPorFechaConFallback(
  fechaISO,
  maxDias = Number(process.env.USD_MAX_FALLBACK_DAYS || 7)
) {
  const [Y, M, D] = String(fechaISO).split("-").map((n) => Number(n));
  if (!Y || !M || !D) throw new Error("Fecha inválida");

  let attempts = 0;
  let d = new Date(Y, M - 1, D);

  while (attempts <= maxDias) {
    const iso = toLocalISO(d);
    const cot = await getUsdPorFecha(iso);
    if (cot && typeof cot.tipoCotizacion === "number") {
      return { fechaSolicitada: fechaISO, encontradoEn: cot.fecha || iso, cotizacion: cot };
    }
    d.setDate(d.getDate() - 1); // retrocede un día
    attempts += 1;
  }
  return null;
}

/** Dólar del día anterior (según clock) con fallback hacia atrás. Si no hay nada, intenta última publicada. */
export async function getUsdDiaAnteriorConFallback(
  maxDias = Number(process.env.USD_MAX_FALLBACK_DAYS || 7)
) {
  const isoAyer = ayerISO();
  const found = await getUsdPorFechaConFallback(isoAyer, maxDias);
  if (!found) {
    const ultima = await getUsdUltima();
    if (ultima) {
      return { fechaSolicitada: isoAyer, encontradoEn: ultima.fecha, cotizacion: ultima };
    }
    return null;
  }
  return found;
}

export const getUsdAyer = getUsdDiaAnteriorConFallback;

export const cambioService = {
  usdUltima: getUsdUltima,
  usdPorFecha: getUsdPorFecha,
  usdPorFechaConFallback: getUsdPorFechaConFallback,
  usdDiaAnteriorConFallback: getUsdDiaAnteriorConFallback,
  usdAyer: getUsdAyer,
};

export default cambioService;
