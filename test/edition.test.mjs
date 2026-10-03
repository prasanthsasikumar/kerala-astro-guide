// Calculations that must give the same results in both editions (full data or the open
// reference tables). Run in public mode with: npm run test:public
import { test } from "node:test";
import assert from "node:assert/strict";
import { boot, PUBLIC } from "./harness.mjs";
import { computeChart, dasa } from "../src/engine/core.js";
import { DEFAULTS } from "../src/engine/settings.js";
import { ashtakavarga, savAnalyses } from "../src/engine/ashtakavarga.js";
import * as P from "../src/engine/porutham.js";
import { computePrashna } from "../src/engine/prashnam.js";
import { gunaDosham, muhurtham, mrityudosham, MRITYU_TEXT } from "../src/engine/panchangam.js";
import { gocharaPhalam } from "../src/engine/gochar.js";
import { karthru } from "../src/engine/phalam.js";
import * as N from "../src/engine/names.js";

const CALICUT = { name: "Calicut", lat: 11.25, lon: 75.77, tz: 5.5 };
const chart = async (date = "2018-01-01", time = "14:30") => {
  const { swe, db, yogam } = await boot();
  return { swe, db, yogam, c: computeChart(swe, db, DEFAULTS, { name: "t", gender: "Male", date, time, place: CALICUT }) };
};

test("time values, Malayalam date and dasa", async () => {
  const { db, c } = await chart();
  assert.deepEqual(c.time.malayalam, { day: 17, month: 9, year: 1193 });
  assert.equal(c.time.nakIdx, 5);
  assert.equal(dasa(db, c, c.planets.Moon.lon).balance.lord.lord, "Mar");
  assert.equal(N.nak(db, 5).length > 0, true);
});

test("ashtakavarga bindus: SAV = 337", async () => {
  const { db, yogam, c } = await chart();
  const { sav } = ashtakavarga(db, yogam, c);
  assert.deepEqual(sav, [34, 23, 24, 35, 37, 32, 31, 23, 17, 28, 26, 27]);
  const tri = savAnalyses(sav, 0, "Male").find((b) => b.key === "trikona");
  assert.equal(tri.dir, 0); // Mesha trine 88 bindus
  if (PUBLIC) assert.equal(tri.phalam, null);
});

test("porutham match runs end to end", async () => {
  const { swe, db } = await boot();
  const r = P.computeMatch(swe, db, DEFAULTS,
    { name: "F", date: "1995-03-10", time: "06:20", place: CALICUT },
    { name: "M", date: "1992-08-21", time: "22:05", place: CALICUT }, { today: P.localToday(new Date(2026, 9, 3)) });
  assert.match(r.nak.value, /^[GMSD]{10}-\d+[yz]-\d+[yz]-[AUSMP][RN][VN]$/);
  assert.ok(["best", "remedy", "reject"].includes(r.opinion.outcome));
  if (PUBLIC) {
    assert.equal(r.opinion.final, null);
    assert.equal(P.nakToolResult(db, 1, 0, 2, 0).verdict, null);
  }
});

test("prashnam, guna-dosham, muhurtham, mrityu dosham", async () => {
  const { swe, db } = await boot();
  const p = computePrashna(swe, db, DEFAULTS, { date: "2018-01-01", time: "10:15", place: CALICUT, arudam: 0, nak: 0, tno: 4, ano: 121, swarnaRasi: 0, swarnamsha: 3 });
  assert.equal(p.time.nakIdx, 5);
  assert.equal(p.sutrams.length, 9);
  const g = gunaDosham(db, p.chart, 1, { nak: String, wd: String, tithi: String, karana: String, rasi: String });
  assert.ok(g.guna.length > 0 && g.dosha.length > 0);
  assert.equal(muhurtham(db, p.chart).day.length, 15);
  assert.equal(mrityudosham(swe, db, p.chart, { nak: String, wd: String, rasi: String }).rows.length, 4);
  if (PUBLIC) {
    assert.equal(p.tamboolam.planetResult, null);
    assert.equal(MRITYU_TEXT, null);
  }
});

test("transit positions and karthru stars", async () => {
  const { swe, db, c } = await chart();
  const g = gocharaPhalam(swe, DEFAULTS, { rasi: 0, date: { y: 2026, m: 1, d: 1 }, hours: 12, tz: 5.5 });
  assert.equal(g.length, 7);
  const k = karthru(db, c);
  assert.equal(k.rows.length, 11);
  if (PUBLIC) assert.equal(g[0].text, null);
});
