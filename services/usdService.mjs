// services/usdService.mjs
import { getCotizaciones, getEvolucion } from "./bcraClient.mjs";

const memCache = new Map();
const TTL_MS = 15 * 60 * 1000; // 15 min

function setCache(key, value) { memCache.set(key, { value, ts: Date.now() }); }
function getCache(key) {
  const hit = memCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > TTL_MS) { memCache.delete(key); return null; }
  return hit.value;
}

function formatYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function minusDays(d, n) { const c = new Date(d); c.setDate(c.getDate() - n); return c; }

export async function getUsdForDateOrLast(fechaYMD) {
  const key = `usd:${fechaYMD || "ultima"}`;
  const cached = getCache(key);
  if (cached) return cached;

  let attempts = 0;
  let dateCursor = fechaYMD ? new Date(fechaYMD) : null;

  while (attempts < 10) {
    const payload = await getCotizaciones({ fecha: dateCursor ? formatYMD(dateCursor) : undefined });
    const detalle = payload?.results?.detalle || [];
    const fechaEfec = payload?.results?.fecha || null;
    const usd = detalle.find(d => d.codigoMoneda === "USD");
    if (usd) {
      const result = {
        fecha: fechaEfec,
        codigo: "USD",
        descripcion: usd.descripcion,
        tipoPase: usd.tipoPase,
        tipoCotizacion: usd.tipoCotizacion,
      };
      setCache(key, result);
      return result;
    }
    attempts += 1;
    dateCursor = minusDays(dateCursor || new Date(), 1);
  }

  const nil = { fecha: null, codigo: "USD", descripcion: "DÓLAR ESTADOUNIDENSE", tipoPase: null, tipoCotizacion: null };
  setCache(key, nil);
  return nil;
}

export async function getUsdAyerHabil() {
  const today = new Date();
  return getUsdForDateOrLast(formatYMD(minusDays(today, 1)));
}

// (opcional) proxy simple para histórico con filtros
export async function getHistoricoISO({ iso, desde, hasta, limit, offset }) {
  return getEvolucion({ moneda: iso, desde, hasta, limit, offset });
}
