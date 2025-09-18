import clock from "./clock.mjs";

const TZ = clock.tz || "America/Argentina/Catamarca";
const toDate = (d) => (d instanceof Date ? d : (d ? new Date(d) : null));

export function fmtHora(d) {
  const date = toDate(d);
  if (!date || isNaN(date.getTime())) return "—";
  const hm = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(date);
  return `${hm} hs`;
}

export function fmtHoraCorta(d) {
  const date = toDate(d);
  if (!date || isNaN(date.getTime())) return "—";
  const h = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(date);
  return `${h} hs`;
}

export function fmtFecha(d) {
  const date = toDate(d);
  if (!date || isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TZ,
  }).format(date);
}

export function fmtFechaHora(d) {
  const date = toDate(d);
  if (!date || isNaN(date.getTime())) return "—";
  const f = new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(date);
  return `${f} hs`;
}