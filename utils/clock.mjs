// utils/clock.mjs
// Reloj centralizado: guarda UTC en BD y permite sincronizar contra servidores de hora.
// Usa la cabecera HTTP Date (Cloudflare / Google) como referencia. Reintenta periódicamente.

let offsetMs = 0;            // diferencia servidorHora - Date.now()
let lastSyncOk = null;       // Date de la última sync OK (en hora local del proceso)
let lastError = null;        // string del último error
let timer = null;

const HTTP_TIME_SOURCES = [
  "https://time.cloudflare.com", // muy rápida
  "https://google.com",          // también provee Date header
];

const tz = "America/Argentina/Buenos_Aires"; // para formatear en vistas

async function fetchHttpDate(url) {
  const res = await fetch(url, { method: "HEAD", cache: "no-store" });
  const dateHeader = res.headers.get("date") || res.headers.get("Date");
  if (!dateHeader) throw new Error(`No Date header from ${url}`);
  const serverDate = new Date(dateHeader);
  if (isNaN(serverDate.getTime())) throw new Error(`Invalid Date header from ${url}: ${dateHeader}`);
  return serverDate;
}

async function syncOnce() {
  let lastErr;
  for (const url of HTTP_TIME_SOURCES) {
    try {
      const serverDate = await fetchHttpDate(url);
      const nowLocal = Date.now();
      offsetMs = serverDate.getTime() - nowLocal;
      lastSyncOk = new Date();
      lastError = null;
      return true;
    } catch (e) {
      lastErr = e;
    }
  }
  lastError = String(lastErr || "Unknown error");
  return false;
}

async function init({ waitForFirstSync = false, intervalMs = 15 * 60 * 1000 } = {}) {
  if (waitForFirstSync) {
    await syncOnce(); // espera primer sync
  } else {
    syncOnce().catch(() => {}); // arranca best-effort
  }
  if (timer) clearInterval(timer);
  timer = setInterval(() => { syncOnce().catch(() => {}); }, intervalMs).unref?.();
}

function nowMs() { return Date.now() + offsetMs; }
function date()  { return new Date(nowMs()); }

function getStatus() {
  return { offsetMs, lastSyncOk, lastError, tz };
}

export default { init, nowMs, date, getStatus, tz };