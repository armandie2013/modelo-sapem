// utils/moneyAndDates.mjs
// Utilidades de dinero y fechas usadas por Plan de Pago (y reutilizables)

import clock from "./clock.mjs";

/* ============================
 * Dinero (manejo en centavos)
 * ============================ */
export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function toCents(n) {
  return Math.round((Number(n) || 0) * 100);
}

export function fromCents(c) {
  return round2((Number(c) || 0) / 100);
}

/**
 * Divide un total en N partes iguales en centavos, repartiendo el resto
 * en las primeras cuotas para que la suma respete exactamente el total.
 */
export function splitEven(total, n) {
  const qty = Math.max(1, Number(n) | 0);
  const cents = toCents(total);
  const base = Math.floor(cents / qty);
  const rem  = cents - base * qty;

  const arr = Array.from({ length: qty }, (_, i) => base + (i < rem ? 1 : 0));
  return arr.map(fromCents); // números con 2 decimales
}

/* ============================
 * Fechas / períodos
 * ============================ */
export function isYYYYMM(s) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(s));
}

export function isYMD(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s));
}

export function ym(date = clock.date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function ymd(date = clock.date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export function todayYM() {
  return ym(clock.date());
}

export function todayYMD() {
  return ymd(clock.date());
}

/**
 * Suma meses manteniendo el día cuando sea posible.
 * Si el mes destino no tiene ese día, usa el último día del mes.
 */
export function addMonthsKeepDay(dt, months) {
  const d = new Date(dt instanceof Date ? dt.getTime() : new Date(dt).getTime());
  if (Number.isNaN(d.getTime())) return clock.date();

  const day = d.getDate();
  const res = new Date(d);
  res.setDate(1);
  res.setMonth(res.getMonth() + Number(months || 0));
  const lastDay = new Date(res.getFullYear(), res.getMonth() + 1, 0).getDate();
  res.setDate(Math.min(day, lastDay));
  return res;
}

export function nextYYYYMM(periodo, delta = 1) {
  if (!isYYYYMM(periodo)) throw new Error("Periodo inválido (YYYY-MM)");
  const [y, m] = periodo.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const next  = addMonthsKeepDay(start, delta);
  const yy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

export function firstDateOfYYYYMM(periodo) {
  if (!isYYYYMM(periodo)) throw new Error("Periodo inválido (YYYY-MM)");
  const [y, m] = periodo.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

/**
 * Normaliza entradas a Date:
 *  - Date => igual
 *  - 'YYYY-MM-DD' => clock.dateFromLocalYMD
 *  - 'YYYY-MM'    => primer día del mes
 *  - otro string  => new Date(string) si es válido; si no, clock.date()
 */
export function ensureDate(input) {
  if (!input) return clock.date();
  if (input instanceof Date) return input;

  const s = String(input);
  if (isYMD(s))       return clock.dateFromLocalYMD(s);
  if (isYYYYMM(s))    return firstDateOfYYYYMM(s);

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? clock.date() : d;
}

/**
 * Genera las N cuotas a partir de un total, un primer vencimiento y (opcional)
 * un período base (YYYY-MM). Si no pasás período base, calcula el período
 * en base al mes del vencimiento de cada cuota.
 */
export function buildSchedule(total, cuotasCantidad, primerVtoDate, periodoBase = null) {
  const amounts   = splitEven(total, cuotasCantidad);
  const firstDate = ensureDate(primerVtoDate);

  const cuotas = [];
  for (let i = 0; i < cuotasCantidad; i++) {
    const venc = addMonthsKeepDay(firstDate, i);
    const periodoCuota = (periodoBase && isYYYYMM(periodoBase))
      ? nextYYYYMM(periodoBase, i)
      : ym(venc);

    cuotas.push({
      n: i + 1,
      vencimiento: venc,
      periodoCuota,
      importeCuota: amounts[i],
      saldoCuota: amounts[i],
      estado: "pendiente",
      movimientoId: null,
    });
  }
  return cuotas;
}

/* ======== ALIAS para lo que espera tu controller ======== */
// addMonthsYM(YYYY-MM, delta) → YYYY-MM
export function addMonthsYM(periodo, delta = 1) {
  return nextYYYYMM(periodo, delta);
}

// cents: alias de toCents, pero como variable local y named export
export const cents = toCents;

export default {
  round2,
  toCents,
  fromCents,
  splitEven,
  isYYYYMM,
  isYMD,
  ym,
  ymd,
  todayYM,
  todayYMD,
  addMonthsKeepDay,
  nextYYYYMM,
  firstDateOfYYYYMM,
  ensureDate,
  buildSchedule,
  // alias
  addMonthsYM,
  cents,
};
