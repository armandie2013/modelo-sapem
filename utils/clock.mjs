// utils/clock.mjs
// Reloj centralizado con offset opcional desde servidores de hora (HTTP Date).
// Si no hay internet o falla, usa la hora local del sistema.

import http from "node:http";
import https from "node:https";

let offsetMs = 0;          // serverTime - Date.now()
let lastSyncOk = false;
let lastSyncAt = null;

function nowMs() {
  return Date.now() + offsetMs;
}
function date() {
  return new Date(nowMs());
}

// Construye un Date local a partir de 'YYYY-MM-DD' pero con la hora actual del reloj.
// Ej.: si son 14:23:10 y el usuario elige 2025-09-15 → 2025-09-15 14:23:10 (hora local).
function dateFromLocalYMD(ymd, base = date()) {
  if (!ymd) return date();
  const [y, m, d] = String(ymd).split("-").map(Number);
  const hh = base.getHours(), mi = base.getMinutes(), ss = base.getSeconds(), ms = base.getMilliseconds();
  // Importante: usar new Date(y, m-1, d, ...) crea fecha LOCAL (no UTC)
  return new Date(y, (m || 1) - 1, d || 1, hh, mi, ss, ms);
}

async function syncOnce() {
  // Intenta varios hosts rápidos; con HEAD tomamos la cabecera Date
  const targets = [
    { proto: "https:", host: "www.google.com", path: "/" },
    { proto: "https:", host: "cloudflare.com", path: "/" },
    { proto: "https:", host: "www.bing.com", path: "/" },
  ];

  for (const t of targets) {
    try {
      const serverDate = await fetchDateHeader(t);
      if (serverDate) {
        offsetMs = serverDate.getTime() - Date.now();
        lastSyncOk = true;
        lastSyncAt = new Date();
        return;
      }
    } catch { /* siguiente target */ }
  }

  // Si llegamos acá, falló todo
  lastSyncOk = false;
}

function fetchDateHeader({ proto, host, path }) {
  const lib = proto === "http:" ? http : https;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      { method: "HEAD", host, path, timeout: 4000 },
      (res) => {
        const header = res.headers?.date;
        if (!header) return reject(new Error("Sin header Date"));
        const d = new Date(header);
        if (isNaN(d.getTime())) return reject(new Error("Header Date inválido"));
        resolve(d);
      }
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(new Error("timeout")); });
    req.end();
  });
}

async function init({ waitForFirstSync = false, intervalMs = 15 * 60 * 1000 } = {}) {
  try { await syncOnce(); } catch {}
  // Reintentos periódicos (no bloquean el event loop)
  const timer = setInterval(() => { syncOnce().catch(()=>{}); }, intervalMs);
  timer.unref?.();

  if (waitForFirstSync) {
    // Si querés bloquear hasta el primer sync, esperá un poco o reintenta
    if (!lastSyncOk) {
      // último intento
      try { await syncOnce(); } catch {}
    }
  }
}

function getStatus() {
  return {
    offsetMs,
    lastSyncOk,
    lastSyncAt,
  };
}

export default {
  init,
  nowMs,
  date,
  dateFromLocalYMD,
  getStatus,
};
