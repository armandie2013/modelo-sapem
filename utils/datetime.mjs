// utils/datetime.mjs
import clock from "./clock.mjs";

/**
 * Combina un string "YYYY-MM-DD" del datepicker con la HORA ACTUAL del clock.
 * Devuelve un Date en UTC. Si el string es inválido/ vacío, devuelve clock.date() (ahora).
 */
export function dateWithClockTimeFromLocalDateString(dateStr) {
  const now = clock.date(); // ahora (coherente con tu reloj central)

  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return now;
  }

  const [y, m, d] = dateStr.split("-").map(Number);

  // Creamos un UTC Date del día elegido + hora/min/seg/ms actuales del clock
  return new Date(Date.UTC(
    y,
    (m || 1) - 1,
    d || 1,
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds()
  ));
}