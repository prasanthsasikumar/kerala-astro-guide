// Vivaha porutham (marriage matching) + Tools > Nakshatra porutham.
// Pure functions over computed charts / db rows. Female is always the reference (first).
import { computeChart, dasa, dayNum, int, frac, ORDER } from "./core.js";
import { PORUTHAM as T } from "@private/texts.js";

// ---- 2.1 star / pada / star-rasi index ----
export const starOf = (lon) => int((lon * 6) / 80) + 1; // 1..27
export const padaOf = (lon) => int(frac((lon * 6) / 80) * 4) + 1; // 1..4

// part: 1 = earlier rasi of a split star, 2 = later rasi (ignored for non-split stars)
export function starRasiIndex(i, p) {
  if ((i === 3 && p === 2) || i === 4 || (i === 5 && p === 1)) return i + 1;
  if ((i === 5 && p === 2) || i === 6 || (i === 7 && p === 1)) return i + 2;
  if ((i === 7 && p === 2) || i === 8 || i === 9) return i + 3;
  if (i === 10 || i === 11 || (i === 12 && p === 1)) return i + 3;
  if ((i === 12 && p === 2) || i === 13 || (i === 14 && p === 1)) return i + 4;
  if ((i === 14 && p === 2) || i === 15 || (i === 16 && p === 1)) return i + 5;
  if ((i === 16 && p === 2) || i === 17 || i === 18) return i + 6;
  if (i === 19 || i === 20 || (i === 21 && p === 1)) return i + 6;
  if ((i === 21 && p === 2) || i === 22 || (i === 23 && p === 1)) return i + 7;
  if ((i === 23 && p === 2) || i === 24 || (i === 25 && p === 1)) return i + 8;
  if ((i === 25 && p === 2) || i === 26 || i === 27) return i + 9;
  return i;
}
export function partFromPada(star, pada) {
  if ([5, 14, 23].includes(star)) return pada === 1 || pada === 2 ? 1 : 2;
  if ([3, 12, 21].includes(star)) return pada === 1 ? 1 : 2;
  if ([7, 16, 25].includes(star)) return pada === 4 ? 2 : 1;
  return 1;
}
export const indexOfLon = (lon) => starRasiIndex(starOf(lon), partFromPada(starOf(lon), padaOf(lon)));

// Tools rasi spinner: rasi options per star (1-based star -> rasi indices)
export const STAR_RASIS = { 1: [0], 2: [0], 3: [0, 1], 4: [1], 5: [1, 2], 6: [2], 7: [2, 3], 8: [3], 9: [3], 10: [4], 11: [4], 12: [4, 5],
  13: [5], 14: [5, 6], 15: [6], 16: [6, 7], 17: [7], 18: [7], 19: [8], 20: [8], 21: [8, 9], 22: [9], 23: [9, 10], 24: [10], 25: [10, 11], 26: [11], 27: [11] };
export const RASI_SHORT = ["മേടം", "ഇടവം", "മിഥുനം", "കര്‍ക്കി.", "ചിങ്ങം", "കന്നി", "തുലാം", "വൃശ്ചി.", "ധനു", "മകരം", "കുംഭം", "മീനം"];

// ---- 1.4 / 2.2 tblMatchNakshatra ----
export const GRADE_ML = { G: "ഉത്തമം", M: "മധ്യമം", S: "സാമാന്യം" };
export const GRADE_EN = { G: "Uttamam (best)", M: "Madhyamam (medium)", S: "Samanyam (ordinary)" };
export const gradeMl = (c) => GRADE_ML[c] ?? "അധമം";
export const gradeEn = (c) => GRADE_EN[c] ?? "Adhamam (bad)";
export const gradePts = (c) => (c === "G" ? "1.0" : c === "M" ? "0.5" : "0.0"); // points as decimal text

export const PORUTHAM_NAMES = [
  ["1) രാശി", "Rasi"], ["2) രാശ്യധിപം", "Rasyadhipam"], ["3) വശ്യം", "Vasyam"],
  ["4) മാഹേന്ദ്രം", "Mahendram"], ["5) ഗണം", "Ganam"], ["6) നക്ഷത്രയോനി", "Nakshatra Yoni"],
  ["7) ദിനം", "Dinam"], ["8) സ്ത്രീദീര്‍ഘം", "Sthree Deergham"], ["9) മധ്യമരജ്ജു", "Madhyama Rajju"],
  ["10) നക്ഷത്രവേധം", "Nakshatra Vedham"]];

export const COUNT_WORDS = { "0z": "അര", "1y": "ഒന്ന്", "1z": "ഒന്നര", "2y": "രണ്ട്", "2z": "രണ്ടര", "3y": "മൂന്ന്",
  "3z": "മൂന്നര", "4y": "നാല്", "4z": "നാലര", "5y": "അഞ്ച്", "5z": "അഞ്ചര", "6y": "ആറ്", "6z": "ആറര",
  "7y": "ഏഴ്", "7z": "ഏഴര", "8y": "എട്ട്", "8z": "എട്ടര", "9y": "ഒന്‍പത്", "9z": "ഒൻപതര", "10y": "പത്ത്", "10z": "പത്തര" };
export const countValue = (tok) => parseInt(tok, 10) + (tok.endsWith("z") ? 0.5 : 0);
export const countWord = (tok) => COUNT_WORDS[tok] ?? "null";

// id = (fIdx-1)*36 + mIdx, both 1..36
export function matchRow(db, fIdx, mIdx) {
  const id = (fIdx - 1) * 36 + mIdx;
  const value = db.tblMatchNakshatra[id - 1].Nakshatra;
  const [grades, cnt8, cnt10, code] = value.split("-");
  return { id, value, grades, cnt8, cnt10, code };
}

// pass/fail: integer part of the count of 8 (kept convention)
export function nakFlag(grades, cnt8) {
  const n = parseInt(cnt8.replace(/\D+/g, ""), 10);
  const vedhaOk = grades[9] === "G";
  const rajjuOk = grades[8] === "G";
  const pass = (n >= 3 && vedhaOk && rajjuOk) || (n >= 5 && vedhaOk && !rajjuOk);
  return { pass, vedhaOk, rajjuOk, n };
}

// 5.3 Tools verdict by 3-letter code
export const VERDICT = T?.VERDICT ?? null;

// Tools screen: star 1..27, rasiPos = 0-based position in STAR_RASIS[star]
export function nakToolResult(db, fStar, fRasiPos, mStar, mRasiPos) {
  const fIdx = starRasiIndex(fStar, fRasiPos + 1);
  const mIdx = starRasiIndex(mStar, mRasiPos + 1);
  const row = matchRow(db, fIdx, mIdx);
  return { ...row, fIdx, mIdx, verdict: VERDICT ? VERDICT[row.code] ?? ["null", "null"] : null };
}

// ---- body rasis (1.2) ----
const KEY = { Lagna: "lagna", Sun: "sun", Moon: "moon", Mars: "mars", Mercury: "mercury", Jupiter: "jupiter", Venus: "venus", Saturn: "saturn", Rahu: "rahu", Ketu: "ketu", Mandi: "mandi" };
export function rasiSet(chart) {
  const r = {};
  for (const k of ORDER) r[KEY[k]] = chart.planets[k].rasi;
  return r;
}
export const houseFrom = (x, ref) => ((x - ref + 12) % 12) + 1;
const uniqAsc = (hs) => [...new Set(hs)].sort((a, b) => a - b);
export const listWithTrailingComma = (hs) => uniqAsc(hs).map((x) => x + ",").join("");
export const listNoTrailingComma = (hs) => uniqAsc(hs).join(",");
const jd = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x)); // decimal text (1 -> "1.0")

// ---- 4.4 papasamyam ----
export const DOSHA_HOUSES = [1, 2, 4, 7, 8, 12];
export const PAPA_PLANETS = ["sun", "mars", "saturn", "rahu", "ketu"];
export const PAPA_LABEL = { sun: "ര‍", mars: "കു", saturn: "മ", rahu: "സ", ketu: "ശി" };
export const REFS = ["lagna", "moon", "venus"];
export function papaPoints(rule, ref, house) {
  if (!DOSHA_HOUSES.includes(house)) return 0;
  if (rule === "R") return { lagna: 1.0, moon: 0.75, venus: 0.5 }[ref];
  return { 1: 1.25, 2: 0.25, 4: 0.75, 7: 1.0, 8: 1.5, 12: 0.5 }[house];
}
export function papaTable(rasi, rule) {
  let total = 0;
  const cells = {};
  for (const p of PAPA_PLANETS) {
    cells[p] = {};
    for (const ref of REFS) {
      const v = papaPoints(rule, ref, houseFrom(rasi[p], rasi[ref]));
      cells[p][ref] = v;
      total += v;
    }
  }
  return { cells, total };
}
export const fmtPts = jd;

export const BENEFICS_FROM = { lagna: ["moon", "mercury", "jupiter", "venus"], moon: ["mercury", "jupiter", "venus"], venus: ["moon", "mercury", "jupiter"] };
export const DM_HOUSES = [1, 2, 7, 9];
export function vaidhavyaCell(rasi, ref) {
  const hs = PAPA_PLANETS.map((p) => houseFrom(rasi[p], rasi[ref])).filter((x) => DOSHA_HOUSES.includes(x));
  return hs.length
    ? { hit: true, houses: uniqAsc(hs), text: "പാപന്മാരുള്ള ഭാവങ്ങള്‍ ‍- " + listWithTrailingComma(hs) }
    : { hit: false, houses: [], text: "ഭാവങ്ങളില്‍ പാപന്മാരില്ല" };
}
export function dmCell(rasi, ref) {
  const hs = BENEFICS_FROM[ref].map((p) => houseFrom(rasi[p], rasi[ref])).filter((x) => DM_HOUSES.includes(x));
  return hs.length
    ? { hit: true, houses: uniqAsc(hs), text: "ശുഭന്മാരുള്ള ഭാവങ്ങള്‍ - " + listWithTrailingComma(hs) }
    : { hit: false, houses: [], text: "ഭാവങ്ങളില്‍ ശുഭന്മാരില്ല" };
}

export const PAPA_TEXT = T?.PAPA_TEXT ?? null;

// method = settings.papa (0: house-weighted 'H', 1: reference-weighted 'R', 2: vaidhavya vs deerghamangalya)
export function papasamyam(fr, mr, method) {
  if (method === 2) {
    const side = (r) => {
      const v = Object.fromEntries(REFS.map((ref) => [ref, vaidhavyaCell(r, ref)]));
      const d = Object.fromEntries(REFS.map((ref) => [ref, dmCell(r, ref)]));
      return { v, d, V: REFS.filter((x) => v[x].hit).length, D: REFS.filter((x) => d[x].hit).length };
    };
    const f = side(fr), m = side(mr);
    const a = f.V <= m.D, b = f.D >= m.V;
    const grade = a && b ? "G" : a || b ? "M" : "D";
    return { method, female: f, male: m, a, b, grade, flag: grade === "D" ? 0 : 1,
      lines: PAPA_TEXT ? [a ? PAPA_TEXT.aYes : PAPA_TEXT.aNo, b ? PAPA_TEXT.bYes : PAPA_TEXT.bNo, gradeMl(grade)] : null };
  }
  const rule = method === 1 ? "R" : "H";
  const f = papaTable(fr, rule), m = papaTable(mr, rule);
  const key = m.total > f.total ? "more" : m.total < f.total ? "less" : "equal";
  return { method, rule, female: f, male: m, key, flag: key === "less" ? 0 : 1, text: PAPA_TEXT?.[key] ?? null };
}

// ---- 4.6 kuja dosham ----
export const KUJA_HOUSES = [1, 2, 4, 7, 8, 12];
const RASI_FULL = ["മേടം", "ഇടവം", "മിഥുനം", "കര്‍ക്കിടകം", "ചിങ്ങം", "കന്നി", "തുലാം", "വൃശ്ചികം", "ധനു", "മകരം", "കുംഭം", "മീനം"];
export function kujaCell(rasi, ref) {
  const h = houseFrom(rasi.mars, rasi[ref]);
  if (!KUJA_HOUSES.includes(h)) return { dosha: 0, house: h, text: `${h}-ല്‍ ചൊവ്വ. ചൊവ്വദോഷമില്ല.` };
  let dosha = 1;
  let t = `${h}-ല്‍ ചൊവ്വ.ചൊവ്വദോഷമുണ്ട്.`;
  const mars = rasi.mars;
  if (rasi.jupiter === mars) { dosha = 0; t += "ചൊവ്വയ്ക്ക് വ്യാഴയോഗമുണ്ട് ദോഷം കുറയും."; }
  if (rasi.mercury === mars) { dosha = 0; t += "ചൊവ്വയ്ക്ക് ബുധയോഗമുണ്ട് ദോഷം കുറയും."; }
  const bh = BENEFICS_FROM[ref].map((p) => houseFrom(rasi[p], rasi[ref])).filter((x) => DM_HOUSES.includes(x));
  if (bh.length) { dosha = 0; t += " ശുഭന്മാരുള്ള ഭാവങ്ങള്‍ - " + listNoTrailingComma(bh) + " ദീര്‍ഘമംഗല്യയോഗം ഫലം. ദോഷം കുറയും."; }
  if (ref === "lagna") {
    const name = { 1: "മേടം", 4: "കര്‍ക്കിടകം", 7: "തുലാം", 10: "മകരം", 12: "മീനം" }[rasi.lagna + 1]; // Meenam included (Kerala convention)
    if (name) { dosha = 0; t += `ലഗ്നം ${name} രാശിയാകയാല്‍ ദോഷം കുറയും.`; }
  }
  if ([0, 3, 6, 9].includes(mars)) t += `ചൊവ്വ നില്‍ക്കുന്ന രാശിയായ ${RASI_FULL[mars]} രാശി ചരരാശിയിലാകയാല്‍ ദോഷം കുറയും.`; // informational only
  return { dosha, house: h, text: t };
}
export const KUJA_TEXT = T?.KUJA_TEXT ?? null;
export function kujaDosham(fr, mr) {
  const side = (r) => {
    const cells = Object.fromEntries(REFS.map((ref) => [ref, kujaCell(r, ref)]));
    return { cells, K: REFS.reduce((s, x) => s + cells[x].dosha, 0) };
  };
  const female = side(fr), male = side(mr);
  const diff = male.K - female.K;
  const key = diff === 0 || diff === 1 ? "good" : diff === 2 ? "medium" : "bad";
  return { female, male, diff, key, flag: key === "bad" ? 0 : 1, text: KUJA_TEXT?.[key] ?? null };
}

// ---- 4.5 dasa sandhi ----
export const fmtDn = (n) => {
  const d = new Date(n * 864e5);
  return `${d.getUTCDate()}-${d.getUTCMonth() + 1}-${d.getUTCFullYear()}`;
};
// 9 entries: birth + the first 8 dasa ends
export function dasaEnds(db, chart) {
  const ds = dasa(db, chart, chart.planets.Moon.lon);
  return [{ label: "ജനനം", lord: null, n: ds.birthN },
    ...ds.periods.slice(0, 8).map((p) => ({ label: p.dasa.abbr, lord: p.dasa.lord, id: p.dasa.id, n: p.end }))];
}
export const REMEDY_DASA = T?.REMEDY_DASA ?? null;
export const FINAL_EN = T?.FINAL_EN ?? null;
export const NO_SANDHI = "ദശാസന്ധിദോഷം ഇല്ല";
// checks every dasa change shown (rows 0..8).
export function dasaSandhi(fEnds, mEnds, { fromNow = true, today }) {
  let flag = 1;
  const lines = [];
  for (const a of fEnds) for (const b of mEnds) {
    const d = Math.abs(b.n - a.n);
    if (fromNow && !(a.n - today > -365 || b.n - today > -365)) continue;
    if (d >= 182 && d <= 365) lines.push({ grade: "M", date: fmtDn(a.n), days: d, female: a, male: b });
    else if (d < 182) { flag = 0; lines.push({ grade: "D", date: fmtDn(a.n), days: d, female: a, male: b }); }
  }
  return { flag, lines };
}
export const sandhiLineMl = (l) => `${l.date} - ന് സ്ത്രീയുടെ ദശ മാറുമ്പോള്‍ ${l.days} ദിവസത്തിനുള്ളില്‍ പുരുഷന്റെ ദശയും മാറുന്നു. ${l.grade === "M" ? "മധ്യമം" : "അധമം"}`;
export const sandhiLineEn = (l) => `When the woman's dasa changes on ${l.date}, the man's dasa also changes within ${l.days} days. ${l.grade === "M" ? "Medium" : "Bad"}.`;

// ---- 4.7 abhiprayam ----
export const REJECT = T?.REJECT ?? null;
export const BEST = T?.BEST ?? null;
export function abhiprayam({ nak, papa, dasa: ds, kuja }) {
  const N = "നക്ഷത്രപൊരുത്തം ", P = "പാപസാമ്യം ", D = "ദശാസന്ധി ", K = "കുജദോഷം ";
  let good = "", bad = "", dosha = "";
  if (nak.pass) good += N;
  if (papa === 1) good += P;
  if (ds === 1) good += D;
  if (kuja === 1) good += K;
  if (good) good += "എന്നിവ അനുകൂലമാണ്.";
  if (!nak.pass) bad += N;
  if (papa === 0) bad += P;
  if (ds === 0) bad += D;
  if (kuja === 0) bad += K;
  if (bad) bad += "വേണ്ടത്ര അനുകൂലമല്ല.";
  if (!nak.rajjuOk && !nak.vedhaOk) dosha = "മധ്യമരജ്ജുദോഷവും നക്ഷത്രവേധവുമുണ്ട്.";
  else {
    if (!nak.rajjuOk) dosha += "മധ്യമരജ്ജുദോഷമുണ്ട്.";
    if (!nak.vedhaOk) dosha += "നക്ഷത്രവേധമുണ്ട്.";
  }
  const outcome = !nak.pass || papa === 0 || kuja === 0 ? "reject" : ds === 0 ? "remedy" : "best";
  const final = { reject: REJECT, remedy: REMEDY_DASA, best: BEST }[outcome];
  return { good, bad, dosha, outcome, final, text: good + bad + dosha + (final ?? "") };
}

// ---- whole match ----
export function nakPorutham(db, fChart, mChart) {
  const fIdx = indexOfLon(fChart.planets.Moon.lon);
  const mIdx = indexOfLon(mChart.planets.Moon.lon);
  const row = matchRow(db, fIdx, mIdx);
  return { ...row, fIdx, mIdx, ...nakFlag(row.grades, row.cnt8) };
}

export function localToday(now = new Date()) {
  return dayNum(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function computeMatch(swe, db, settings, fInput, mInput, { today = localToday() } = {}) {
  const female = computeChart(swe, db, settings, { ...fInput, gender: "Female" });
  const male = computeChart(swe, db, settings, { ...mInput, gender: "Male" });
  const fr = rasiSet(female), mr = rasiSet(male);
  const nak = nakPorutham(db, female, male);
  const papa = papasamyam(fr, mr, +settings.papa || 0);
  const fEnds = dasaEnds(db, female), mEnds = dasaEnds(db, male);
  const sandhi = dasaSandhi(fEnds, mEnds, { fromNow: settings.dasaSandhiFromNow !== false, today });
  const kuja = kujaDosham(fr, mr);
  const opinion = abhiprayam({ nak, papa: papa.flag, dasa: sandhi.flag, kuja: kuja.flag });
  return { female, male, fr, mr, nak, papa, fEnds, mEnds, sandhi, kuja, opinion, today };
}
