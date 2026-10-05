// Plain-text chart facts for the AI astrologer. Everything here is computed by the engine;
// the model is told to rely on these facts and not to invent positions.
import { computeChart, dasa, subPeriods, ORDER, SIGN_LORD, dayNum } from "./core.js";
import { RASI_ML, RASI_EN, NAK_EN, WEEKDAY_EN, MAL_MONTH_EN } from "./names.js";
import { ashtakavarga } from "./ashtakavarga.js";
import { period } from "./charts.js";

const PLANET_ML = { Lagna: "ലഗ്നം", Sun: "സൂര്യന്‍", Moon: "ചന്ദ്രന്‍", Mars: "ചൊവ്വ", Mercury: "ബുധന്‍", Jupiter: "വ്യാഴം", Venus: "ശുക്രന്‍", Saturn: "ശനി", Rahu: "രാഹു", Ketu: "കേതു", Mandi: "മാന്ദി" };
const DASA_KEY = { Kethu: "Ketu", Ven: "Venus", Sun: "Sun", Moo: "Moon", Mar: "Mars", Rahu: "Rahu", Jup: "Jupiter", Sat: "Saturn", Mer: "Mercury" };
const sign = (i) => `${RASI_EN[i]} (${RASI_ML[i]})`;
const nakName = (db, i1) => `${NAK_EN[i1 - 1]} (${db.tblMalayalamNakshatra[i1 - 1].Name})`;
const deg = (lon) => `${Math.trunc(lon % 30)}°${String(Math.trunc(((lon % 30) % 1) * 60)).padStart(2, "0")}'`;
const iso = (n) => new Date(n * 864e5).toISOString().slice(0, 10);
const houseFrom = (fromSign, s) => ((s - fromSign + 12) % 12) + 1;

export function chartSummary(ctx, input, now = new Date()) {
  const { swe, db, yogam, settings } = ctx;
  const c = computeChart(swe, db, settings, input);
  const P = c.planets;
  const T = c.time;
  const lagna = P.Lagna.rasi;
  const moonSign = P.Moon.rasi;
  const today = Math.floor(now.getTime() / 864e5);
  const age = period(dayNum(c.date.y, c.date.m, c.date.d), today);
  const L = [];

  L.push(`PERSON: ${input.name || "(no name)"}, ${input.gender}, born ${input.date} ${input.time} at ${input.place.name} (lat ${(+input.place.lat).toFixed(2)}, lon ${(+input.place.lon).toFixed(2)}, UTC${input.place.tz >= 0 ? "+" : ""}${input.place.tz}). Age now: ${age.y} years ${age.m} months.`);
  if (input.timeUnknown) L.push("BIRTH TIME UNKNOWN: 12:00 noon was used. Lagna, houses, Mandi and anything house-based are unreliable; the Moon sign may also be uncertain near a sign change, and dasa dates are approximate.");
  L.push(`Malayalam date: ${T.malayalam.day} ${MAL_MONTH_EN[T.malayalam.month - 1]} (${RASI_ML[T.malayalam.month - 1]}) ${T.malayalam.year} (Kollam era). Weekday (sunrise-based): ${WEEKDAY_EN[T.indianDow - 1]}.`);
  L.push(`Birth star (janma nakshatra): ${nakName(db, T.nakIdx)}, pada ${T.pada}. Moon sign (koor): ${sign(moonSign)}. Lagna: ${sign(lagna)} ${deg(P.Lagna.lon)}.`);
  L.push(`Tithi: ${db.tblThidhi[T.tithi - 1].Thidhi}. Nithya yoga: ${db.tblNityayoga[T.yoga - 1].Name}. Karanam: ${db.tblKaranam[T.karana - 1].karanam}.`);
  L.push(`Sidereal (Lahiri) positions, house counted from lagna (whole sign):`);
  for (const k of ORDER.slice(1)) {
    const p = P[k];
    const flags = [p.retro ? "retrograde" : "", p.combust ? "combust" : ""].filter(Boolean).join(", ");
    L.push(`- ${k} (${PLANET_ML[k]}): ${sign(p.rasi)} ${deg(p.lon)}, star ${NAK_EN[Math.trunc((p.lon * 6) / 80)]}, house ${houseFrom(lagna, p.rasi)}, navamsa ${RASI_EN[p.navamsa]}${flags ? ", " + flags : ""}`);
  }
  L.push(`House lords: ${Array.from({ length: 12 }, (_, h) => `${h + 1}:${SIGN_LORD[(lagna + h) % 12]}`).join(" ")}.`);
  try {
    const { sav } = ashtakavarga(db, yogam, c);
    if (sav) L.push(`Sarvashtakavarga bindus by house from lagna: ${Array.from({ length: 12 }, (_, h) => `${h + 1}:${sav[(lagna + h) % 12]}`).join(" ")} (28+ is strong).`);
  } catch {
    /* optional */
  }

  // Vimshottari dasa
  const ds = dasa(db, c, P.Moon.lon);
  L.push(`Vimshottari dasa: balance at birth ${ds.balance.years}y ${ds.balance.months}m ${ds.balance.days}d of ${DASA_KEY[ds.balance.lord.lord]} dasa.`);
  const curIdx = ds.periods.findIndex((p) => p.start <= today && today < p.end);
  if (curIdx >= 0) {
    const cur = ds.periods[curIdx];
    L.push(`Current dasa: ${DASA_KEY[cur.dasa.lord]} (${iso(Math.max(cur.start, ds.birthN))} to ${iso(cur.end)}).`);
    const subs = subPeriods(ds.D, ds.Y, cur.dasa.id, cur.years, cur.start);
    const si = subs.findIndex((s) => s.start <= today && today < s.end);
    L.push(`Apahara (bhukti) periods in this dasa: ${subs.map((s, i) => `${DASA_KEY[s.dasa.lord]} ${iso(s.start)}..${iso(s.end)}${i === si ? " <- NOW" : ""}`).join("; ")}.`);
    const next = ds.periods[curIdx + 1];
    if (next) L.push(`Next dasa: ${DASA_KEY[next.dasa.lord]} from ${iso(next.start)}.`);
  }

  // today's transits (gocharam), counted from the Moon sign
  const d = now.toISOString().slice(0, 10);
  const tc = computeChart(swe, db, settings, { name: "", gender: "Male", date: d, time: "12:00", place: input.place });
  L.push(`Transits today (${d}), house counted from the Moon sign ${RASI_EN[moonSign]}:`);
  L.push(["Sun", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu", "Moon"].map((k) => `${k} in ${RASI_EN[tc.planets[k].rasi]} (house ${houseFrom(moonSign, tc.planets[k].rasi)} from Moon${tc.planets[k].retro ? ", retrograde" : ""})`).join("; ") + ".");
  const satH = houseFrom(moonSign, tc.planets.Saturn.rasi);
  const sade = [12, 1, 2].includes(satH) ? "Ezhara shani (sade sati) is running." : [4, 7, 10].includes(satH) ? "Kandaka shani is running." : satH === 8 ? "Ashtama shani is running." : "No ezhara/kandaka/ashtama shani now.";
  L.push(sade);
  L.push(`Today's star (Moon): ${NAK_EN[tc.time.nakIdx - 1]}.`);
  return { text: L.join("\n"), chart: c };
}

// Anonymous chart facts for the blind test: planets by sign and house, ascendant, birth star and
// moon sign only. No name, dates, place, ages, periods or transits, so the two readings cannot be
// told apart by anything but the chart itself.
export function blindFacts(ctx, input) {
  const { swe, db, settings } = ctx;
  const c = computeChart(swe, db, settings, input);
  const P = c.planets;
  const lagna = P.Lagna.rasi;
  const L = [];
  if (!input.timeUnknown) L.push(`Ascendant: ${RASI_EN[lagna]}.`);
  L.push(`Birth star: ${NAK_EN[c.time.nakIdx - 1]}. Moon sign: ${RASI_EN[P.Moon.rasi]}.`);
  for (const k of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]) {
    const p = P[k];
    const flags = [p.retro ? "retrograde" : "", p.combust ? "combust" : ""].filter(Boolean).join(", ");
    L.push(`${k}: ${RASI_EN[p.rasi]}${input.timeUnknown ? "" : `, house ${houseFrom(lagna, p.rasi)}`}${flags ? ", " + flags : ""}.`);
  }
  return L.join("\n");
}

// A random decoy person for the blind test: same gender and place, birth date within 10 years of the real one.
export function decoyInput(input) {
  const [y] = input.date.split("-").map(Number);
  const year = Math.max(1900, Math.min(new Date().getFullYear() - 1, y + Math.floor(Math.random() * 21) - 10));
  const start = Date.UTC(year, 0, 1);
  const day = new Date(start + Math.floor(Math.random() * 365) * 864e5);
  const hh = String(Math.floor(Math.random() * 24)).padStart(2, "0");
  const mm = String(Math.floor(Math.random() * 60)).padStart(2, "0");
  return { ...input, name: "", date: day.toISOString().slice(0, 10), time: `${hh}:${mm}` };
}
