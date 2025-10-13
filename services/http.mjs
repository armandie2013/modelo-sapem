// services/http.mjs
// Axios + KeepAlive + retries + cache GET para estabilizar respuestas inestables (ej. "n/d")

import https from "node:https";
import axios from "axios";

// ⚠️ En producción, usá certificados válidos y seteá rejectUnauthorized: true
const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === "production",
  keepAlive: true,
});

export const http = axios.create({
  baseURL:
    process.env.BCRA_BASE_URL ||
    "https://api.bcra.gob.ar/estadisticascambiarias/v1.0",
  httpsAgent,
  timeout: Number(process.env.HTTP_TIMEOUT_MS || 3500),
  headers: { Accept: "application/json" },
  // Permitimos que axios resuelva la promesa para 4xx; 5xx hará throw (lo capturamos)
  validateStatus: (s) => s >= 200 && s < 500,
});

/* ---------------- Cache GET en memoria (simple) ---------------- */
const _cache = new Map(); // key -> { expiresAt, value }
function _cacheKey(url, params) {
  try {
    const p = params ? JSON.stringify(params) : "";
    return `GET ${url}?${p}`;
  } catch {
    return `GET ${url}`;
  }
}
function _cacheGet(key) {
  const hit = _cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    _cache.delete(key);
    return null;
  }
  return hit.value;
}
function _cacheSet(key, value, ttlMs) {
  if (ttlMs > 0) _cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * GET con retries + cache + heurística para "n/d".
 * Devuelve siempre { status, data, headers } para que sea similar a axios.
 */
export async function httpGet(
  url,
  {
    params,
    timeoutMs = Number(process.env.HTTP_TIMEOUT_MS || 3500),
    retries = Number(process.env.HTTP_RETRIES || 2),
    cacheTtlMs = Number(process.env.HTTP_CACHE_TTL_MS || 30_000),
    headers,
  } = {}
) {
  const key = _cacheKey(url, params);

  // 1) cache
  const cached = cacheTtlMs > 0 ? _cacheGet(key) : null;
  if (cached) return cached;

  let attempt = 0;
  let lastErr;
  while (attempt <= retries) {
    try {
      const res = await http.get(url, {
        params,
        timeout: timeoutMs,
        headers,
        httpsAgent,
        validateStatus: (s) => s >= 200 && s < 500, // 5xx lanza throw
      });

      // 2xx OK
      if (res.status >= 200 && res.status < 300) {
        let ttl = cacheTtlMs;

        // Si el cuerpo es "n/d" o string vacío, cache muy corto
        const isND =
          (typeof res.data === "string" &&
            res.data.trim().toLowerCase() === "n/d") ||
          (typeof res.data === "string" && res.data.trim() === "");
        if (isND) ttl = Math.min(ttl, 5_000);

        const payload = { status: res.status, data: res.data, headers: res.headers };
        if (ttl > 0) _cacheSet(key, payload, ttl);
        return payload;
      }

      // 429 o 5xx → retry. (5xx no entra acá por validateStatus, pero lo manejamos por seguridad)
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        attempt += 1;
        if (attempt > retries) return { status: res.status, data: res.data, headers: res.headers };
        await new Promise((r) => setTimeout(r, 250 * attempt));
        continue;
      }

      // Otros 4xx: devolver directo
      return { status: res.status, data: res.data, headers: res.headers };
    } catch (err) {
      lastErr = err;
      attempt += 1;
      if (attempt > retries) throw err;
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
  throw lastErr || new Error("httpGet failed");
}

export default http;
