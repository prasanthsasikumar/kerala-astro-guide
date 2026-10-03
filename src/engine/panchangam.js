// Daily panchangam (Divasa panchangam) and the pieces shared with Prashnam:
// the Time tab values (flags 65616), Guna-dosham, ghatika windows,
// plus the divasa-only tabs (lagna pakarcha, kalahora, muhurtham, upagraha, panchanga phalam,
// mrityudosham). Pure functions over swe/db/chart; `chart` comes from core.computeChart.
import { F_APP, F_TRUE_NOSPD, ascAt, mod360, frac, int, nakOf, SIGN_LORD, ORDER } from "./core.js";
import { MRITYU_TEXT } from "@private/texts.js";

export const F_TIME = 65616; // SIDEREAL|NONUT|TRUEPOS (prashnam / divasa time tabs)
const NAK_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
export const WEEKDAY_LORD = [null, "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
const TITHI_LORD = { 1: "Mars", 2: "Venus", 3: "Mercury", 4: "Moon", 5: "Sun", 6: "Jupiter", 7: "Saturn", 8: "Rahu" };

export const byId = (tbl, id) => tbl.find((r) => +r._id === +id);
const lonOf = (swe, jd, ipl, flag) => mod360(swe.swe_calc_ut(jd, ipl, flag)[0]);
export const tm60 = (x) => ({ n: int(x), v: int(frac(x) * 60) }); // nazhika / vinazhika

// 12-hour clock "h:mm am" with wrap at 24 
export function ampm(hours) {
  let m = Math.round(hours * 60);
  m = ((m % 1440) + 1440) % 1440;
  const h = int(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${suffix}`;
}

// ---------------------------------------------------------------------------------------------
// Time tab (prashnam / divasa): sun, moon, lagna with flags 65616; calendar values reused from chart.time
// ---------------------------------------------------------------------------------------------
export function timeData(swe, chart) {
  const { jd, place, settings } = chart;
  const sun = lonOf(swe, jd, 0, F_TIME);
  const moon = lonOf(swe, jd, 1, F_TIME);
  const asc = ascAt(swe, jd, F_TIME, place);
  const nk = nakOf(moon);
  const f = frac(nk);
  let tithiAng = moon - sun;
  if (tithiAng < 0) tithiAng += 360;
  let yogaAng = moon + sun;
  if (yogaAng > 360) yogaAng -= 360;
  const tithi = int(tithiAng / 12 + 1);
  const yoga = int((yogaAng * 6) / 80 + 1);
  let yoga2 = yoga + 7;
  if (yoga2 > 27) yoga2 -= 27;
  const ti = tithi > 15 ? tithi - 15 : tithi;
  const kunda = frac((asc * 81) / 360) * 360;

  // veli
  const li = int(asc / 30) + 1;
  let mi = int(moon / 30) + 1;
  if (moon <= asc) mi += 12;
  const veliHigh = [0, 4, 5, 6, 10, 11].includes(mi - li);

  // angaditya
  const ai = int((moon * 6) / 80) + 1;
  const aj = int((sun * 6) / 80) + 1;
  const ad = ai - aj;
  const an = ad < 0 ? ai + 27 - aj + 1 : ad + 1;
  const angaditya = an <= 3 ? 0 : an <= 6 ? 1 : an <= 11 ? 2 : an <= 19 ? 3 : 4;

  // yogi
  let yogi = yogaAng + 93.33333333333333;
  if (yogi > 360) yogi -= 360;
  let avayogi = yogi + 186.66666666666666;
  if (avayogi > 360) avayogi -= 360;

  // rasimana: durations from the core (depend only on ayanamsa + latitude)
  const dur = chart.time.rasimana.dur;
  const sunSign = int(sun / 30);
  const lagnaSign = int(int(asc) / 30);

  const rl = settings.rithuSayana ? mod360(sun + chart.ayanamsa) : sun;
  return {
    sun, moon, asc,
    nakIdx: int(nk) + 1, pada: int(f * 4) + 1, nakLord: NAK_LORDS[int(nk) % 9], nakGatham: tm60(f * 60),
    chandrakriya: int(f * 60) + 1, chandravastha: int(12 * f) + 1, chandravela: int(f * 36) + 1,
    koor: int(moon / 30), kundaNak: int((kunda * 6) / 80) + 1, lagnaNak: int((asc * 6) / 80) + 1,
    njattuvela: int((sun * 60) / 800) + 1,
    tithiAng, tithi, tithiLord: TITHI_LORD[ti > 8 ? ti - 8 : ti], tithiGatham: tm60(frac(tithiAng / 12) * 60),
    yogaAng, yoga, yoga2, yogaLords: [NAK_LORDS[(yoga - 1) % 9], NAK_LORDS[(yoga2 - 1) % 9]], yogaGatham: tm60(frac((yogaAng * 6) / 80) * 60),
    karana: int(tithiAng / 6 + 1), karanaGatham: tm60(frac(tithiAng / 6) * 30),
    dagdhaIdx: int(tithiAng / 12) % 15,
    lagnaRasi: lagnaSign, drekkana: int((asc % 30) / 10) + 1,
    veliHigh, angaditya,
    yogi, avayogi, yogiNak: int((yogi * 6) / 80) + 1, avayogiNak: int((avayogi * 6) / 80) + 1, sahayogi: int(yogi / 30),
    rasimana: {
      dur, sunSign, lagnaSign,
      sunRem: (dur[sunSign] / 30) * (30 - frac(sun / 30) * 30),
      lagnaGatham: (dur[lagnaSign] / 30) * ((asc / 30 - lagnaSign) * 30),
    },
    rithu: int(rl / 60),
    uttarayana: rl < 90 || rl >= 270,
    indianDow: chart.time.indianDow, westernDow: chart.time.westernDow,
  };
}

// ---------------------------------------------------------------------------------------------
// Guna-dosham. Uses the TRUEPOS chart (Sphutas tab). Labeller L turns ids into names.
// ---------------------------------------------------------------------------------------------
export const ML_NAMES = (db) => ({
  nak: (i) => db.tblMalayalamNakshatra[i - 1].Name,
  wd: (i) => byId(db.tblWeekdayResult, i).Weekmal,
  tithi: (i) => byId(db.tblThidhi, i).Malayalam,
  karana: (i) => byId(db.tblKaranam, i).Html,
  rasi: (i) => byId(db.tblMalayalamMonths, i + 1).Malayalam,
});

const sphutaStr = (lon) => {
  const i = int(lon + 1.3888888888888889e-8);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(int(i / 30))} - ${p(i % 30)} - ${p(int(frac(lon) * 60))}`;
};
export { sphutaStr as fmtRBK };

const DOSHANGAL = (db, wd) => {
  const r = byId(db.tblPrasnaDoshangal, wd);
  return { mrithynak: +r.mrithynak, dagdha: +r.dagdha, asubha: +r.asubha, amrithasidhi: +r.amrithasidhi };
};

export function ghatika(db, nk, moon, tithiAng, kind) {
  const row = db.tblMalayalamNakshatra[nk - 1];
  const s = kind === "mrityu" ? (tithiAng < 150 ? row.suklapaksham : row.krishnapaksham) : row[kind];
  const [a, b] = s.split("-").map(parseFloat);
  const [s0, e0] = kind === "ushnam" ? [a, b] : [a - 1, b - 1];
  const base = ((nk - 1) * 800) / 60;
  const start = base + (s0 * 800) / 3600;
  const end = base + (e0 * 800) / 3600;
  const shownEnd = kind === "ushnam" ? b : int(b) - 1;
  // "Moon inside the window"
  const present = start < moon && moon <= end;
  const f1 = (x) => String(Math.round(x * 10) / 10);
  const dm = (x) => `${int(x)}°${int(frac(x) * 60)}`;
  const ch = `ച: ${dm(start)}-${dm(end)}`;
  const na = `നാ.: ${f1(a)}-${f1(shownEnd)}`;
  const mo = `ച.സ്ഫു.: ${int(moon)}°${int(frac(moon) * 60)}`;
  return { present, start, end, detail: present ? [ch, na, mo] : [na, ch, mo] };
}

const AMRITA_YOGA = [[3, [5, 20, 7, 22], 4], [5, [2, 17, 7, 22, 12, 27], 7], [12, [11, 26, 6, 21, 11, 26], 6], [15, [1, 16, 6, 21, 11, 26], 7], [17, [5, 20, 7, 22], 4], [20, [2, 17, 7, 22, 12, 27], 7], [21, [1, 16, 6, 21, 11, 26], 6], [27, [13, 28], 5]];
const SIDDHA = [[7, 15, 23, 24], [17, 2, 27], [5, 17, 12, 21, 4], [17, 1, 15, 7, 8], [12, 13, 14, 19, 27, 1], [4, 3, 15, 16, 17, 24], [12, 21, 26, 20, 27]];
const VISHA_YOGA = [[1, 5, 3], [2, 2, 14], [3, 15, 4], [4, 7, 2], [5, 13, 17], [6, 6, 22], [7, 8, 27], [1, 20, 3], [2, 17, 14], [4, 22, 2], [5, 28, 17], [6, 21, 22], [7, 23, 27]];
const VT = [[4], [4, 6], [6], [], [3], [1, 2], [1, 2, 3], [3, 4, 5, 6], [4, 6, 7], [3, 6], [2, 6, 7], [1, 5], [6], [], []];
const VN = [[1, 4], [1, 4, 6], [1, 5], [5, 6], [1, 5], [3, 5], [7], [2, 6, 7], [6], [1, 2, 6], [], [2, 5, 7], [6, 7], [2, 5, 7], [6], [1, 2, 3, 4, 6], [1, 2], [1, 3], [4], [2, 3, 7], [2, 3, 7], [3, 7], [1, 3, 4], [3, 5], [3, 4], [2], [3, 4, 6]];
const RIKSHA = [[1, 20], [16, 20], [5, 3], [20, 3], [8, 25], [23, 25], [10, 4], [25, 4], [12, 9], [27, 9], [13, 12], [28, 12]];
const DINAGADA = [[2, 2], [5, 4], [9, 1], [12, 3], [15, 4], [19, 2], [22, 3], [26, 1]];
const DINAMRITYU = [[2, 4], [6, 2], [9, 4], [13, 1], [16, 2], [19, 4], [23, 1], [26, 3]];
const pushkaram = (lag, vals) => {
  const r = int(int(lag) / 30);
  const v = vals[r % 4];
  const d = lag % 30;
  return v - 1 < d && d <= v;
};

/**
 * @param chart core chart (TRUEPOS planets, sun times with the sunrise setting)
 * @param birthNak1 querent / birth star 1..27
 * @param L labeller (defaults to Malayalam names)
 */
export function gunaDosham(db, chart, birthNak1, L = ML_NAMES(db)) {
  const P = chart.planets;
  const moon = P.Moon.lon, sun = P.Sun.lon, lag = P.Lagna.lon;
  const lagR = P.Lagna.rasi, mandiR = P.Mandi.rasi, sunR = P.Sun.rasi;
  const nk = int((moon * 6) / 80) + 1;
  const pada = int(frac((moon * 6) / 80) * 4) + 1;
  let ti = moon - sun;
  if (ti < 0) ti += 360;
  const tithi = int(ti / 12 + 1);
  const karana = int(ti / 6 + 1);
  // tithi-koopam uses the elapsed part of the tithi in nazhika
  const tithiNazhika = frac(ti / 12) * 60;
  const { R, S } = chart.sun;
  const t = chart.t;
  const wd = chart.time.indianDow; // FIX: sunrise setting, weekday 0 -> Saturday
  const D = DOSHANGAL(db, wd);
  const Oa = L.nak(nk), Na = L.wd(wd), Pa = L.tithi(tithi), Qa = L.karana(karana);
  const row = (ml, en, present, good, detail = []) => ({ ml, en, present, good, detail });
  const sid = int(sun / 30) + 1; // tblMalayalamMonths id by sun longitude (LValue <= sun < HValue)
  const gh = (k) => ghatika(db, nk, moon, ti, k);
  const tm = (n) => ampm(R + n / 2.5);

  const guna = [
    row("ഊണ്‍നാൾ", "Oon naal", [1, 4, 5, 7, 8, 12, 13, 14, 15, 17, 21, 22, 23, 24, 26, 27].includes(nk), true, [Oa]),
    (() => { const g = gh("amritham"); return row("അമൃതഘടിക", "Amrita ghatika", g.present, true, g.detail); })(),
    row("സിദ്ധയോഗം", "Siddha yoga", SIDDHA[wd - 1].includes(nk), true, [`${Oa}, ${Na}`]),
    row("അമൃതയോഗം", "Amrita yoga", AMRITA_YOGA.some(([n, ts, w]) => n === nk && w === wd && ts.some((x) => tithi === x || ti + 15 === x)), true, [`${Oa}, ${Na}, ${Pa}`]),
    row("അമൃതസിദ്ധിയോഗം", "Amrita siddhi yoga", nk === D.amrithasidhi, true, [`${Oa}, ${Na}`]),
    row("ശുഭപുഷ്കരം", "Shubha pushkaram", pushkaram(lag, [21, 14, 24, 7]), true),
  ];

  const lan = (s) => [10, 8, 6, 4, 2, 27, 24, 22, 20, 18, 15, 13][s - 1];
  const vai = (s) => [24, 22, 20, 18, 15, 13, 10, 8, 6, 4, 2, 27][s - 1];
  let ya = moon + sun;
  if (ya > 360) ya -= 360;
  const e = int(((360 - sun) * 6) / 80) + 1;
  let ek = nk - e + 1;
  if (ek <= 0) ek += 27;
  let vk = nk - birthNak1 + 1;
  if (vk < 0) vk += 27;
  const VIPAT = { 3: "വിപത് നക്ഷത്രം", 5: "പ്രത്യര നക്ഷത്രം", 7: "വധ നക്ഷത്രം" };
  const dk = int(frac(lag / 30) * 3) + 1;
  const K = +byId(db.tblThidhi, tithi).Thidhikupam;
  const t15 = tithi > 15 ? tithi - 15 : tithi;
  const sd = (sunR + 6) % 12; // wrap-around at 12 signs

  const dosha = [
    row("ഗണ്ഡാന്തം", "Gandantham", (lag > 356.4 && lag <= 360) || (lag > 0 && lag <= 3.2) || (lag > 86.4 && lag <= 93.2) || (lag > 236.4 && lag <= 243.2), false, [`ല - ${sphutaStr(lag)}`]),
    (() => { const g = gh("ushnam"); return row("ഉഷ്ണഘടിക", "Ushna ghatika", g.present, false, g.detail); })(),
    (() => { const g = gh("visham"); return row("വിഷഘടിക", "Visha ghatika", g.present, false, g.detail); })(),
    row("വിഷയോഗം", "Visha yoga", VISHA_YOGA.some(([w, tt, n]) => w === wd && tt === tithi && n === nk), false, [`${Oa}, ${Na}, ${Pa}`]),
    row("വിഷദ്രേക്കാണം", "Visha drekkana", dk === [1, 2, 2, 1, 1, 1, 2, 3, 1, 1, 2, 2][lagR], false, [`${L.rasi(lagR)}, ദ്രേക്കാണം-${dk}`]),
    row("അഷ്ടമി", "Ashtami", [8, 23].includes(tithi), false, [Pa]),
    row("വിഷ്ടി", "Vishti", [8, 15, 22, 29, 36, 43, 50, 57].includes(karana), false, [Qa]),
    row("രിക്ത", "Riktha", [4, 9, 14, 19, 24, 29].includes(tithi), false, [Pa]),
    row("സ്ഥിരകരണം", "Sthira karanam", [1, 58, 59, 60].includes(karana), false, [Qa]),
    row("തിഥിസന്ധി", "Tithi sandhi", ti % 12 > 11.98 || ti % 12 < 0.2, false, [sphutaStr(ti)]),
    row("നക്ഷത്രസന്ധി", "Nakshatra sandhi", (moon * 60) % 800 > 787.66666 || (moon * 60) % 800 < 13.33333, false, [sphutaStr(moon)]),
    row("രാശിസന്ധി", "Rasi sandhi", lag % 30 > 29 || lag % 30 < 1, false, [sphutaStr(lag)]),
    row("ഗുളികോദയം", "Gulikodayam", lagR === mandiR, false, [`ഗുളിക രാശി - ${L.rasi(mandiR)}`]),
    row("ലാടം", "Laadam", nk === lan(sid), false, [`${L.rasi(sid - 1)}, ${Oa}`]),
    row("വൈധൃതം", "Vaidhritham", nk === vai(sid), false, [`${L.rasi(sid - 1)}, ${Oa}`]),
    row("അഹിമസ്തകം", "Ahimasthakam", ya > 220 && ya <= 226.6666666, false),
    row("ഏകാർഗ്ഗളം", "Ekargalam", [2, 7, 10, 11, 16, 18, 20].includes(ek), false, [`${L.nak(e > 27 ? e - 27 : e)},${Oa}`]),
    row("മൃത്യുയോഗം", "Mrityu yoga", nk === D.mrithynak, false, [`${Oa}, ${Na}`]),
    (() => { const g = gh("mrityu"); return row("മൃത്യുഭാഗ", "Mrityu bhaga", g.present, false, g.detail); })(),
    row("ദഗ്ദ്ധയോഗം", "Dagdha yoga", tithi === D.dagdha || tithi === D.dagdha + 15, false, [`${Pa}, ${Na}`]),
    row("നിശീഥം (രാത്രി)", "Nisheetham (night)", R > t || S <= t, false),
    row("സൂര്യദൃഷ്ടി", "Surya drishti", sd === lagR, false),
    row("സംക്രമം", "Sankramam", sun % 30 > 29.75 || sun % 30 < 0.25, false, [sphutaStr(sun)]),
    row("വിപത്പ്രത്യരവധം", "Vipat / pratyara / vadha", vk in VIPAT, false, vk in VIPAT ? [VIPAT[vk]] : []),
    row("അശുഭയോഗം", "Ashubha yoga", nk === D.asubha, false, [`${Oa}, ${Na}`]),
    row("തിഥികൂപം", "Tithi koopam", K - 1 < tithiNazhika && tithiNazhika <= K, false, [`${Pa} കൂപം.നാ -${K}`, `${tm(K - 1)}-${tm(K)}`]),
    row("വാര-തിഥി ദുഷ്ടം", "Vara-tithi dushtam", VT[t15 - 1].includes(wd), false, [`${Pa}, ${Na}`]),
    row("വാര-നക്ഷത്ര ദുഷ്ടം", "Vara-nakshatra dushtam", VN[nk - 1].includes(wd), false, [`${Oa}, ${Na}`]),
    row("ഋക്ഷലുഞ്ചി", "Rikshalunchi", RIKSHA.some(([tt, n]) => tt === tithi && n === nk), false, [Oa, Pa]),
    row("നിന്ദ്യപുഷ്കരം", "Nindya pushkaram", pushkaram(lag, [1, 24, 6, 24]), false),
    row("ദിനഗദം", "Dinagadam", DINAGADA.some(([n, p]) => n === nk && p === pada), false, [`${Oa} പാദം -${pada}`]),
    row("ദിനമൃത്യു", "Dinamrityu", DINAMRITYU.some(([n, p]) => n === nk && p === pada), false, [`${Oa} പാദം -${pada}`]),
  ];
  return { guna, dosha, nk, pada, tithi, karana, wd };
}

// ---------------------------------------------------------------------------------------------
// Divasa-only tabs
// ---------------------------------------------------------------------------------------------
const dayNight = (chart) => {
  const { R, S } = chart.sun;
  return { R, S, dayLen: S - R, nightLen: 24 - S + R };
};
// local time on the "Hindu day" axis (sunrise .. next sunrise)
const hinduT = (chart) => (chart.t < chart.sun.R ? chart.t + 24 : chart.t);

// Lagna pakarcha: finds the real previous crossing and starts at local midnight of the chosen date (times are hours after that midnight; > 24 = next day).
export function lagnaPakarcha(swe, chart) {
  const { date, place } = chart;
  const jd0 = swe.swe_julday(date.y, date.m, date.d, 0, 1) - place.tz / 24;
  const asc = (jd) => ascAt(swe, jd, F_APP, place);
  const signed = (jd, target) => mod360(asc(jd) - target + 180) - 180;
  const step = 5 / 1440;
  const bisect = (a, b, target) => {
    for (let i = 0; i < 40; i++) {
      const m = (a + b) / 2;
      if (signed(m, target) < 0) a = m;
      else b = m;
    }
    return (a + b) / 2;
  };
  const crossAfter = (jd, target) => {
    let a = jd;
    while (signed(a + step, target) < 0 || signed(a + step, target) > 90) a += step;
    return bisect(a, a + step, target);
  };
  const crossBefore = (jd, target) => {
    let b = jd;
    while (signed(b - step, target) >= 0 && signed(b - step, target) < 90) b -= step;
    return bisect(b - step, b, target);
  };
  const hrs = (jd) => (jd - jd0) * 24;
  const a0 = asc(jd0);
  let sign = int(a0 / 30);
  let start = crossBefore(jd0, sign * 30);
  const rows = [];
  // rows until the whole civil day (local 0h..24h) is covered: 12 or 13 rows
  while (rows.length < 14 && hrs(start) < 24) {
    const nb = ((sign + 1) % 12) * 30;
    const end = crossAfter(start + step, nb);
    const s = hrs(start), e = hrs(end);
    rows.push({ rasi: sign, start: s, end: e, now: s <= chart.t && chart.t < e });
    start = end;
    sign = (sign + 1) % 12;
  }
  return rows;
}

// Kalahora
const HORA_LORDS = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"];
const HORA_START = [null, 0, 3, 6, 2, 5, 1, 4]; // by weekday 1..7
export function kalahora(chart) {
  const { R, S, dayLen, nightLen } = dayNight(chart);
  const tt = hinduT(chart);
  let idx = HORA_START[chart.time.indianDow];
  const mk = (from, step) => Array.from({ length: 12 }, (_, k) => {
    const s = from + k * step, e = s + step;
    return { lord: HORA_LORDS[idx++ % 7], start: s, end: e, now: s <= tt && tt < e };
  });
  const day = mk(R, dayLen / 12);
  const night = mk(S, nightLen / 12);
  return { day, night };
}

// Muhurtham: 15 day + 15 night muhurthas
export function muhurtham(db, chart) {
  const { R, S, dayLen, nightLen } = dayNight(chart);
  const tt = hinduT(chart);
  const rows = [];
  for (let k = 1; k <= 30; k++) {
    const night = k > 15;
    const step = night ? nightLen / 15 : dayLen / 15;
    const s = (night ? S : R) + ((k - 1) % 15) * step;
    const e = s + step;
    const r = byId(db.tblMuhurtham, k);
    rows.push({ k, name: r.Name, phalam: r.Phalam ?? null, start: s, end: e, night, now: s <= tt && tt <= e });
  }
  const cur = rows.find((r) => r.now) || rows[0];
  return { day: rows.slice(0, 15), night: rows.slice(15), phalam: cur.phalam, current: cur.k };
}

// Upagraha kalam
const RAHU = [7, 1, 6, 4, 5, 3, 2];
const UPA_DAY = [
  ["Kalan", "കാലന്‍ (ര)", [0, 6, 5, 4, 3, 2, 1]], ["Paridhi", "പരിധി (ച)", [1, 0, 6, 5, 4, 3, 2]], ["Dhooman", "ധൂമന്‍ (കു)", [2, 1, 0, 6, 5, 4, 3]],
  ["Ardhaprahara", "അര്‍ദ്ധപ്രഹരന്‍ (ബു)", [3, 2, 1, 0, 6, 5, 4]], ["Yamakantaka", "യമകണ്ടകന്‍ (ഗു)", [4, 3, 2, 1, 0, 6, 5]],
  ["Yamasukra", "യാമശുക്രന്‍ (ശു)", [5, 4, 3, 2, 1, 0, 6]], ["Gulikan", "ഗുളികന്‍ (മ)", [6, 5, 4, 3, 2, 1, 0]],
];
const UPA_NIGHT = [[3, 2, 1, 0, 6, 5, 4], [4, 3, 2, 1, 0, 6, 5], [5, 4, 3, 2, 1, 0, 6], [6, 5, 4, 3, 2, 1, 0], [0, 6, 5, 4, 3, 2, 1], [1, 0, 6, 5, 4, 3, 2], [2, 1, 0, 6, 5, 4, 3]];
export function upagraha(chart) {
  const { R, S, dayLen, nightLen } = dayNight(chart);
  const dp = dayLen / 8, np = nightLen / 8;
  const tt = hinduT(chart);
  const dow = chart.time.indianDow;
  const slot = (en, ml, base, len, k) => {
    const s = base + k * len, e = s + len;
    return { en, ml, start: s, end: e, now: s <= tt && tt < e };
  };
  let k = dow + 4;
  if (k > 7) k -= 7;
  return {
    rahu: [
      slot("Rahu (day)", "രാഹു (പകൽ)", R, dp, RAHU[dow - 1] ?? 0),
      // night Rahu measured from sunset in night parts
      slot("Rahu (night)", "രാഹു (രാത്രി)", S, np, RAHU[k - 1]),
    ],
    day: [...UPA_DAY.map(([en, ml, arr]) => slot(en, ml, R, dp, arr[dow - 1])), slot("No lord", "അധിപനില്ല", R, dp, 7)],
    night: [...UPA_DAY.map(([en, ml], i) => slot(en, ml, S, np, UPA_NIGHT[i][dow - 1])), slot("No lord", "അധിപനില്ല", S, np, 7)],
  };
}

// Panchanga phalam indices; uses the place's time zone and maps weekday 0 to Saturday.
export function panchangaPhalam(swe, db, chart, birthNak1) {
  const moon = lonOf(swe, chart.jd, 1, F_TRUE_NOSPD);
  const sun = lonOf(swe, chart.jd, 0, F_TRUE_NOSPD);
  const diff = mod360(moon - sun);
  let sum = moon + sun;
  if (sum > 360) sum -= 360;
  const tg = (int(diff / 12) + 1) % 5 || 5;
  const kar = int(diff / 6 + 1);
  const karId = [1, 58, 59, 60].includes(kar) ? kar : (((kar - 1) % 7) || 7) + 4;
  const mn = int((moon * 60) / 800) + 1;
  let n = mn >= birthNak1 ? mn - birthNak1 + 1 : 27 - birthNak1 + mn + 1;
  n = n % 9 || 9;
  const nitya = int((sum * 6) / 80 + 1);
  const dow = chart.time.indianDow;
  const T = byId(db.tblPanchangaThidhi, tg), Kr = byId(db.tblPanchangaKaranam, karId), Nk = byId(db.tblPanchNakshathram, n);
  const Ny = byId(db.tblPanchNithya, nitya), V = byId(db.tblPanchVaram, dow);
  return {
    tithi: { id: tg, name: T.Thidhi, text: T.Phalam },
    karana: { id: karId, name: Kr.karanam, text: Kr.phalam },
    nakshatra: { id: n, name: Nk.Nakshathram, text: Nk.Phalam },
    nitya: { id: nitya, name: Ny.Nithyayogam, text: Ny.Phalam },
    vara: { id: dow, name: V.varam, text: V.Phalam },
  };
}

// Mrityudosham
export function mrityudosham(swe, db, chart, L = ML_NAMES(db)) {
  const moon = lonOf(swe, chart.jd, 1, F_TRUE_NOSPD);
  const sun = lonOf(swe, chart.jd, 0, F_TRUE_NOSPD);
  const lagna = ascAt(swe, chart.jd, F_TRUE_NOSPD, chart.place);
  const dn = int((moon * 6) / 80) + 1;
  const vara = chart.time.indianDow;
  const lr = int(int(lagna) / 30) + 1;
  const vasu = [[23, 3], [24, 4], [25, 5], [26, 6], [27, 7]].some(([n, w]) => n === dn && w === vara);
  const kari = [2, 5, 8, 11].includes(lr) && [3, 4, 6, 7, 13, 14, 16, 18, 23, 27].includes(dn);
  const pinda = [2, 3, 6, 9, 11, 15, 18, 20, 25].includes(dn);
  const sn = int((sun * 60) / 800) + 1;
  const s2 = sn >= 22 ? sn + 1 : sn;
  const d2 = dn >= 22 ? dn + 1 : dn;
  let an = d2 - s2 + 1;
  if (an < 0) an += 28;
  const akan = [1, 2, 3, 4, 8, 9, 10, 11, 15, 16, 17, 18, 22, 23, 24, 25].includes(an);
  return {
    dn, vara, lagnaRasi: lr - 1, sunNak: sn,
    rows: [
      { key: "vasu", ml: "വസുപഞ്ചകം", en: "Vasu panchakam", present: vasu, detail: `${L.nak(dn)}, ${L.wd(vara)}` },
      { key: "kari", ml: "കരിനാള്‍", en: "Karinaal", present: kari, detail: `${L.nak(dn)}, ലഗ്നം - ${L.rasi(lr - 1)}` },
      { key: "pinda", ml: "പിണ്ഡനൂല്‍", en: "Pindanool", present: pinda, detail: L.nak(dn) },
      { key: "akan", ml: "അകന്നാള്‍", en: "Akannaal", present: akan, detail: `${akan ? "അകന്നാള്‍" : "പുറന്നാള്‍"}, ഞാറ്റുവേല നക്ഷത്രം - ${L.nak(sn)}, ദിവസ നക്ഷത്രം - ${L.nak(dn)}` },
    ],
  };
}


export { SIGN_LORD, ORDER, NAK_LORDS, MRITYU_TEXT };
