// Gocharam: Graha pakarcha (sign ingress times) and Gochara phalam (transit positions).
import { setSidMode, dayNum, fromDayNum, mod360 } from "./core.js";
import { GOCHARA_TEXTS } from "@private/gochara-texts.js";

// transit planets in display order
export const GOCHARA_ORDER = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"];

// Planet picker order: index -> Swiss id; 7 Rahu, 8 Ketu use the node setting.
export const TRANSIT_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];
const SWISS = { Sun: 0, Moon: 1, Mercury: 2, Venus: 3, Mars: 4, Jupiter: 5, Saturn: 6 };

// Ingress flags: SIDEREAL (+ default Swiss ephemeris, + speed).
const F_TRANSIT = 65536 | 2 | 256;
// Gochara phalam flag (65858): SIDEREAL|SPEED|NONUT|SWIEPH
const F_GOCHARA = 65858;

export const MAX_SPAN = { Moon: 180, other: 1100 };

/** Validate a pakarcha request; returns an error string or null. */
export function validatePakarcha({ planet, from, to }) {
  const a = dayNum(from.y, from.m, from.d);
  const b = dayNum(to.y, to.m, to.d);
  if (planet === "Moon" && Math.abs(b - a) > MAX_SPAN.Moon) return "The duration should be less than 6 months.";
  if (planet !== "Moon" && Math.abs(b - a) > MAX_SPAN.other) return "The duration should be less than 3 years.";
  if (a > b) return "Start date should not be greater than end date.";
  return null;
}

const signAt = (swe, jd, ipl) => Math.floor(mod360(swe.swe_calc_ut(jd, ipl, F_TRANSIT)[0]) / 30) % 12;

/**
 * Sign ingresses of one planet whose local (place tz) date falls in [from, to], both inclusive.
 * Scan + bisection on sidereal longitude. Returns rows sorted by time:
 * { jd (UT), local: {y,m,d,min}, fromSign, toSign (0..11), retro }
 */
export function grahaPakarcha(swe, settings, { planet, from, to, tz }) {
  setSidMode(swe, settings.ayanamsa);
  const isNode = planet === "Rahu" || planet === "Ketu";
  const ipl = isNode ? settings.node : SWISS[planet];
  const start = swe.swe_julday(from.y, from.m, from.d, 0, 1) - tz / 24;
  const end = swe.swe_julday(to.y, to.m, to.d, 0, 1) + 1 - tz / 24;
  const step = planet === "Moon" ? 0.1 : 0.25;
  const rows = [];
  let t0 = start;
  let s0 = signAt(swe, t0, ipl);
  while (t0 < end) {
    const t1 = Math.min(t0 + step, end);
    const s1 = signAt(swe, t1, ipl);
    if (s1 !== s0) {
      let a = t0;
      let b = t1;
      for (let k = 0; k < 40 && b - a > 1e-7; k++) {
        const m = (a + b) / 2;
        if (signAt(swe, m, ipl) === s0) a = m;
        else b = m;
      }
      const jd = b;
      const retro = (s1 - s0 + 12) % 12 !== 1;
      let fromSign = s0;
      let toSign = s1;
      if (planet === "Ketu") { fromSign = (fromSign + 6) % 12; toSign = (toSign + 6) % 12; }
      rows.push({ jd, local: localParts(jd, tz), fromSign, toSign, retro });
    }
    t0 = t1;
    s0 = s1;
  }
  const lo = dayNum(from.y, from.m, from.d);
  const hi = dayNum(to.y, to.m, to.d);
  return rows.filter((r) => { const n = dayNum(r.local.y, r.local.m, r.local.d); return n >= lo && n <= hi; });
}

/** UT Julian day -> local civil date and minute of day (rounded to the minute, carried into the date). */
export function localParts(jd, tz) {
  const totalMin = Math.round((jd + tz / 24 - 2440587.5) * 1440); // minutes since 1970-01-01 local
  const dn = Math.floor(totalMin / 1440);
  return { ...fromDayNum(dn), min: totalMin - dn * 1440 };
}

/**
 * Gochara phalam: for janma rasi (0 = Medam) at local date/time in tz, the 7 transit texts.
 * Returns [{ planet, lon, sign, house (0 = janma rasi), text }] in display order.
 */
export function gocharaPhalam(swe, settings, { rasi, date, hours, tz }) {
  setSidMode(swe, settings.ayanamsa);
  const jd = swe.swe_julday(date.y, date.m, date.d, hours - tz, 1);
  return GOCHARA_ORDER.map((planet) => {
    const lon = mod360(swe.swe_calc_ut(jd, SWISS[planet], F_GOCHARA)[0]);
    const sign = Math.floor(lon / 30) % 12;
    const house = (sign - rasi + 12) % 12;
    return { planet, lon, sign, house, text: GOCHARA_TEXTS?.[planet][house] ?? null };
  });
}
