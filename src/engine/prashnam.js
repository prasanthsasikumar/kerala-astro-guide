// Prashnam (horary). Pure functions over swe/db/settings.
// Pipeline: input -> core chart (Sphutas tab, TRUEPOS) -> prashna sphutas -> the other tabs.
import { computeChart, ORDER, SIGN_LORD, frac, int, mod360 } from "./core.js";
import { timeData, byId, fmtRBK, NAK_LORDS, WEEKDAY_LORD } from "./panchangam.js";
import { PRASHNA } from "@private/texts.js";

// ---- input ----
export const DEFAULT_PRASHNA = { arudam: 0, nak: 0, tno: 4, ano: 121, swarnaRasi: 0, swarnamsha: 0 };

// Ashtamangala number: three digits each 1..8, digit sum 4, 12 or 20
export function validateAno(ano) {
  const s = String(ano ?? "").trim();
  if (s.length <= 2 || !/^\d+$/.test(s)) return "len";
  const n = parseInt(s, 10);
  const u = n % 10, t = int(n / 10) % 10, hd = int(n / 100);
  const sum = u + t + hd;
  return (sum === 4 || sum === 12 || sum === 20) && [u, t, hd].every((d) => d > 0 && d < 9) && hd < 9 ? null : "bad";
}

// ---- 2.3 arudha, 2.4 swarna ----
export const arudhaLon = (lagnaLon, arudam) => arudam * 30 + frac(lagnaLon / 30) * 30;
const SW = [[3, 18, 21, 6, 15, 24, 9, 12, 27], [27, 12, 9, 24, 15, 6, 21, 18, 3], [9, 6, 3, 12, 15, 18, 27, 24, 21], [21, 24, 27, 18, 15, 12, 3, 6, 9]];
export function swarna(swarnaRasi, amsha) {
  if (!(amsha > 0)) return null;
  const r1 = swarnaRasi + 1;
  const grp = [2, 10, 12].includes(r1) ? 3 : [4, 6, 8].includes(r1) ? 2 : [7, 9, 11].includes(r1) ? 1 : 0;
  const deg = SW[grp][amsha - 1];
  const nav = frac(((swarnaRasi * 30 + deg) * 9) / 360) * 360;
  return { rasi: swarnaRasi, navRasi: int(nav / 30) };
}

const store = (lon) => ({ lon, rasi: int(int(lon) / 30), navamsa: int(frac(lon / 40) * 12) });
const lordKeyOf = (db, r) => ORDER[byId(db.tblBavadhipan, r).adhipan - 1];

// ---- Prashna sphutas ----
export function prashnaSphutas(db, chart, arudam, sphutaSetting) {
  const tm = (x) => int(x) + int(frac(x) * 60) / 60;
  const n360 = (x) => frac(x / 360) * 360;
  const P = chart.planets;
  const L = tm(P.Lagna.lon), M = tm(P.Moon.lon), G = tm(P.Mandi.lon), S = tm(P.Sun.lon), R = tm(P.Rahu.lon), J = tm(P.Jupiter.lon), Sa = tm(P.Saturn.lon);
  let t = chart.t;
  if (t < chart.sun.R) t += 24;
  const gataNazhika = Math.abs(t - chart.sun.R) * 2.5;
  const aru = frac(L / 30) * 30 + arudam * 30;
  const base = sphutaSetting === 1 ? aru : L;
  const tri = n360(base + M + G);
  const chatu = n360(tri + S);
  const pancha = n360(chatu + R);
  const prana = n360(5 * base + G);
  const deha = n360(8 * M + G);
  const mrityu = n360(7 * G + S);
  const sukshmaTri = n360(prana + mrityu + deha);
  // /60 as in the traditional formula
  const bimbaSadhana = 360 - n360((gataNazhika * J) / 60 + base);
  const r = int(base / 30);
  const w = (x) => (x > 12 ? x - 12 : x);
  const lonLord = (x) => P[lordKeyOf(db, w(x))].lon;
  const lordSum = lonLord(r) + lonLord(r + 4) + lonLord(r + 7);
  const bimba = n360(bimbaSadhana + lordSum);
  const lagnaSurya = n360(S + base);
  // +150 deg as the "5th bhava sphuta" (kept convention)
  const sannidhya = n360(360 - n360(lordSum + base) + J + ((base + 150) % 360));
  const chaitanya = n360(tri * 9);
  // FIX: Saturn (manda) and x9 as the explanation text says; chaitanya.1 always uses arudha (text)
  const chaitanya1 = n360((Sa + M + aru) * 9);
  const chaitanya2 = n360((L + M + G) * 9);
  const list = [
    ["tri", "ത്രി.", "Tri", tri], ["chatu", "ചതു.", "Chatu", chatu], ["pancha", "പഞ്ച.", "Pancha", pancha],
    ["prana", "പ്രാണ.", "Prana", prana], ["deha", "ദേഹ.", "Deha", deha], ["mrityu", "മൃത്യു.", "Mrityu", mrityu],
    ["sukshmaTri", "സൂക്ഷ്മത്രി.", "Sukshma tri", sukshmaTri], ["bimbaSadhana", "ബിംബസാ.", "Bimba sadhana", bimbaSadhana],
    ["bimba", "ബിംബ.", "Bimba", bimba], ["lagnaSurya", "ലഗ്നസൂര്യ.", "Lagna-surya", lagnaSurya],
    ["sannidhya", "സാനിദ്ധ്യ.", "Sannidhya", sannidhya], ["chaitanya", "ചൈതന്യ.", "Chaitanya", chaitanya],
    ["chaitanya1", "ചൈതന്യ.1", "Chaitanya 1", chaitanya1], ["chaitanya2", "ചൈതന്യ.2", "Chaitanya 2", chaitanya2],
  ].map(([key, ml, en, lon]) => ({ key, ml, en, lon }));
  return { list, by: Object.fromEntries(list.map((x) => [x.key, x.lon])), base, aru, gataNazhika, lordSum };
}

export const SPHUTA_EXPLAIN = [
  ["ത്രിസ്ഫുടം", "ലഗ്നസ്ഫുടം + ചന്ദ്രസ്ഫുടം + മാന്ദിസ്ഫുടം"],
  ["ചതുസ്ഫുടം", "ത്രിസ്ഫുടം + സൂര്യസ്ഫുടം"],
  ["പഞ്ചസ്ഫുടം", "ചതുസ്ഫുടം + രാഹുസ്ഫുടം"],
  ["പ്രാണസ്ഫുടം", "ലഗ്നസ്ഫുടം x 5 + ഗുളികസ്ഫുടം"],
  ["ദേഹസ്ഫുടം", "ചന്ദ്രസ്ഫുടം x 8 + ഗുളികസ്ഫുടം"],
  ["മൃത്യുസ്ഫുടം", "ഗുളികസ്ഫുടം x 7 + സൂര്യസ്ഫുടം"],
  ["സൂക്ഷ്മത്രിസ്ഫുടം", "പ്രാണസ്ഫുടം + ദേഹസ്ഫുടം + മൃത്യുസ്ഫുടം"],
  ["ബിംബസാധനം", "360-([(വ്യാഴസ്ഫുടം × ഗതനാഴിക)/60]+ലഗ്നസ്ഫുടം)"],
  ["ബിംബസ്ഫുടം", "ബിംബസാധനം + ലഗ്നാധിപസ്ഫുടം + പഞ്ചമാധിപസ്ഫുടം + അഷ്ടമാധിപസ്ഫുടം"],
  ["ലഗ്നസൂര്യസ്ഫുടം", "ലഗ്നസ്ഫുടം + സൂര്യസ്ഫുടം"],
  ["സാന്നിദ്ധ്യസ്ഫുടം", "[360 - ( ലഗ്നാധിപസ്ഫുടം + പഞ്ചമാധിപസ്ഫുടം + അഷ്ടമാധിപസ്ഫുടം + ലഗ്നഭാവസ്ഫുടം)] + വ്യാഴസ്ഫുടം + പഞ്ചമഭാവസ്ഫുടം."],
  ["ചൈതന്യസ്ഫുടം", "ത്രിസ്ഫുടം x 9"],
  ["ചൈതന്യസ്ഫുടം2", "(മന്ദസ്ഫുടം + ചന്ദ്രസ്ഫുടം + ആരൂഢസ്ഫുടം) x 9"],
  ["ചൈതന്യസ്ഫുടം3", "(ലഗ്നസ്ഫുടം + ചന്ദ്രസ്ഫുടം + മാന്ദിസ്ഫുടം) x 9"],
];

// rasi - deg - min with ROUNDED minutes (can print 60)
export function fmtLd(x) {
  const i = int(x);
  let deg = i % 30;
  let m = frac(x) * 60;
  if (m >= 60) { deg++; m -= 60; }
  const p = (n) => String(n).padStart(2, "0");
  return `${p(int(i / 30))} - ${p(deg)} - ${p(Math.round(m))}`;
}

// ---- 7. Tamboolam ----
const TAM_PLANET = ["Saturn", "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus"];

export function veedhi(lagna, sun, arudam, method1) {
  const aru = arudhaLon(lagna, arudam);
  const lagnaR1 = int(lagna / 30) + 1, aruR1 = int(aru / 30) + 1;
  let n = lagnaR1;
  if (n < aruR1) n += 12;
  let cnt = n - aruR1;
  if (cnt < 0) cnt = 1;
  let v, ch;
  if (method1) {
    const dl = frac(lagna / 30) * 30;
    if (sun > 30 && sun < 150) v = dl;
    else if (sun <= 210 || sun >= 330) v = dl + 30;
    else v = 60 + dl;
    let k = cnt + int(v / 30);
    if (k > 12) k -= 12;
    ch = k * 30 + dl;
  } else {
    if (sun < 90 || sun >= 270) v = 90 - ((sun >= 0 && sun < 90 ? sun + 360 : sun) - 270) / 2;
    else v = (sun - 90) / 2;
    let k = cnt + int(v / 30);
    if (k > 12) k -= 12;
    ch = k * 30 + frac(v / 30) * 30;
  }
  if (ch > 360) ch -= 360;
  return { veedhi: v, veedhiRasi: int(v / 30) % 12, chatra: ch, chatraRasi: int(ch / 30) % 12 };
}

export function tamboolam(db, chart, inp, method1) {
  const P = chart.planets;
  const lagna = P.Lagna.lon, sun = P.Sun.lon;
  const aru = arudhaLon(lagna, inp.arudam);
  let r = inp.tno % 100;
  if (r === 0) r = 100;
  const g = (inp.tno * 10 + 1) % 7;
  const planet = TAM_PLANET[g];
  const tamRasi = P[planet].rasi;
  return {
    aru, ...veedhi(lagna, sun, inp.arudam, method1),
    tnoResult: byId(db.tbltbnoresult || [], r)?.result ?? null,
    planet, planetResult: PRASHNA?.TAM_PLANET_RESULT[g] ?? null,
    tamRasi, tamRasiResult: PRASHNA?.TAM_ARUDHA_RESULT[tamRasi] ?? null,
    swarna: swarna(inp.swarnaRasi, inp.swarnamsha),
  };
}

// ---- Sutrams ----
export const J = "ജീവൻ", R = "രോഗം", M = "മൃത്യു";
const COL = { Sun: "Sun", Moon: "Moo", Mars: "Mar", Mercury: "Mer", Jupiter: "Jup", Venus: "Ven", Saturn: "Sat" };
export function sutrams(db, chart, inp) {
  const P = chart.planets;
  const lagR1 = int(P.Lagna.lon / 30) + 1;
  const aru = arudhaLon(P.Lagna.lon, inp.arudam);
  const aruR1 = int(aru / 30) + 1;
  const navR1 = P.Lagna.navamsa + 1;
  const lagNak1 = int((P.Lagna.lon * 6) / 80) + 1;
  const prich = inp.nak + 1;
  const TBL = [[J, R, M], [R, M, J], [M, J, R]];
  const d = (x, y) => { const p = x % 3, q = y % 3; return TBL[p === 0 ? 2 : p - 1][q === 0 ? 2 : q - 1]; };
  const REL = { Mithram: J, Saman: R, Sathru: M };
  const lordId = (r0) => byId(db.tblBavadhipan, r0).adhipan;
  const rel = (x, y) => REL[byId(db.tblMatch, lordId(y - 1))[COL[ORDER[lordId(x - 1) - 1]]]];
  const adhipati = (x, y) => {
    const A = rel(x, y), B = rel(y, x);
    let res = M;
    if ((A === J && B === J) || (A === J && B === R)) res = J;
    else if (A === J && B === M) res = R;
    else if (A === R && B === J) res = J;
    else if ((A === R && B === R) || (A === M && B === J)) res = R;
    const ab = (s) => (s === J ? "ജീ" : s === R ? "രോ" : "മൃ");
    return { result: res, note: `${ab(A)}+${ab(B)}=` };
  };
  const nakS = (a, b) => { let k = a - b + 1; if (k < 0) k += 27; return [M, J, R][k % 3]; };
  const mahat = (x) => {
    let y = x + 9;
    if (y > 12) y -= 12;
    const S = [1, 2, 3, 4, 9, 10];
    return S.includes(x) && S.includes(y) ? J : S.includes(x) || S.includes(y) ? R : M;
  };
  const ano = inp.ano;
  const ash1 = () => { const s = (ano % 10) + (int(ano / 10) % 10) + int(ano / 100); return s === 4 ? J : s === 12 ? R : s === 20 ? M : "wrong ashtamangalasngya"; };
  const ash2 = () => ({ 1: J, 5: J, 2: R, 3: R, 6: R, 7: R, 4: M, 8: M })[int(ano / 10) % 10] ?? "wrong ashtamangalasngya";
  const gata = () => {
    let t = chart.t;
    if (t < chart.sun.R) t += 24;
    const n = Math.abs(t - chart.sun.R) * 2.5;
    const r = Math.round((int(n * 60) * 60) % 18);
    return r === 0 ? M : r === 6 ? J : r === 12 ? R : "wrong in gatanazhika";
  };
  const cnt = (i, i2) => (i2 > i ? 1 + (i2 - i) : i2 === i ? 1 : 1 + (i2 + 12 - i));
  const mc = cnt(P.Lagna.rasi, P.Mandi.rasi);
  const mandiS = [1, 4, 7, 10].includes(mc) ? M : [2, 5, 8, 11].includes(mc) ? R : J;
  const ad = adhipati(lagR1, aruR1);
  return [
    { ml: "സാമാന്യസൂത്രം", en: "Samanya sutram", result: d(aruR1, lagR1), bhutam: "പൃഥിവി", graham: "Mercury" },
    { ml: "അധിപതിസൂത്രം", en: "Adhipati sutram", result: ad.result, note: ad.note, bhutam: "ജലം", graham: "Venus" },
    { ml: "അംശകസൂത്രം", en: "Amshaka sutram", result: d(navR1, aruR1), bhutam: "അഗ്നി", graham: "Mars" },
    { ml: "നക്ഷത്രസൂത്രം", en: "Nakshatra sutram", result: nakS(prich, lagNak1), bhutam: "വായു", graham: "Saturn" },
    { ml: "മഹൽസൂത്രം", en: "Mahat sutram", result: mahat(aruR1), bhutam: "ആകാശം", graham: "Jupiter" },
    { ml: "അഷ്ടമംഗലസൂത്രം - 1", en: "Ashtamangala sutram 1", result: ash1() },
    { ml: "അഷ്ടമംഗലസൂത്രം - 2", en: "Ashtamangala sutram 2", result: ash2() },
    { ml: "ഗതനാഡികാസൂത്രം", en: "Gata-nadika sutram", result: gata() },
    { ml: "മാന്ദിസൂത്രം", en: "Mandi sutram", result: mandiS },
  ];
}

// ---- Prashna shadvarga ----
const MAL = ["Sun", "Mars", "Saturn"], BEN = ["Mercury", "Venus", "Jupiter", "Moon"];
export function shadvarga(db, chart, sph, arudam) {
  const ABBR = { "ര": "Sun", "ച": "Moon", "കു": "Mars", "ബു": "Mercury", "ഗു": "Jupiter", "ശു": "Venus", "മ": "Saturn" };
  const lordKey = (r) => lordKeyOf(db, r);
  const w12 = (x) => (x > 12 ? x - 12 : x);
  const tri = (even, d) => {
    const row = (even ? db.trisamsameven : db.trisamsamodd).find((x) => +x.Svalue <= d && d <= +x.Evalue);
    return ABBR[row.si];
  };
  // the prana row shows the prana sphuta
  const keys = ["tri", "chatu", "pancha", "prana", "deha", "mrityu", "sukshmaTri", "bimba", "lagnaSurya", "sannidhya", "chaitanya"];
  const items = keys.map((k) => { const s = sph.list.find((x) => x.key === k); return { ml: s.ml, en: s.en, lon: s.lon }; });
  items.push({ ml: "ആ.", en: "Arudha", lon: arudhaLon(chart.planets.Lagna.lon, arudam) });
  return items.map((it) => {
    const st = store(it.lon);
    const g = st.rasi;
    let a = st.navamsa;
    if (a === 0) a = 12;
    const deg = int(it.lon) % 30;
    const dis = frac(it.lon / 30) * 30;
    const D1 = lordKey(g);
    const D2 = (g + 1) % 2 !== 0 ? (deg < 15 ? "Sun" : "Moon") : deg >= 15 ? "Sun" : "Moon";
    const D3 = lordKey(deg < 10 ? g : deg < 20 ? w12(g + 4) : w12(g + 8));
    const D12 = lordKey(w12(int(dis / 2.5) + g));
    const D30 = tri(g % 2 === 1, int(dis));
    const D9 = lordKey(a);
    let mal = 0, ben = 0;
    // all six vargas counted the same way
    for (const x of [D3, D2, D9, D30, D12, D1]) {
      if (MAL.includes(x)) mal++;
      else if (BEN.includes(x)) ben++;
    }
    const tone = mal > 3 ? "bad" : mal < 3 && ben > 3 ? "good" : "mixed";
    return { ...it, D3, D2, D9, D30, D12, D1, mal, ben, tone };
  });
}

// ---- 11. Ashtamangalam ----
// planet of each ashtamangala digit; the other associations are optional texts
export const ASHTA = { graha: ["Sun", "Mars", "Jupiter", "Mercury", "Venus", "Saturn", "Moon", "Rahu"], ...PRASHNA?.ASHTA };
export const ashtamangalam = (ano) => [int(ano / 100), int(ano / 10) % 10, ano % 10];

// ---- 12. KP ruling planets ----
const SUB_Y = [7, 20, 6, 10, 7, 18, 16, 19, 17];
export function subLord(lon) {
  if (lon >= 360) lon -= 360;
  const f = (lon * 6) / 80;
  const i = int(f);
  const pos = frac(f) * 800;
  let k = i % 9, acc = 0, last = 0;
  while (pos >= acc) {
    acc += SUB_Y[k] * 6.666666666666667;
    last = k;
    k = k + 1 > 8 ? 0 : k + 1;
  }
  return NAK_LORDS[last];
}
export function kp(chart) {
  const P = chart.planets;
  const nakOf1 = (lon) => int((lon * 6) / 80) + 1;
  return {
    lagnaNak: nakOf1(P.Lagna.lon), lagnaNakLord: NAK_LORDS[(nakOf1(P.Lagna.lon) - 1) % 9],
    lagnaRasiLord: SIGN_LORD[P.Lagna.rasi],
    moonNak: nakOf1(P.Moon.lon), moonNakLord: NAK_LORDS[(nakOf1(P.Moon.lon) - 1) % 9],
    moonRasiLord: SIGN_LORD[P.Moon.rasi],
    // sunrise setting; Sunday before sunrise -> Saturday
    varaLord: WEEKDAY_LORD[chart.time.indianDow],
    lagnaSub: subLord(P.Lagna.lon), moonSub: subLord(P.Moon.lon),
  };
}

// ---- whole pipeline ----
export function computePrashna(swe, db, settings, inp) {
  const chart = computeChart(swe, db, settings, { name: "", gender: "Male", date: inp.date, time: inp.time, place: inp.place });
  const time = timeData(swe, chart);
  const aru = arudhaLon(chart.planets.Lagna.lon, inp.arudam);
  const sph = prashnaSphutas(db, chart, inp.arudam, settings.prasnaSphuta);
  return {
    inp, chart, time,
    arudha: { lon: aru, ...store(aru) },
    swarna: swarna(inp.swarnaRasi, inp.swarnamsha),
    sphutas: sph,
    tamboolam: tamboolam(db, chart, inp, settings.veedhiMethod1 !== false),
    sutrams: sutrams(db, chart, inp),
    shadvarga: shadvarga(db, chart, sph, inp.arudam),
    ashta: ashtamangalam(inp.ano),
    kp: kp(chart),
  };
}

export { fmtRBK, mod360 };
