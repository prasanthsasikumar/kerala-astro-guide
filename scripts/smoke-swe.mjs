import SwissEPH from "sweph-wasm";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
// serve public/ephe over http so swe_set_ephe_path can fetch like in the browser
const srv = createServer(async (q, r) => { try { r.end(await readFile("public" + q.url)); } catch { r.statusCode = 404; r.end(); } }).listen(8765);
const swe = await SwissEPH.init("http://localhost:8765/swisseph.wasm");
await swe.swe_set_ephe_path("http://localhost:8765/ephe/", ["seas_18.se1", "semo_18.se1", "sepl_18.se1"]);
swe.swe_set_sid_mode(1, 0, 0); // Lahiri
const jd = swe.swe_julday(2018, 1, 1, 14.5 - 5.5, 1);
const FLG = 2 /*SWIEPH*/ | 256 /*SPEED*/ | 65536 /*SIDEREAL*/;
for (const [n, p] of [["Sun",0],["Moon",1],["Mars",4],["Mean node",10]]) {
  const r = swe.swe_calc_ut(jd, p, FLG);
  console.log(n, JSON.stringify(r).slice(0, 160));
}
console.log("ayanamsa", swe.swe_get_ayanamsa_ut(jd));
srv.close(); process.exit(0);
