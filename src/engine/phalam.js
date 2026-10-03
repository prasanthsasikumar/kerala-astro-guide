// Horoscope interpretation (phalam) tabs.
// Pure functions over (db = astro.json, yogam = yogam.json, chart from core.computeChart).
// Planets are addressed by row id (1 Lagna .. 11 Mandi).
import { addDays, mod360 } from "./core.js";
import { TEXTS } from "@private/phalam-texts.js";

export const ROW = [null, "Lagna", "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu", "Mandi"];
// tblBavadhipan: 0-based sign -> lord's chart row id
export const BAVADHIPAN = [4, 7, 5, 3, 2, 5, 7, 4, 6, 8, 8, 6];

const byId = (tbl, id) => tbl.find((r) => +r._id === id);
export const houseFrom = (from, to) => ((to - from + 12) % 12) + 1;
export const genderOf = (chart) => (chart.input.gender === "Male" ? "Male" : "Female");
const lonOf = (chart, id) => chart.planets[ROW[id]].lon;
// Ketu is always the true Ketu (Rahu + 180); core already stores it that way.
const signOf = (chart, id) => Math.floor(lonOf(chart, id) / 30);

// ---- Ashtakavarga: bhinnashtakavarga of the 7 planets ----
// NB: duplicates the bindu step of the Ashtakavarga tab (engine/ashtakavarga.js, another module).
const BAV_TABLES = ["Sun", "Moon", "Chowa", "Budhan", "Vyazham", "Sukran", "Shani"];
export const AV_PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
export function bav(db, chart) {
  const out = {};
  BAV_TABLES.forEach((t, p) => {
    const b = Array(12).fill(0);
    for (let c = 1; c <= 8; c++) {
      const row = byId(db[`tblAshtavarga${t}`], c);
      const from = signOf(chart, c);
      for (let h = 1; h <= 12; h++) if (String(row[h]).includes("Y")) b[(from + h - 1) % 12]++;
    }
    out[AV_PLANETS[p]] = b;
  });
  return out;
}

export function avPhalam(db, yogam, chart) {
  const B = bav(db, chart);
  return TEXTS.AV.signs.map((sign, s) => ({
    sign,
    rows: AV_PLANETS.map((p, i) => ({ planet: TEXTS.AV.planets[i], key: p, bindus: B[p][s], text: byId(yogam.tblAshtavargaResult, B[p][s])[p] })),
  }));
}

// ---- Panchanga phalam ----
export function panchangaIdx(chart) {
  const M = lonOf(chart, 3);
  const S = lonOf(chart, 2);
  const diff = mod360(M - S);
  return {
    vara: chart.time.indianDow, // born before sunrise -> previous weekday, 0 -> 7
    nak: Math.floor((M * 60) / 800) + 1,
    tithi: Math.floor(diff / 12) + 1,
    karana: Math.floor(diff / 6) + 1,
    yoga: Math.floor((mod360(M + S) * 6) / 80) + 1, // sum of exactly 360 wraps to 0
  };
}
export function panchangaPhalam(db, chart) {
  const g = genderOf(chart);
  const i = panchangaIdx(chart);
  const texts = [
    byId(db.tblWeekdayResult, i.vara)[g],
    byId(db.tblNakshatraresult, i.nak)[g],
    byId(db.tblThidhi, i.tithi)[g],
    byId(db.tblKaranam, i.karana)[g],
    byId(db.tblNityayoga, i.yoga)[g],
  ];
  return TEXTS.PANCHANGA.heads.map((head, k) => ({ head, text: texts[k] }));
}

// ---- Lagna / Chandra phalam ----
export const lagnaPhalam = (db, chart) => byId(db.tblLagnaPhalam, signOf(chart, 1) + 1)[genderOf(chart)];
export function chandraPhalam(db, chart) {
  const [from, to] = TEXTS.CHANDRA.replace;
  return byId(db.tblLagnaPhalam, signOf(chart, 3) + 1)[genderOf(chart)].replaceAll(from, to);
}

// ---- Bhava phalam: where each house lord sits ----
export function bhavaPhalam(db, chart) {
  const g = genderOf(chart);
  const L = signOf(chart, 1);
  const out = [];
  for (let house = 1; house <= 12; house++) {
    const lord = BAVADHIPAN[(L + house - 1) % 12];
    const inHouse = houseFrom(L, signOf(chart, lord));
    out.push({ house, lord: ROW[lord], inHouse, text: db.tblMalayalaBavaPhalam.find((r) => +r.House === house && +r.Inlord === inHouse)[g] });
  }
  return out;
}

// ---- Bhavashraya phalam: planet in house ----
export function bhavashraya(db, chart) {
  const g = genderOf(chart);
  const L = signOf(chart, 1);
  return [2, 3, 4, 5, 6, 7, 8, 9, 10].map((id) => {
    const s = id === 10 ? (signOf(chart, 9) + 6) % 12 : signOf(chart, id);
    const house = houseFrom(L, s);
    return { planet: ROW[id], house, text: db.tblMalayalamHouses.find((r) => r.Planet === ROW[id] && +r.House === house)[g] };
  });
}

// ---- Dasa-apahara phalam ----
const N = (d) => d.y * 10000 + d.m * 100 + d.d; // comparable day key
export const fmtDate = (d) => `${d.d}-${d.m}-${d.y}`;
export function dasaPhalam(db, chart) {
  const g = genderOf(chart);
  const Y = chart.settings.yearLength;
  const D = Object.fromEntries(db.tblDasa.map((r) => [+r._id, { id: +r._id, years: +r.DasaYear, ml: r.Malayalam, planetno: +r.planetno, lord: r.Lord, sub: r.sub, full: r.full }]));
  const birth = chart.date;
  const nf = (lonOf(chart, 3) * 6) / 80;
  const i = Math.floor(nf);
  const first = (i + 1) % 9 || 9;
  const start0 = addDays(birth, -Math.round((nf - i) * D[first].years * Y));
  const months = db.tblMalayalamMonths;
  const out = [];
  let cum = 0;
  let prevEnd = start0;
  for (let k = 0; k < 9; k++) {
    const d = D[((first - 1 + k) % 9) + 1];
    const start = prevEnd;
    cum += d.years * Y;
    const end = addDays(start0, Math.round(cum));
    const signName = byId(months, signOf(chart, d.planetno) + 1).Months;
    const res = db.tblDasaresult.find((r) => r.planet === d.lord && r.Category === "Rasi" && r.Subcategory === signName);
    out.push({ name: d.ml, lord: d.lord, from: k === 0 ? birth : start, to: end, current: k === 0, text: res[g], apaharas: apaharas(db, D, d, start, birth, Y, g) });
    prevEnd = end;
  }
  return out;
}
function apaharas(db, D, d, dStart, birth, Y, g) {
  const col = g === "Male" ? "Male" : "female";
  const before = N(birth) > N(dStart);
  const out = [];
  let shown = false;
  let cum = 0;
  let prev = dStart;
  for (let k = 0; k < 9; k++) {
    const a = D[((d.id - 1 + k) % 9) + 1];
    cum += (a.years * d.years * Y) / 120;
    const end = addDays(dStart, Math.round(cum));
    const text = db.tblDasaApahara.find((r) => r.Dasa === d.sub && r.Apahara === a.sub)[col];
    if (!before || shown) out.push({ name: a.full, from: prev, to: end, text });
    else if (N(end) >= N(birth) && N(prev) <= N(birth)) {
      out.push({ name: a.full, from: birth, to: end, text });
      shown = true;
    }
    prev = end;
  }
  return out;
}

// ---- Yoga phalam: 19 yoga rules ----
const KENDRA = [1, 4, 7, 10];
const MAHAPURUSHA = { 4: [0, 7, 9], 5: [2, 5], 6: [3, 8, 11], 7: [1, 6, 11], 8: [6, 9, 10] };
export function yogaIds(chart) {
  const s = (id) => signOf(chart, id);
  const L = s(1);
  const TARA = [4, 5, 6, 7, 8].map(s);
  const taraIn = (fromId, off) => TARA.includes((s(fromId) + off + 12) % 12);
  const hf = (pId, fromId) => houseFrom(s(fromId), s(pId));
  const hits = [];
  for (const id of [4, 5, 6, 7, 8]) if (KENDRA.includes(houseFrom(L, s(id))) && MAHAPURUSHA[id].includes(s(id))) hits.push(id - 3);
  const m12 = taraIn(3, -1);
  const m2 = taraIn(3, 1);
  if (m12) hits.push(6);
  if (m2) hits.push(7);
  if (m12 && m2) hits.push(8);
  if (!m12 && !m2) hits.push(9);
  const s12 = taraIn(2, -1);
  const s2 = taraIn(2, 1);
  if (s12) hits.push(10);
  if (s2) hits.push(11);
  if (s12 && s2) hits.push(12);
  if (!s12 && !s2) hits.push(13);
  if (KENDRA.includes(hf(3, 6))) hits.push(14);
  if (KENDRA.includes(hf(3, 1)) && KENDRA.includes(hf(6, 1))) hits.push(15);
  if ([6, 8, 12].includes(hf(3, 6))) hits.push(16);
  if (KENDRA.includes(hf(3, 2))) hits.push(17);
  if ([2, 5, 8, 11].includes(hf(3, 2))) hits.push(18);
  if ([3, 6, 9, 12].includes(hf(3, 2))) hits.push(19);
  return hits;
}
export function yogaPhalam(db, chart) {
  const g = genderOf(chart);
  return yogaIds(chart).map((id) => {
    const r = byId(db.tblYogam, id);
    return { id, name: r.Yogam, text: r[g] };
  });
}

// ---- Karthru dosham ----
// Labels used when the full-edition texts are not bundled (no closing note).
const KARTHRU_LABELS = {
  title: "കര്‍ത്തൃദോഷം",
  labels: ["ജന്മനക്ഷത്രം", "3-ആം നക്ഷത്രം (വിപത്)", "5-ആം നക്ഷത്രം (പ്രത്യക്)", "7-ആം നക്ഷത്രം (വധം)", "ലഗ്നാല്‍ 8-ആം രാശി", "ചന്ദ്രാല്‍ 8-ആം രാശി",
    "22-ആം നക്ഷത്രം", "88-ആം നക്ഷത്രപാദം", "22-ആം ദ്രേക്കാണം", "108-ആം നക്ഷത്രപാദം", "27-ആം നക്ഷത്രം"],
  closing: [],
  pada: " പാദം - ",
  drek: ", ദ്രേക്കാണം - ",
  signs: ["മേടം", "ഇടവം", "മിഥുനം", "കര്‍ക്കിടകം", "ചിങ്ങം", "കന്നി", "തുലാം", "വൃശ്ചികം", "ധനു", "മകരം", "കുംഭം", "മീനം"],
};
export function karthru(db, chart) {
  const K = TEXTS?.KARTHRU ?? KARTHRU_LABELS;
  const NAK = (i1) => byId(db.tblMalayalamNakshatra, i1).Name;
  const M = lonOf(chart, 3);
  const Lg = lonOf(chart, 1);
  const n = Math.floor((M * 6) / 80) + 1;
  const w = (k) => (k > 27 ? k - 27 : k);
  const pada = (d) => {
    const x = (d * 6) / 80;
    const i = Math.floor(x);
    return `${NAK(i + 1)}${K.pada}${Math.floor((x - i) * 4) + 1}`;
  };
  const drek = (d) => {
    const x = d / 30;
    const i = Math.floor(x);
    return `${K.signs[i]}${K.drek}${Math.floor((x - i) * 3) + 1}`;
  };
  const values = [
    NAK(n), NAK(w(n + 2)), NAK(w(n + 4)), NAK(w(n + 6)),
    K.signs[(signOf(chart, 1) + 7) % 12], K.signs[(signOf(chart, 3) + 7) % 12],
    NAK(w(n + 21)),
    pada(mod360(M + 290)),
    drek(mod360(Lg + 210)),
    pada(mod360(M - 3.0)), // 3.0 deg back (kept convention), not 3 deg 20'
    NAK(w(n + 26)),
  ];
  return { title: K.title, rows: K.labels.map((l, i) => [l.trim(), values[i]]), closing: K.closing };
}

// ---- Gochara phalam: static Sani text with the Moon sign inserted ----
export function gocharaHtml(chart) {
  const G = TEXTS.GOCHARA;
  return G[genderOf(chart)].join(G.signs[signOf(chart, 3)]);
}

// ---- Avastha phalam ----
const AV_KEY = ["Sun", "Moo", "Mar", "Mer", "Jup", "Ven", "Sat", "Rahu", "Kethu"];
const AV_BODY = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
const COMBUST_BODIES = ["Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
export function ghatiSinceSunrise(chart) {
  let t = chart.t;
  const sr = chart.sun.R;
  if (t < sr) t += 24;
  return Math.floor(Math.abs(t - sr) * 2.5);
}
export function avastha(yogam, chart) {
  const A = TEXTS.AVASTHA;
  const g = genderOf(chart);
  const P = chart.planets;
  const gh = ghatiSinceSunrise(chart);
  const jn = Math.floor((P.Moon.lon * 6) / 80) + 1;
  const lg = Math.floor(P.Lagna.lon / 30) + 1;
  const ordered = (tbl, sgn) => {
    const rows = [...tbl].sort((a, b) => +a._id - +b._id);
    return (sgn + 1) % 2 === 0 ? rows.reverse() : rows;
  };
  return AV_BODY.map((body, k) => {
    const p = P[body];
    const lon = p.lon;
    let name = A.names[k];
    let flag = 0;
    if (k < 7 && p.speed < 0) { name += A.retro; flag = 1; } // nodes excluded
    // combustion: core's check with wrap-around at 360
    if (COMBUST_BODIES.includes(body) && p.combust) { name += A.combust; flag = 2; }
    const sgn = Math.floor(lon / 30);
    const deg = lon - sgn * 30;
    let av = byId(yogam.tblDeepdadyaAvasthaMonth, sgn + 1)[AV_KEY[k]];
    if (flag > 0) av = "Sasthan"; // kept: retro/combust force Sasthan
    const deeptadi = yogam.tblDeepdadyaAvastha.find((r) => r.Avastha === av)[g];
    const baladi = ordered(yogam.tblBaladyaAvastha, sgn)[Math.floor(deg / 6)][g];
    const jagradadi = ordered(yogam.tblJagradadyaAvastha, sgn)[Math.floor(deg / 10)][g];
    const P1 = k + 1;
    const nk = Math.floor((lon * 60) / 800) + 1;
    const nv = Math.floor((deg * 60) / 200) + 1;
    const x = (nk * P1 * nv + (gh + jn + lg)) / 12;
    const r = Math.floor((x - Math.floor(x)) * 12) + 1; // remainder 0 -> Sayanam (kept)
    const shayanadi = byId(yogam.tblAvastha, P1)[`${A.shayana[r - 1]}-${g}`];
    return { name, body, flag, deeptadiName: av, texts: [deeptadi, baladi, jagradadi, shayanadi] };
  });
}

// ---- Pariharam: returns the HTML body (without style and band) ----
const trunc = (x) => Math.trunc(x) + Math.trunc((x - Math.trunc(x)) * 60) / 60;
const wrap360 = (x) => ((x / 360) - Math.trunc(x / 360)) * 360;
const pad2 = (n) => String(n).padStart(2, "0");
export const santhanaFmt = (x) => {
  const i = Math.trunc(x);
  return `${pad2(Math.trunc(i / 30))} - ${pad2(i % 30)} - ${pad2(Math.round((x - i) * 60))}`;
};
export function pariharamData(db, chart) {
  const s = (id) => signOf(chart, id);
  const L = s(1);
  const f5 = (L + 4) % 12;
  const col = f5 % 2 === 0 ? "Devan" : "Devatha";
  const upasana = [BAVADHIPAN[f5]];
  for (let id = 1; id <= 11; id++) if (s(id) === f5) upasana.push(id);
  if ([1, 9].includes(houseFrom(L, s(6)))) upasana.push(6);
  if ([2, 10].includes(houseFrom(L, s(4)))) upasana.push(4);
  if ([3, 8].includes(houseFrom(L, s(8)))) upasana.push(8);
  const second = (L + 1) % 12;
  let dhana = [];
  for (let id = 1; id <= 10; id++) if (s(id) === second) dhana.push(id);
  if (!dhana.length) dhana = [BAVADHIPAN[second]];
  const KALA = [30, 16, 6, 8, 10, 12, 1];
  const l9 = BAVADHIPAN[(L + 8) % 12];
  const m9 = BAVADHIPAN[(s(3) + 8) % 12];
  const r = (KALA[l9 - 2] + KALA[m9 - 2]) % 12 || 12;
  const dhanaLagna = (s(3) + r - 1) % 12;
  const c = (id) => trunc(lonOf(chart, id));
  const male = genderOf(chart) === "Male";
  const sphuta = wrap360(male ? c(6) + c(2) + c(7) : c(6) + c(3) + c(4));
  const tithiSphuta = wrap360(trunc(mod360(c(3) - c(2))) * 5);
  const tithi = Math.trunc(tithiSphuta / 12 + 1);
  return {
    upasana: upasana.map((id) => byId(db.tblIshtaDevatha, id - 1)[col]),
    dhana: dhana.map((id) => byId(db.tblDhanadevatha, id - 1)),
    dhanaLagna,
    sphuta, sphutaSign: Math.trunc(sphuta / 30), sphutaNav: Math.trunc(((sphuta / 40) - Math.trunc(sphuta / 40)) * 12),
    tithiSphuta, tithi, tithiName: byId(db.tblThidhi, tithi).Malayalam, tithiPhalam: byId(db.tblsandhanaPhalam, tithi).Phalam,
    male,
  };
}
export function pariharamHtml(db, chart) {
  const T = TEXTS.PARIHARAM;
  const d = pariharamData(db, chart);
  const row = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
  const R = T.rows[d.male ? "Male" : "Female"];
  const s1 = d.sphutaSign + 1;
  return T.upasanaIntro + d.upasana.map((x) => x + ",").join("") + T.upasanaOutro +
    T.dhanaDevatha + d.dhana.map((x) => x.devan + ". " + x.pariharam).join("") +
    T.dhanaLagna + T.kalaTable + T.dhanaLagnaPrefix + T.signs[d.dhanaLagna] + T.dhanaLagnaOutro +
    T.santhana +
    row(R[0], santhanaFmt(d.sphuta)) +
    row(R[1], T.signs[s1 - 1] + (s1 % 2 === 1 ? T.odd : T.even)) +
    row(R[2], T.signs[d.sphutaNav] + (d.sphutaNav % 2 === 0 ? T.odd : T.even)) +
    row(T.rows.tithiSphuta, santhanaFmt(d.tithiSphuta)) +
    row(T.rows.tithi, d.tithiName) + "</table>" +
    d.tithiPhalam + "<br/>" + T.santhanaNote + T.closing;
}
