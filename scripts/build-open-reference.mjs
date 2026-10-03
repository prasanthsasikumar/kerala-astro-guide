// Builds public/open/reference.json: the traditional lookup tables the calculations need
// (nakshatra / rasi / tithi / karana / yoga / month names, nakshatra attributes, dasa years,
// mandi day and night factors, ashtakavarga bindu tables, kalachakra tables, ...).
//
// Only plain facts and classical numeric tables are kept. Every explanatory or interpretive
// column (results, phalam, descriptions, translations of meanings) is dropped. Each table keeps
// the row shape the engine reads, so the same code runs on either data set.
//
// Run from web/ with the full-edition data export present: node scripts/build-open-reference.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (name) => JSON.parse(readFileSync(path.join(web, `public/data/${name}.json`), "utf8"));
const astro = load("astro");
const yogam = load("yogam");

const ALL = null;
const pick = (rows, cols) => rows.map((r) => (cols ? Object.fromEntries(cols.filter((c) => c in r).map((c) => [c, r[c]])) : { ...r }));
// "Sanskrit name (meaning)" -> "Sanskrit name"
const nameOnly = (s) => String(s).replace(/\s*\([^)]*\)\s*$/, "").trim();
const moonStates = (rows, nameCol) => rows.map((r) => ({ _id: r._id, [nameCol]: r[nameCol], Malayalam: nameOnly(r.Malayalam), English: r[nameCol] }));

const ASTRO = {
  tblMalayalamNakshatra: ["_id", "Name", "Devatha", "Lord", "Yoni", "Ganam", "Vriksham", "Pakshi", "Mrugam", "Bhootham", "Aksharam", "Manthram", "year",
    "suklapaksham", "krishnapaksham", "visham", "amritham", "ushnam"],
  tblMalayalamMonths: ["_id", "Months", "LValue", "HValue", "Malayalam", "Html", "short"],
  tblThidhi: ["_id", "Thidhi", "Malayalam", "English", "Html", "Thidhikupam"],
  tblKaranam: ["_id", "karanam", "English", "Html"],
  tblNityayoga: ["_id", "Name", "English", "Html"],
  tblWeekdayResult: ["_id", "Week", "Weekmal"],
  tblMuhurtham: ["_id", "Name"],
  tblDasa: ALL,
  tblMandiRiseTime: ALL,
  tblPrasnaDoshangal: ALL,
  tblBavadhipan: ALL,
  tblMatch: ALL,
  tblCombust: ALL,
  trisamsamodd: ALL,
  trisamsameven: ALL,
  tblMrituBag: ALL,
  tblMrityuBhaga: ALL,
  tblAshtavargaSun: ALL,
  tblAshtavargaMoon: ALL,
  tblAshtavargaChowa: ALL,
  tblAshtavargaBudhan: ALL,
  tblAshtavargaVyazham: ALL,
  tblAshtavargaSukran: ALL,
  tblAshtavargaShani: ALL,
  tblAshtavargaLagna: ALL,
};
const YOGAM = {
  tblAshtavargaLagna: ALL,
  tblAshtavargaRahu: ALL,
  tblAshtavargaKethu: ALL,
  tblKalachakra: ALL,
  tblKalachakraresearch: ALL,
  tblDeepdadyaAvasthaMonth: ALL,
};

const out = {
  _about: "Traditional reference tables for Kerala astrology calculations: names, nakshatra attributes and classical numeric lookup tables. No interpretive text.",
  astro: Object.fromEntries(Object.entries(ASTRO).map(([t, cols]) => [t, pick(astro[t], cols)])),
  yogam: Object.fromEntries(Object.entries(YOGAM).map(([t, cols]) => [t, pick(yogam[t], cols)])),
};
out.astro.tblChandrakriya = moonStates(astro.tblChandrakriya, "Chandrakriya");
out.astro.tblChandraavastha = moonStates(astro.tblChandraavastha, "Chandraavastha");
out.astro.tblChandravela = moonStates(astro.tblChandravela, "Chandravela");

// guard: no long free text anywhere (names and table cells are short)
for (const [db, tables] of Object.entries({ astro: out.astro, yogam: out.yogam })) {
  for (const [t, rows] of Object.entries(tables)) {
    for (const r of rows) for (const [k, v] of Object.entries(r)) {
      if (typeof v === "string" && v.length > 60) throw new Error(`${db}.${t}.${k}: unexpected long text "${v.slice(0, 40)}..."`);
    }
  }
}

mkdirSync(path.join(web, "public/open"), { recursive: true });
const file = path.join(web, "public/open/reference.json");
writeFileSync(file, JSON.stringify(out) + "\n");
console.log("wrote", path.relative(web, file), Object.keys(out.astro).length + Object.keys(out.yogam).length, "tables");
