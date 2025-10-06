// services/cambioService.mjs
import { http } from "./http.mjs";
import clock from "../utils/clock.mjs";

/**
 * La API real responde algo así:
 * {
 *   "status": 200,
 *   "metadata": {...},
 *   "results": [
 *     {
 *       "fecha": "YYYY-MM-DD",
 *       "detalle": [
 *         { "codigoMoneda":"USD", "descripcion":"DOLAR E.E.U.U.", "tipoCotizacion": 1423.00000000, ... }
 *       ]
 *     }
 *   ]
 * }
 */

function parseBcraUsdResponse(data) {
  const results = data?.results;
  if (!Array.isArray(results) || results.length === 0) return null;

  for (const r of results) {
    const fecha = typeof r?.fecha === "string" ? r.fecha.slice(0, 10) : null;
    const detalle = Array.isArray(r?.detalle) ? r.detalle : [];

    // Buscar explícitamente USD o, en su defecto, el primer item con tipoCotizacion numérico
    let item =
      detalle.find(
        (d) => String(d?.codigoMoneda || "").toUpperCase() === "USD"
      ) ||
      detalle.find((d) =>
        /D[ÓO]LAR/.test(String(d?.descripcion || "").toUpperCase())
      ) ||
      detalle.find(
        (d) => d && d.tipoCotizacion !== undefined && d.tipoCotizacion !== null
      );

    if (
      item &&
      item.tipoCotizacion !== undefined &&
      item.tipoCotizacion !== null
    ) {
      const tipo = Number(item.tipoCotizacion);
      if (!Number.isNaN(tipo)) {
        return {
          fecha: fecha || new Date().toISOString().slice(0, 10),
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
  // Usamos tu reloj centralizado (clock) para evitar desfasajes
  const now = clock.date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return toLocalISO(d);
}

/** Última cotización publicada (sin fecha; puede ser HOY si ya publicaron) */
export async function getUsdUltima() {
  const { data } = await http.get("/Cotizaciones/USD");
  return parseBcraUsdResponse(data);
}

/** Cotización USD para una fecha exacta (puede devolver null si no hubo publicación ese día) */
export async function getUsdPorFecha(fechaISO) {
  const { data } = await http.get("/Cotizaciones/USD", {
    params: { fechadesde: fechaISO, fechahasta: fechaISO },
  });
  return parseBcraUsdResponse(data);
}

/**
 * Fallback histórico: intenta fecha exacta y si no hay, retrocede 1 día
 * hasta `maxDias` (default 7).
 * Devuelve: { fechaSolicitada, encontradoEn, cotizacion: { fecha, tipoCotizacion } } o null
 */
export async function getUsdPorFechaConFallback(
  fechaISO,
  maxDias = Number(process.env.USD_MAX_FALLBACK_DAYS || 7)
) {
  // Construimos fecha en "local" para alinear con el backend (clock)
  const [Y, M, D] = String(fechaISO)
    .split("-")
    .map((n) => Number(n));
  if (!Y || !M || !D) throw new Error("Fecha inválida");

  let attempts = 0;
  let d = new Date(Y, M - 1, D);

  while (attempts <= maxDias) {
    const iso = toLocalISO(d);

    const cot = await getUsdPorFecha(iso);
    if (cot && typeof cot.tipoCotizacion === "number") {
      return {
        fechaSolicitada: fechaISO,
        encontradoEn: cot.fecha || iso,
        cotizacion: cot,
      };
    }

    // retrocede un día
    d.setDate(d.getDate() - 1);
    attempts += 1;
  }
  return null;
}

/** Día anterior a hoy (según clock) con fallback hacia atrás a hábiles previos */
export async function getUsdDiaAnteriorConFallback(maxDias) {
  const isoAyer = ayerISO();
  const found = await getUsdPorFechaConFallback(isoAyer, maxDias);
  // Si no encontró nada en la ventana, devolvemos la última publicada como súper fallback
  if (!found) {
    const ultima = await getUsdUltima();
    if (ultima) {
      return {
        fechaSolicitada: isoAyer,
        encontradoEn: ultima.fecha,
        cotizacion: ultima,
      };
    }
    return null;
  }
  return found;
}

// Alias por compatibilidad (si algo usaba getUsdAyer)
export const getUsdAyer = getUsdDiaAnteriorConFallback;

// ⬇️ pegá esto al final de services/cambioService.mjs
export const cambioService = {
  // nombres "amigables" para cómo lo usás en controllers
  usdUltima: getUsdUltima,
  usdPorFecha: getUsdPorFecha,
  usdPorFechaConFallback: getUsdPorFechaConFallback,
  usdDiaAnteriorConFallback: getUsdDiaAnteriorConFallback,
  usdAyer: getUsdAyer,
};
