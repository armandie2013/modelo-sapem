// services/bcraClient.mjs
import fetch from "node-fetch";

const BASE = "https://api.bcra.gob.ar/estadisticascambiarias/v1.0";

async function safeGet(url) {
  const resp = await fetch(url, { timeout: 12000 });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`BCRA ${resp.status}: ${txt || resp.statusText}`);
  }
  return resp.json();
}

export async function getDivisas() {
  return safeGet(`${BASE}/Maestros/Divisas`);
}

export async function getCotizaciones({ fecha } = {}) {
  const qs = fecha ? `?fecha=${fecha}` : "";
  return safeGet(`${BASE}/Cotizaciones${qs}`);
}

export async function getEvolucion({ moneda, desde, hasta, limit = 1000, offset = 0 } = {}) {
  if (!moneda) throw new Error("moneda (ISO) requerida. Ej: USD, EUR");
  const params = new URLSearchParams();
  if (desde) params.set("fechadesde", desde);
  if (hasta) params.set("fechahasta", hasta);
  if (limit) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return safeGet(`${BASE}/Cotizaciones/${moneda.toUpperCase()}${qs}`);
}
