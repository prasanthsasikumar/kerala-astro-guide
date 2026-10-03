// The rule-based nakshatra porutham grid against the reference grid in public/data (when present).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { matchTable, matchValue } from "../src/engine/porutham-rules.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const refPath = path.join(root, "public/data/astro.json");

test("rule grid has 1296 well-formed rows", () => {
  const rows = matchTable();
  assert.equal(rows.length, 1296);
  for (const r of rows) assert.match(r.Nakshatra, /^[GMSD]{10}-\d+[yz]-\d+[yz]-[AUSMP][RN][VN]$/);
  assert.equal(rows[0]._id, 1);
  assert.equal(matchValue(1, 1), rows[0].Nakshatra);
});

test("rule grid agrees with the reference grid", (t) => {
  if (!existsSync(refPath)) return t.skip("reference data not present");
  const ref = JSON.parse(readFileSync(refPath, "utf8")).tblMatchNakshatra;
  const ours = matchTable();
  const names = ["rasi", "rasyadhipam", "vasyam", "mahendram", "ganam", "yoni", "dinam", "sthreeDeergham", "rajju", "vedham"];
  const per = new Array(10).fill(0);
  let full = 0, cnt8 = 0, cnt10 = 0, code = 0;
  for (let i = 0; i < 1296; i++) {
    const a = ours[i].Nakshatra.split("-"), b = ref[i].Nakshatra.split("-");
    if (ours[i].Nakshatra !== ref[i].Nakshatra) full++;
    for (let k = 0; k < 10; k++) if (a[0][k] !== b[0][k]) per[k]++;
    if (a[1] !== b[1]) cnt8++;
    if (a[2] !== b[2]) cnt10++;
    if (a[3] !== b[3]) code++;
  }
  console.log(`porutham grid mismatches: full ${full}/1296, count8 ${cnt8}, count10 ${cnt10}, code ${code}`);
  console.log("per porutham:", Object.fromEntries(names.map((n, k) => [n, per[k]])));
  assert.ok(full <= 1296 * 0.03, `full-string mismatches ${full}`);
  for (let k = 0; k < 10; k++) assert.ok(per[k] <= 1296 * 0.02, `${names[k]} mismatches ${per[k]}`);
});
