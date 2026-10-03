// Core astronomical engine.
// Pure functions over a Swiss Ephemeris instance; `db` is the exported astro DB (public/data/astro.json).
import { HOUSE_HSYS } from "./settings.js";

// ---- flags (section 2.4) ----
export const F_TRUE = 65872; // SIDEREAL|SPEED|NONUT|TRUEPOS - Sphutas, chart, dasa, bhava
export const F_APP = 65858; // SIDEREAL|SPEED|NONUT|SWIEPH - Time tab
export const F_TRUE_NOSPD = 65618; // SIDEREAL|NONUT|TRUEPOS|SWIEPH - Malayalam date, chart cusps
const SEFLG_MOSEPH = 4;
const SE_CALC_RISE = 1;
const SE_CALC_SET = 2;
const SE_SIDM_USER = 255;

export const PL = { Sun: 0, Moon: 1, Mercury: 2, Venus: 3, Mars: 4, Jupiter: 5, Saturn: 6 };
export const ORDER = ["Lagna", "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu", "Mandi"];
export const COMBUST = { Moon: 12, Mercury: 13, Venus: 9, Mars: 17, Jupiter: 11, Saturn: 15 };

// ---- small math / date helpers ----
export const mod360 = (x) => ((x % 360) + 360) % 360;
export const frac = (x) => x - Math.trunc(x);
export const int = Math.trunc;
const DAY_MS = 864e5;
export const dayNum = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
export function fromDayNum(n) {
  const dt = new Date(n * DAY_MS);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}
export const addDays = (date, k) => fromDayNum(dayNum(date.y, date.m, date.d) + k);
export const civilDow = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // Sunday = 0
export const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const nakOf = (lon) => (lon * 6) / 80; // 0..27 float

export function setSidMode(swe, ayanamsa) {
  if (ayanamsa === 255) swe.swe_set_sid_mode(SE_SIDM_USER, 1806240.72368, 0); // Chandrahari
  else if (ayanamsa === 17) swe.swe_set_sid_mode(SE_SIDM_USER, 1746447.518, 0); // galactic centre
  else swe.swe_set_sid_mode(ayanamsa, 0, 0);
}

export const jdUt = (swe, y, m, d, hours, tz) => swe.swe_julday(y, m, d, hours - tz, 1);

// ---- sunrise / sunset (section 4) ----
// The search starts at local midnight (a 0h UT start would return the next day's sunrise east of ~UTC+7).
export function sunTimes(swe, date, place, sunriseFlags) {
  const midnight = swe.swe_julday(date.y, date.m, date.d, 0, 1) - place.tz / 24;
  const geo = [place.lon, place.lat, 0];
  const rise = swe.swe_rise_trans(midnight, 0, null, SEFLG_MOSEPH, sunriseFlags | SE_CALC_RISE, geo, 0, 0);
  const set = swe.swe_rise_trans(midnight, 0, null, SEFLG_MOSEPH, sunriseFlags | SE_CALC_SET, geo, 0, 0);
  // both are truncated to whole local minutes before any further use
  const toLocalMin = (jd) => Math.floor((jd - midnight) * 1440 + 1e-7);
  const rMin = toLocalMin(rise);
  const sMin = toLocalMin(set);
  return {
    R: rMin / 60, S: sMin / 60, // local decimal hours
    riseJd: midnight + rMin / 1440, setJd: midnight + sMin / 1440,
  };
}

// ---- positions ----
function calc(swe, jd, ipl, flag) {
  const x = swe.swe_calc_ut(jd, ipl, flag);
  return { lon: mod360(x[0]), speed: x[3] };
}
export const ascAt = (swe, jd, flag, place) => mod360(swe.swe_houses_ex(jd, flag, place.lat, place.lon, "A").ascmc[0]);

// ---- the chart ----
/**
 * input: { name, gender, date: "YYYY-MM-DD", time: "HH:MM", place: {name, lat, lon, tz} }
 */
export function computeChart(swe, db, settings, input) {
  setSidMode(swe, settings.ayanamsa);
  const [y, m, d] = input.date.split("-").map(Number);
  const [hh, mi] = input.time.split(":").map(Number);
  const place = input.place;
  const t = hh + mi / 60;
  const date = { y, m, d };
  const jd = jdUt(swe, y, m, d, t, place.tz);

  const sun = sunTimes(swe, date, place, settings.sunrise);
  const { R, S } = sun;

  // planets (Sphutas tab, TRUEPOS)
  const P = {};
  for (const name of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]) {
    const c = calc(swe, jd, PL[name], F_TRUE);
    P[name] = { lon: c.lon, speed: c.speed, retro: c.speed < 0 };
  }
  const node = calc(swe, jd, settings.node, F_TRUE);
  P.Rahu = { lon: node.lon, speed: node.speed, retro: false };
  P.Ketu = { lon: mod360(node.lon + 180), speed: node.speed, retro: false };
  P.Lagna = { lon: ascAt(swe, jd, F_TRUE, place) };
  P.Mandi = { lon: mandi(swe, db, date, t, R, S, place) };
  for (const [k, lim] of Object.entries(COMBUST)) {
    const diff = Math.abs(mod360(P.Sun.lon - P[k].lon + 180) - 180);
    P[k].combust = diff < lim;
  }
  for (const k of ORDER) {
    P[k].rasi = int(int(P[k].lon) / 30);
    P[k].navamsa = int(frac(P[k].lon / 40) * 12);
  }

  const chart = {
    input, date, t, jd, place, settings,
    ayanamsa: swe.swe_get_ayanamsa_ut(jd),
    sun, planets: P,
  };
  chart.time = timeTab(swe, db, chart);
  chart.dasaRef = { Moon: P.Moon.lon, Lagna: P.Lagna.lon, Sun: P.Sun.lon };
  chart.bhava = bhava(swe, chart, F_TRUE);
  return chart;
}

// ---- Mandi (section 3.6) ----
export function mandiRow(db, date, t, R) {
  let dow = civilDow(date.y, date.m, date.d) + 1;
  if (R > t) dow -= 1;
  return db.tblMandiRiseTime.find((r) => +r._id === (dow === 0 ? 7 : dow));
}
function mandi(swe, db, date, t, R, S, place) {
  const row = mandiRow(db, date, t, R);
  const dayLen = S - R;
  const nightLen = 24 - S + R;
  let jd;
  if (R < t && t < S) jd = swe.swe_julday(date.y, date.m, date.d, (dayLen / 15) * +row.Day + (R - place.tz), 1);
  else if (t < R) jd = swe.swe_julday(date.y, date.m, date.d - 1, (nightLen / 15) * +row.Night + (S - place.tz), 1);
  else jd = swe.swe_julday(date.y, date.m, date.d, (nightLen / 15) * +row.Night + (S - place.tz), 1);
  return ascAt(swe, jd, F_TRUE, place);
}

// ---- Time tab (section 5, 6) ----
const NAK_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
export const nakLord = (nakIdx0) => NAK_LORDS[nakIdx0 % 9];
const TITHI_LORD = { 1: "Mars", 2: "Venus", 3: "Mercury", 4: "Moon", 5: "Sun", 6: "Jupiter", 7: "Saturn", 8: "Rahu" };
const WEEKDAY_LORD = [null, "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
export const SIGN_LORD = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
export const nazhika = (x) => ({ n: int(x), v: int(frac(x) * 60) });

function timeTab(swe, db, chart) {
  const { jd, date, t, place, settings } = chart;
  const { R, S } = chart.sun;
  const sun = calc(swe, jd, 0, F_APP).lon;
  const moon = calc(swe, jd, 1, F_APP).lon;
  const asc = ascAt(swe, jd, F_APP, place);
  const nak = nakOf(moon);
  const nakIdx = int(nak) + 1;
  const tithiD = mod360(moon - sun);
  const tithi = int(tithiD / 12 + 1);
  let yogaS = moon + sun;
  if (yogaS > 360) yogaS -= 360;
  const yoga = int((yogaS * 6) / 80 + 1);
  const karana = int(tithiD / 6 + 1);
  const westernDow = civilDow(date.y, date.m, date.d) + 1;
  let indianDow = R > t ? westernDow - 1 : westernDow;
  if (indianDow === 0) indianDow = 7;
  const kunda = mod360(asc * 81);
  const ti = tithi > 15 ? tithi - 15 : tithi;

  // yogi (5.8)
  let yp = moon + sun;
  if (yp > 360) yp -= 360;
  let yogi = yp + 93.3333333;
  if (yogi > 360) yogi -= 360;
  let avayogi = yogi + 186.6666667;
  if (avayogi > 360) avayogi -= 360;

  // veli (tide)
  const L = int(asc / 30) + 1;
  let Mo = int(moon / 30) + 1;
  if (moon <= asc) Mo += 12;
  const veliHigh = [0, 4, 5, 6, 10, 11].includes(Mo - L);

  // angaditya
  const ai = int((moon * 6) / 80) + 1;
  const aj = int((sun * 6) / 80) + 1;
  const ax = ai - aj;
  const an = ax < 0 ? ai + 27 - aj + 1 : ax + 1;
  const angaditya = an <= 3 ? 0 : an <= 6 ? 1 : an <= 11 ? 2 : an <= 19 ? 3 : 4; // head, face, belly, hands, feet

  // rithu / ayana
  const rl = settings.rithuSayana ? mod360(sun + chart.ayanamsa) : sun;
  const rithu = int(rl / 60);
  const uttarayana = rl < 90 || rl >= 270;

  // udayadi / asthamanadi
  const udayadi = ((t < R ? t + 24 : t) - R) * 2.5;
  const isDay = t > R && t < S;
  const asthamanadi = isDay ? null : (t < S ? 24 - S + t : t - S) * 2.5;
  const dinamanaMin = Math.round(S * 60) - Math.round(R * 60);

  // gulika rise time (local hours)
  const row = mandiRow(db, date, t, R);
  const dayLen = S - R;
  const nightLen = 24 - S + R;
  let gulika = R < t && t < S ? R + (dayLen / 15) * +row.Day : S + (nightLen / 15) * +row.Night;
  if (gulika > 24) gulika -= 24;

  return {
    sun, moon, asc, kunda,
    nakIdx, pada: int(frac(nak) * 4) + 1, nakLord: nakLord(nakIdx - 1), nakGatham: nazhika(frac(nak) * 60),
    chandrakriya: int(frac(nak) * 60) + 1, chandravastha: int(frac(nak) * 12) + 1, chandravela: int(frac(nak) * 36) + 1,
    koor: int(moon / 30) + 1, kundaNak: int((kunda * 6) / 80) + 1, njattuvela: int((sun * 60) / 800) + 1,
    tithi, tithiLord: TITHI_LORD[ti > 8 ? ti - 8 : ti], tithiGatham: nazhika(frac(tithiD / 12) * 60), dagdhaIdx: int(tithiD / 12) % 15,
    yoga, yoga2: yoga + 7 > 27 ? yoga - 20 : yoga + 7, yogaGatham: nazhika(frac((yogaS * 6) / 80) * 60),
    karana, karanaGatham: nazhika(frac(tithiD / 6) * 30),
    westernDow, indianDow, weekdayLord: WEEKDAY_LORD[indianDow],
    lagnaRasi: int(asc / 30), drekkana: int((asc % 30) / 10) + 1,
    veliHigh, angaditya,
    yogi, avayogi, yogiLord: nakLord(int(nakOf(yogi))), avayogiLord: nakLord(int(nakOf(avayogi))), sahayogi: SIGN_LORD[int(yogi / 30)],
    rithu, uttarayana,
    udayadi, asthamanadi, dinamanaMin, ratrimanaMin: 1440 - dinamanaMin,
    gulika,
    panchabhuta: panchabhuta(t, R, S),
    rasimana: rasimana(chart.ayanamsa, place.lat, sun, asc),
    malayalam: malayalamDate(swe, db, chart),
    saka: settings.sakaGovt ? sakaGovt(date, t) : sakaTraditional(swe, chart),
    kali: kali(date, t, R),
    tithiSphuta: tithiD, yogaSphuta: yogaS,
    pancha: panchaSphutas(chart.planets.Sun.lon),
  };
}

// 3.5 Dhuma group (from the TRUEPOS Sun)
export function panchaSphutas(sunLon) {
  const s = int(sunLon) + int(frac(sunLon) * 60) / 60;
  let dhuma = s + 133;
  if (dhuma > 360) dhuma -= 360;
  const vyatipata = 360 - dhuma;
  const tt = vyatipata < 180 ? vyatipata + 360 : vyatipata;
  const parivesha = tt - 180;
  const indrachapa = 360 - parivesha;
  let upaketu = indrachapa + 17;
  if (upaketu >= 360) upaketu -= 360;
  return { dhuma, vyatipata, parivesha, indrachapa, upaketu };
}

// 6.3
function panchabhuta(t0, R, S) {
  let t = t0;
  let span;
  let el;
  if (t >= S || t <= R) {
    span = 24 - S + R;
    if (t <= R) t += 24;
    el = t - S;
  } else {
    span = S - R;
    el = t - R;
  }
  const yamaLen = span / 8;
  const q = el / yamaLen;
  const yama = int(q) + 1;
  const yamaMin = yamaLen * 60;
  const m = frac(q) * yamaMin;
  const even = yama % 2 === 0;
  const B = (even ? [0, 6, 18, 36, 60, 90] : [0, 30, 54, 72, 84, 90]).map((v, k) => (k ? (v * yamaMin) / 90 : 0));
  const names = even ? [4, 3, 2, 1, 0] : [0, 1, 2, 3, 4]; // indexes into [Bhumi, Jala, Agni, Vayu, Akasha]
  let cur = 0;
  for (let k = 1; k <= 5; k++) if (B[k - 1] <= m && m <= B[k]) { cur = k - 1; break; }
  const dur = [0, 1, 2, 3, 4].map((k) => B[k + 1] - B[k]);
  const w = even ? [6, 12, 18, 24, 30][cur] : [30, 24, 18, 12, 6][cur];
  let rem = m - B[cur];
  let ant = 1;
  for (let i = 0; i < 5; i++) {
    const k = (((even ? cur - i : cur + i) % 5) + 5) % 5;
    rem -= (dur[k] * w) / 90;
    if (rem < 0) { ant = k; break; }
  }
  return { yama, bhuta: names[cur], antara: names[ant] };
}

// 6.4
function rasimana(ayanamsa, lat, sun, asc) {
  const D = 57.29578;
  const E = 0.40927970959267;
  const OMC = 0.082592306425;
  const asinS = (x) => (Math.abs(x) !== 1 ? Math.atan(x / Math.sqrt(1 - x * x)) : Math.sign(x) * 1.5707963267949);
  const decl = (L) => asinS(Math.sin(L / D) * E);
  const redu = (L) => -((Math.sin(L / D) * Math.cos(L / D) * OMC) / Math.cos(decl(L))) * D;
  const cara = (L) => -asinS((Math.sin(L / D) * E * Math.tan(lat / D)) / Math.cos(decl(L))) * D;
  const OA = (L) => L + cara(L) + redu(L);
  let prev = 0;
  const dur = [];
  for (let i = 0; i <= 12; i++) {
    const v = OA((i + 1) * 30 + ayanamsa);
    if (i < 12) dur[i] = (v - prev) / 6;
    else dur[0] = (v - prev) / 6;
    prev = v;
  }
  const sunSign = int(sun / 30);
  const lagnaSign = int(asc / 30);
  return {
    dur,
    sunSign, sunRem: (dur[sunSign] / 30) * (30 - frac(sun / 30) * 30),
    lagnaSign, lagnaGatham: (dur[lagnaSign] / 30) * ((asc / 30 - int(int(asc) / 30)) * 30),
  };
}

// ---- Malayalam date (5.6) ----
function monthId(db, sunLon) {
  return +db.tblMalayalamMonths.find((r) => sunLon >= +r.LValue && sunLon <= +r.HValue && +r.HValue !== sunLon)._id;
}
function malayalamDate(swe, db, chart) {
  const { date, t, place, settings } = chart;
  const { R } = chart.sun;
  const base = t >= R ? date : addDays(date, -1);
  const sunAt = (jd) => calc(swe, jd, 0, F_TRUE_NOSPD).lon;
  const jd0 = (dt) => swe.swe_julday(dt.y, dt.m, dt.d, 0, 1);
  let cutFor;
  if (settings.kollamEra === 1) {
    // North Kerala: Sun sign at sunrise (sunrise hour of the birth date reused for every day)
    const hr = chart.sun.riseJd - jd0(date);
    cutFor = (dt) => jd0(dt) + hr;
  } else {
    // South Kerala: Sun sign at 3/5 of the daytime
    const first = chart.sun.riseJd + (chart.sun.setJd - chart.sun.riseJd) * 0.6 - jd0(date);
    cutFor = (dt) => {
      if (dt === base) return jd0(dt) + first;
      const s = sunTimes(swe, dt, place, settings.sunrise);
      return s.riseJd + (s.setJd - s.riseJd) * 0.6;
    };
  }
  const sign0 = monthId(db, sunAt(cutFor(base)));
  let k = 1;
  let prev = base;
  for (; k < 33; k++) {
    prev = addDays(base, -k);
    if (monthId(db, sunAt(cutFor(prev))) !== sign0) break;
  }
  const month0 = prev.m - 1;
  const kollam = sign0 >= 5 && sign0 <= 9 && month0 >= 7 && month0 <= 11 ? prev.y - 824 : prev.y - 825;
  return { day: k, month: sign0, year: kollam };
}

// ---- Saka (5.7) ----
const SAKA_CUM = [[0, 30, 61, 92, 123, 154, 185, 215, 245, 275, 305, 335, 365], [0, 31, 62, 93, 124, 155, 186, 216, 246, 276, 306, 336, 366]];
function sakaGovt(date, t, year = date.y) {
  const leap = isLeap(year);
  const startN = dayNum(year, 3, leap ? 21 : 22);
  const birthN = dayNum(date.y, date.m, date.d);
  if (!(birthN + t / 24 > startN)) return sakaGovt(date, t, year - 1);
  const n = birthN - startN + 1;
  const cum = SAKA_CUM[leap ? 1 : 0];
  let i = 1;
  while (i < cum.length && cum[i] < n) i++;
  const saka = year - 78;
  return { month: i - 1, day: n - cum[i - 1], saka, samvatsara: (saka + 11) % 60, adhika: false };
}

function sakaTraditional(swe, chart, year = chart.date.y) {
  const { date, place } = chart;
  const hr = chart.sun.riseJd - swe.swe_julday(date.y, date.m, date.d, 0, 1);
  const at = (dt) => swe.swe_julday(dt.y, dt.m, dt.d, 0, 1) + hr;
  const tithiAt = (dt) => {
    const j = at(dt);
    return int(mod360(calc(swe, j, 1, F_APP).lon - calc(swe, j, 0, F_APP).lon) / 12 + 1);
  };
  const solarAt = (dt) => int(calc(swe, at(dt), 0, F_TRUE_NOSPD).lon / 30) + 1;
  let c = { y: year, m: 4, d: 14 };
  do c = addDays(c, -1); while (![1, 30].includes(tithiAt(c)));
  const bounds = [c];
  const solar = [solarAt(c)];
  for (let i = 0; i < 13; i++) {
    c = addDays(c, 25);
    do c = addDays(c, 1); while (![1, 2, 30].includes(tithiAt(c)));
    bounds.push(c);
    solar.push(solarAt(c));
  }
  const N = (x) => dayNum(x.y, x.m, x.d);
  const bN = N(date);
  if (!(bN > N(bounds[0]))) return sakaTraditional(swe, chart, year - 1);
  let adhikaIdx = -1;
  for (let i = 1; i < solar.length; i++) if (solar[i] === solar[i - 1]) { adhikaIdx = i - 1; break; }
  let k = 0;
  for (let i = 0; i < bounds.length - 1; i++) if (N(bounds[i]) < bN && bN <= N(bounds[i + 1])) { k = i; break; }
  const month = adhikaIdx >= 0 && k > adhikaIdx ? k - 1 : k;
  const saka = year - 78;
  void place;
  return { month: month % 12, day: bN - N(bounds[k]) + 1, saka, samvatsara: (saka + 11) % 60, adhika: adhikaIdx >= 0 && k === adhikaIdx };
}

function kali(date, t, R) {
  const N = dayNum(date.y, date.m, date.d) - dayNum(1900, 1, 1);
  return {
    gatha: N + (t < R ? 1826554 : 1826555),
    thaddina: N + (t >= R ? 1826555 : 1826554) + 1,
    year: int((N + 1826555) / 365.2425 + 1),
  };
}

// ---- Vimshottari dasa (section 7) ----
export function dasaTable(db) {
  return db.tblDasa.map((r) => ({ id: +r._id, years: +r.DasaYear, ml: r.Malayalam, lord: r.Lord, full: r.full, abbr: r.NakshatraLord }));
}

export function dasa(db, chart, refLon) {
  const D = dasaTable(db);
  const Y = chart.settings.yearLength;
  const n = nakOf(refLon);
  const i = int(n);
  const lordId = (i + 1) % 9 || 9;
  const first = D[lordId - 1];
  const elapsedDays = frac(n) * first.years * Y;
  const balanceYears = (1 - frac(n)) * first.years;
  // balance split into years, months and days of the remaining period
  const yy = int(balanceYears);
  const mmf = frac(balanceYears) * 12;
  const balance = { years: yy, months: int(mmf), days: int((frac(mmf) * Y) / 12), lord: first };

  const birthN = dayNum(chart.date.y, chart.date.m, chart.date.d);
  const start0 = birthN - Math.round(elapsedDays);
  const periods = [];
  let cum = 0;
  let prevEnd = start0;
  for (let k = 0; k < 9; k++) {
    const d = D[(lordId - 1 + k) % 9];
    cum += d.years * Y;
    const end = start0 + Math.round(cum);
    periods.push({ dasa: d, start: prevEnd, end, years: d.years });
    prevEnd = end;
  }
  return { lordId, balance, periods, birthN, Y, D };
}

// sub-periods of a period lasting `years` (scaled), starting at day `start`, beginning with lord `firstId`
export function subPeriods(D, Y, firstId, years, start) {
  const out = [];
  let cum = 0;
  let prev = start;
  for (let k = 0; k < 9; k++) {
    const d = D[(firstId - 1 + k) % 9];
    const subYears = (d.years * years) / 120;
    cum += subYears * Y;
    const end = start + Math.round(cum);
    out.push({ dasa: d, start: prev, end, years: subYears });
    prev = end;
  }
  return out;
}

// ---- Bhava (section 8) ----
export function bhava(swe, chart, flag) {
  const hs = chart.settings.house;
  const cusp = [null];
  if (hs === 0) for (let k = 1; k <= 12; k++) cusp[k] = 15 + 30 * (k - 1);
  else {
    const h = swe.swe_houses_ex(chart.jd, flag, chart.place.lat, chart.place.lon, HOUSE_HSYS[hs]);
    for (let k = 1; k <= 12; k++) cusp[k] = mod360(h.cusps[k]);
  }
  const mid = (a, b) => (a < b ? (a + b) / 2 : ((a + 360 + b) / 2) % 360);
  const inRange = (x, s, e) => (s <= e ? x >= s && x < e : x >= s || x < e);
  const houses = [];
  for (let k = 1; k <= 12; k++) {
    const prev = k === 1 ? 12 : k - 1;
    const next = k === 12 ? 1 : k + 1;
    let start = mid(cusp[prev], cusp[k]);
    const end = mid(cusp[k], cusp[next]);
    if (hs === 0 && k === 1) start = 0;
    houses.push({
      k, start, madhya: cusp[k], end,
      planets: ORDER.filter((p) => inRange(chart.planets[p].lon, start, end)),
    });
  }
  return houses;
}
