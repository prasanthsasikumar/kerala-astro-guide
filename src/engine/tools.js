// Panchanga shuddhi, Malayalam -> English date converter, Rasi pramanam.
import { setSidMode, sunTimes, dayNum, fromDayNum, addDays, civilDow, mod360, F_TRUE_NOSPD } from "./core.js";

const F_TRUE_SPD = 65874; // SID|SPEED|NONUT|TRUEPOS|SWIEPH (Panchangasudhi)
const pad = (n) => String(n).padStart(2, "0");
const lonOf = (swe, jd, ipl, flag) => mod360(swe.swe_calc_ut(jd, ipl, flag)[0]);

// ---------------------------------------------------------------------------
// 12-hour clock (noon is PM, never "11:60"): round (or floor)
// to whole minutes first and carry into the hour/day. Returns { text, nextDay } where nextDay = days carried.
export function ampm(hours, { floor = false, upper = true } = {}) {
  const raw = hours * 60;
  const total = floor ? Math.floor(raw + 1e-6) : Math.round(raw);
  const dayOff = Math.floor(total / 1440);
  const m = total - dayOff * 1440;
  const h = Math.floor(m / 60);
  const suffix = h >= 12 ? "PM" : "AM";
  return { text: `${h % 12 || 12}:${pad(m % 60)} ${upper ? suffix : suffix.toLowerCase()}`, dayOff };
}
export const dmy = (d) => `${d.d}-${d.m}-${d.y}`;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const ddMMMyyyy = (d) => `${pad(d.d)} ${MON[d.m - 1]} ${d.y}`;

// ---------------------------------------------------------------------------
// Panchanga shuddhi (Panchangasudhi)
export const BAD = {
  nak: [2, 3, 6, 9, 10, 11, 16, 18, 19, 20, 25],
  tithi: [4, 8, 9, 14, 19, 23, 24, 29, 30],
  dow: [1, 3, 7], // 1 = Sunday
  nitya: [1, 6, 9, 10, 13, 15, 17, 19, 27],
  karana: [8, 15, 22, 29, 36, 43, 50, 57, 1, 60, 58, 59],
};
export const SHUDDHI_MAX_DAYS = 93;

export function validateShuddhi(from, to) {
  if (Math.abs(dayNum(to.y, to.m, to.d) - dayNum(from.y, from.m, from.d)) > SHUDDHI_MAX_DAYS) return "The duration should be less than 3 months";
  if (dayNum(from.y, from.m, from.d) > dayNum(to.y, to.m, to.d)) return "Start date should not be greater than end date.";
  return null;
}

function limbsAt(swe, jd) {
  const moon = lonOf(swe, jd, 1, F_TRUE_SPD);
  const sun = lonOf(swe, jd, 0, F_TRUE_SPD);
  const diff = moon - sun < 0 ? moon + 360 - sun : moon - sun;
  const sum = moon + sun > 360 ? moon + sun - 360 : moon + sun;
  return {
    moon, sun, diff, sum,
    nak: Math.trunc((moon * 6) / 80) + 1,
    tithi: Math.trunc(diff / 12 + 1),
    nitya: Math.trunc((sum * 6) / 80 + 1),
    karana: Math.trunc(diff / 6 + 1),
  };
}

/**
 * Per-day good/bad grid at sunrise, both dates inclusive. Each day also carries the detail-dialog
 * end times (local decimal hours, may exceed 24 = next day) from linear motion to next sunrise.
 */
export function panchangaShuddhi(swe, settings, { from, to, place }) {
  setSidMode(swe, settings.ayanamsa);
  const n0 = dayNum(from.y, from.m, from.d);
  const n1 = dayNum(to.y, to.m, to.d);
  const at = (n) => {
    const date = fromDayNum(n);
    const st = sunTimes(swe, date, place, settings.sunrise);
    return { date, sr: st.R, L: limbsAt(swe, st.riseJd) };
  };
  const days = [];
  let cur = at(n0);
  for (let n = n0; n <= n1; n++) {
    const next = at(n + 1);
    const a = cur.L;
    const b = next.L;
    const grow = (x2, x1) => (x2 < x1 ? x2 + 360 : x2) - x1;
    const dMoon = grow(b.moon, a.moon);
    const dDiff = grow(b.diff, a.diff);
    const dSum = grow(b.sum, a.sum);
    const dow = civilDow(cur.date.y, cur.date.m, cur.date.d) + 1;
    days.push({
      date: cur.date, dow, sunrise: cur.sr,
      nak: a.nak, tithi: a.tithi, nitya: a.nitya, karana: a.karana,
      good: {
        dow: !BAD.dow.includes(dow), nak: !BAD.nak.includes(a.nak), tithi: !BAD.tithi.includes(a.tithi),
        nitya: !BAD.nitya.includes(a.nitya), karana: !BAD.karana.includes(a.karana),
      },
      ends: {
        nak: ((a.nak * 80) / 6 - a.moon) / (dMoon / 24) + cur.sr,
        tithi: (a.tithi * 12 - a.diff) / (dDiff / 24) + cur.sr,
        nitya: (a.nitya * 13.333333333 - a.sum) / (dSum / 24) + cur.sr,
        karana: (a.karana * 6 - a.diff) / (dDiff / 24) + cur.sr,
      },
    });
    cur = next;
  }
  return days;
}

// Panchanga shuddhi time format: floor minutes, lower-case am/pm, "*" past midnight.
export function shuddhiTime(h) {
  const r = ampm(h, { floor: true, upper: false });
  return r.text + (r.dayOff > 0 ? " *" : "");
}

// ---------------------------------------------------------------------------
// Malayalam (Kollam) date of a civil date: Sun sign at sunrise (North Kerala)
// or at 3/5 of the daytime (South Kerala). Same algorithm as core.js malayalamDate with base = date.
export function monthIdOf(db, sunLon) {
  return +db.tblMalayalamMonths.find((r) => sunLon >= +r.LValue && sunLon <= +r.HValue && +r.HValue !== sunLon)._id;
}
export function malayalamDateOf(swe, db, settings, date, place, north) {
  const jd0 = (dt) => swe.swe_julday(dt.y, dt.m, dt.d, 0, 1);
  const sunAt = (jd) => lonOf(swe, jd, 0, F_TRUE_NOSPD);
  const st = sunTimes(swe, date, place, settings.sunrise);
  let cutFor;
  if (north) {
    const hr = st.riseJd - jd0(date);
    cutFor = (dt) => jd0(dt) + hr;
  } else {
    cutFor = (dt) => {
      const s = dt === date ? st : sunTimes(swe, dt, place, settings.sunrise);
      return s.riseJd + (s.setJd - s.riseJd) * 0.6;
    };
  }
  const sign0 = monthIdOf(db, sunAt(cutFor(date)));
  let k = 1;
  let prev = date;
  for (; k < 33; k++) {
    prev = addDays(date, -k);
    if (monthIdOf(db, sunAt(cutFor(prev))) !== sign0) break;
  }
  const month0 = prev.m - 1;
  const year = sign0 >= 5 && sign0 <= 9 && month0 >= 7 && month0 <= 11 ? prev.y - 824 : prev.y - 825;
  return { day: k, month: sign0, year };
}

// ---------------------------------------------------------------------------
// Malayalam -> English date (Dateconverter)
export const CONVERT_TYPES = [
  ["ഉദയാൽപൂർവ്വം", "Before sunrise"],
  ["ഉദയാൽപരം", "After sunrise"],
  ["അസ്തമനാൽപൂർവ്വം", "Before sunset"],
  ["അസ്തമനാൽപരം", "After sunset"],
];
export const CONVERT_SYSTEMS = [["വടക്കന്‍ കേരള സംക്രമഗണിത പ്രകാരം", "North Kerala"], ["തെക്കന്‍ കേരള സംക്രമഗണിത പ്രകാരം", "South Kerala"]];
export const WEEKDAY_FULL = ["ഞായറാഴ്ച", "തിങ്കളാഴ്ച", "ചൊവ്വാഴ്ച", "ബുധനാഴ്ച", "വ്യാഴാഴ്ച", "വെള്ളിയാഴ്ച", "ശനിയാഴ്ച"];

/** Civil date whose Malayalam date is exactly (day, month, year), or null. */
export function findMalayalamDate(swe, db, settings, { day, month, year }, place, north) {
  if (!(month >= 1 && month <= 12) || !(day >= 1 && day <= 32) || !Number.isInteger(year)) return null;
  // Medam starts about 14 April of Kollam year + 825; Chingam..Dhanu fall in the previous Gregorian year.
  const est = dayNum(year + 825, 4, 14) + Math.round((month - 1 - (month >= 5 ? 12 : 0)) * 30.44) + day - 1;
  for (let off = 0; off <= 8; off++) {
    for (const s of off ? [off, -off] : [0]) {
      const dt = fromDayNum(est + s);
      const m = malayalamDateOf(swe, db, settings, dt, place, north);
      if (m.day === day && m.month === month && m.year === year) return dt;
    }
  }
  return null;
}

/**
 * input: { day, month (1 = Medam), year (Kollam), naz, vin, type (0..3), system (0 North, 1 South), place }
 * returns { ok, date, hours, text, hinduDow, westernDow } or { ok: false }
 */
export function malToEnglish(swe, db, settings, input) {
  const { day, month, year, naz, vin, type, system, place } = input;
  setSidMode(swe, settings.ayanamsa);
  const north = system === 0;
  let date = findMalayalamDate(swe, db, settings, { day, month, year }, place, north);
  if (!date) return { ok: false };
  const st = sunTimes(swe, date, place, settings.sunrise);
  const base = type <= 1 ? st.R : st.S;
  const off = (naz + vin / 60) / 2.5;
  let t = type === 1 || type === 3 ? base + off : base - off;
  // carry whole days both ways
  const minutes = Math.round(t * 60);
  const carry = Math.floor(minutes / 1440);
  if (carry) date = addDays(date, carry);
  t = (minutes - carry * 1440) / 60;
  const sr = carry ? sunTimes(swe, date, place, settings.sunrise).R : st.R;
  const westernDow = civilDow(date.y, date.m, date.d);
  const hinduDow = t < sr ? (westernDow + 6) % 7 : westernDow;
  return { ok: true, date, hours: t, clock: ampm(t).text, westernDow, hinduDow };
}

// ---------------------------------------------------------------------------
// Rasi pramanam (RasiPramana): rising duration of each sign in nazhika at latitude lat,
// with the ayanamsa at 01:00 UT on the 1st of the month.
export function rasiPramanam(swe, settings, { year, month, lat }) {
  setSidMode(swe, settings.ayanamsa);
  const ayan = swe.swe_get_ayanamsa_ut(swe.swe_julday(year, month, 1, 1.0, 1));
  return { ayanamsa: ayan, nazhika: rasimanaDurations(ayan, lat) };
}

// Same formula as core.js rasimana (same constants, incl. sin(L) * eps in radians).
export function rasimanaDurations(ayanamsa, lat) {
  const D = 57.29578;
  const E = 0.40927970959267;
  const OMC = 0.082592306425;
  const asinS = (x) => (Math.abs(x) !== 1 ? Math.atan(x / Math.sqrt(1 - x * x)) : Math.sign(x) * 1.5707963267949);
  const decl = (L) => asinS(Math.sin(L / D) * E);
  const redu = (L) => -((Math.sin(L / D) * Math.cos(L / D) * OMC) / Math.cos(decl(L))) * D;
  const cara = (L) => -asinS((Math.sin(L / D) * E * Math.tan(lat / D)) / Math.cos(decl(L))) * D;
  let prev = 0;
  const q = [];
  for (let i = 0; i <= 12; i++) {
    const L = (i + 1) * 30 + ayanamsa;
    const oa = L + cara(L) + redu(L);
    q[i < 12 ? i : 0] = (oa - prev) / 6;
    prev = oa;
  }
  return q;
}
// nazhika -> [nazhika, vinazhika, tatpara] (truncated)
export function nvt(x) {
  const n = Math.trunc(x);
  const v = (x - n) * 60;
  return [n, Math.trunc(v), Math.trunc((v - Math.trunc(v)) * 60)];
}
