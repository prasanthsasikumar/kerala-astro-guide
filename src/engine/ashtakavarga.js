// Ashtakavarga bindus and SAV analyses. Pure functions, testable in Node.
// Ketu is always true Ketu (Rahu + 180).
import { ORDER } from "./core.js";
import { SAV_TEXT as T } from "@private/texts.js";

export const BAV_PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
const ASTRO_TABLE = {
  Sun: "tblAshtavargaSun", Moon: "tblAshtavargaMoon", Mars: "tblAshtavargaChowa", Mercury: "tblAshtavargaBudhan",
  Jupiter: "tblAshtavargaVyazham", Venus: "tblAshtavargaSukran", Saturn: "tblAshtavargaShani",
};
// Lagna / Rahu / Ketu bindu tables come from the yogam data set
const YOGAM_TABLE = { Lagna: "tblAshtavargaLagna", Rahu: "tblAshtavargaRahu", Ketu: "tblAshtavargaKethu" };

// rows _id 1..8 = contributors Lagna, Sun..Saturn (chart row order); column h = house from contributor
export function bavFromTable(rows, rasiOf) {
  const out = Array(12).fill(0);
  for (const row of rows) {
    const r = +row._id;
    if (r < 1 || r > 8) continue;
    const from = rasiOf(ORDER[r - 1]);
    for (let hs = 1; hs <= 12; hs++) if (row[String(hs)] === "Y") out[(from + hs - 1) % 12]++;
  }
  return out;
}

/**
 * Bindus for a chart. Returns { bav: {Sun..Saturn, Lagna, Rahu, Ketu}: number[12], sav: number[12] }.
 * sav sums the seven planets only (Lagna/Rahu/Ketu excluded).
 * `rasiOf(key)` defaults to chart.planets[key].rasi.
 */
export function ashtakavarga(db, yogam, chart, rasiOf = (k) => chart.planets[k].rasi) {
  const bav = {};
  for (const p of BAV_PLANETS) bav[p] = bavFromTable(db[ASTRO_TABLE[p]], rasiOf);
  for (const [k, t] of Object.entries(YOGAM_TABLE)) bav[k] = bavFromTable(yogam[t], rasiOf);
  const sav = Array.from({ length: 12 }, (_, s) => BAV_PLANETS.reduce((a, p) => a + bav[p][s], 0));
  return { bav, sav };
}

// ---- 8.4 SAV analyses ----
const maxRule = (x, y, z) => (x >= y && x >= z ? 0 : y >= x && y >= z ? 1 : 2);

export function savAnalyses(sav, lagnaSign, gender) {
  const S = sav;
  const H = (n) => S[(lagnaSign + n - 1) % 12];
  const sum = (...xs) => xs.reduce((a, b) => a + b, 0);

  const sri = sum(H(1), H(2), H(4), H(9), H(10), H(11));
  const asri = sum(H(6), H(8), H(12));
  const sriIdx = (sri >= 164 ? 0 : 2) + (asri <= 76 ? 0 : 1);

  const b = sum(H(1), H(5), H(9)), s = sum(H(2), H(6), H(10)), p = sum(H(3), H(7), H(11)), g = sum(H(4), H(8), H(12));
  const c2 = b > s ? 0 : b === s ? 1 : 2;
  const c3 = p > g ? 0 : p === g ? 1 : 2;
  const bandhuIdx = c2 === 0 && c3 === 0 ? 0 : (c2 === 0 || c3 === 0) ? 1 : 2;

  const adi = sum(S[11], S[0], S[1], S[2]), madhya = sum(S[3], S[4], S[5], S[6]), antya = sum(S[7], S[8], S[9], S[10]);
  const kendra = sum(H(1), H(4), H(7), H(10)), panapara = sum(H(2), H(5), H(8), H(11)), apoklima = sum(H(3), H(6), H(9), H(12));
  const satva = H(3), rajas = H(11), tamas = H(12);
  const antar = sum(H(1), H(4), H(5), H(7), H(9), H(10)), bahir = sum(H(2), H(3), H(6), H(8), H(11), H(12));
  const mesha = sum(S[0], S[4], S[8]), vrisha = sum(S[1], S[5], S[9]), mithuna = sum(S[2], S[6], S[10]), karkata = sum(S[3], S[7], S[11]);
  // The trine with the most bindus gives the direction (ties go to the earlier trine):
  // Mesha East, Vrishabha South, Mithuna West, Karkata North.
  const tri = [mesha, vrisha, mithuna, karkata];
  const triIdx = tri.findIndex((v) => tri.every((w) => v >= w));
  const stree = sum(S[1], S[3], S[5], S[7], S[9], S[11]), purusha = sum(S[0], S[2], S[4], S[6], S[8], S[10]);
  const female = gender === "Female";
  const good = female ? stree > purusha : purusha > stree;

  return [
    { key: "sri", title: "ശ്രീകരാദി", values: [["ശ്രീകരം", sri], ["അശ്രീകരം", asri]], phalamLabel: "ശ്രീകരാദി ഫലം", phalam: T && T.sri[sriIdx] },
    { key: "bandhu", title: "ബന്ധുകാദി", values: [["ബന്ധുകം", b], ["സേവകം", s], ["പോഷകം", p], ["ഘാതകം", g]], phalamLabel: "ബന്ധുകാദിഫലം", phalam: T && T.bandhu[bandhuIdx] },
    { key: "khanda", title: "ഖണ്ഡത്രയം", values: [["ആദിഖണ്ഡം", adi], ["മദ്ധ്യഖണ്ഡം", madhya], ["അന്ത്യഖണ്ഡം", antya]], phalamLabel: "ഖണ്ഡത്രയഫലം", phalam: T && T.khanda[maxRule(adi, madhya, antya)] },
    { key: "kendra", title: null, values: [["കേന്ദ്രം", kendra], ["പണപരം", panapara], ["ആപോക്ലിമം", apoklima]], phalamLabel: "ഖണ്ഡത്രയഫലം", phalam: T && T.khanda[maxRule(kendra, panapara, apoklima)] },
    { key: "guna", title: "സാത്വികാദി", values: [["സാത്വികം", satva], ["രാജസം", rajas], ["താമസം", tamas]], phalamLabel: "സാത്വികാദി ഫലം", phalam: T && T.guna[maxRule(satva, rajas, tamas)] },
    { key: "antar", title: "അന്തര്‍ഭാഗം-ബഹിര്‍ഭാഗം", values: [["അന്തര്‍ഭാഗം", antar], ["ബഹിര്‍ഭാഗം", bahir]], phalamLabel: "അന്തര്‍ഭാഗ-ബഹിര്‍ഭാഗ ഫലം",
      phalam: T && T.antar[antar > bahir ? 0 : 1] },
    { key: "trikona", title: "രാശിത്രികോണം", values: [["മേഷത്രികോണം", mesha], ["വൃഷഭത്രികോണം", vrisha], ["മിഥുനത്രികോണം", mithuna], ["കര്‍ക്കിത്രികോണം", karkata]], phalamLabel: "രാശിത്രികോണഫലം",
      phalam: T && T.dir[triIdx] + T.dirSuffix, dir: triIdx },
    { key: "gender", title: "സ്ത്രീ-പുരുഷന്‍", values: [["സ്ത്രീ", stree], ["പുരുഷന്‍", purusha]], phalamLabel: "സ്ത്രീ-പുരുഷ ഫലം", phalam: T && T.gender[good ? 0 : 1] },
  ];
}
