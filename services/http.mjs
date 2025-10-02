// services/http.mjs
import https from "node:https";
import axios from "axios";

/**
 * DEV: desactiva validación de cert para evitar "unable to verify first certificate".
 * ⚠️ En producción seteá rejectUnauthorized: true y configurá tus CAs.
 */
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

export const http = axios.create({
  baseURL: process.env.BCRA_BASE_URL || "https://api.bcra.gob.ar/estadisticascambiarias/v1.0",
  httpsAgent,
  timeout: 15000,
  headers: { Accept: "application/json" },
  validateStatus: (s) => s >= 200 && s < 500,
});
