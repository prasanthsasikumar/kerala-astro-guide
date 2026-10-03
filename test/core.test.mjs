import { test } from "node:test";
import assert from "node:assert/strict";
import { boot } from "./harness.mjs";
import { computeChart, dasa } from "../src/engine/core.js";
import { DEFAULTS } from "../src/engine/settings.js";

const CALICUT = { name: "Calicut", lat: 11.25, lon: 75.77, tz: 5.5 };

test("2018-01-01 14:30 Calicut: panchangam and Malayalam date", async () => {
  const { swe, db } = await boot();
  const c = computeChart(swe, db, DEFAULTS, { name: "t", gender: "Male", date: "2018-01-01", time: "14:30", place: CALICUT });
  assert.deepEqual(c.time.malayalam, { day: 17, month: 9, year: 1193 }); // 17 Dhanu 1193
  assert.equal(c.time.tithi, 15); // Pournami
  assert.equal(c.time.nakIdx, 5); // Makayiram
  assert.equal(c.time.pada, 4);
  assert.equal(c.planets.Sun.rasi, 8); // Dhanu
  assert.deepEqual([c.time.saka.day, c.time.saka.month, c.time.saka.saka], [11, 9, 1939]); // 11 Pausha 1939
  assert.equal(Math.round(c.sun.R * 60), 6 * 60 + 49);
  const ds = dasa(db, c, c.planets.Moon.lon);
  assert.equal(ds.balance.lord.lord, "Mar");
});

test("sunrise east of UTC+7 returns the same-day sunrise", async () => {
  const { swe, db } = await boot();
  const c = computeChart(swe, db, DEFAULTS, { name: "t", gender: "Male", date: "2024-06-01", time: "12:00", place: { name: "Singapore", lat: 1.29, lon: 103.85, tz: 8 } });
  assert.ok(c.sun.R > 6.5 && c.sun.R < 7.5, `sunrise ${c.sun.R}`);
});
