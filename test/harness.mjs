// Boots Swiss Ephemeris in Node the same way the browser does (files over http), plus the
// reference data of the current edition: public/data (full) or public/open/reference.json
// (public: VITE_EDITION=public, or a checkout without the full data).
import SwissEPH from "sweph-wasm";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { openData } from "../src/lib/open-data.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PUBLIC = process.env.VITE_EDITION === "public" || !existsSync(path.join(root, "public/data/astro.json"));
const json = async (f) => JSON.parse(await readFile(path.join(root, f), "utf8"));
let booted;
export function boot() {
  if (!booted) booted = (async () => {
    const srv = createServer(async (q, r) => {
      try {
        const file = q.url === "/swisseph.wasm" ? "node_modules/sweph-wasm/dist/wasm/swisseph.wasm" : "public" + q.url;
        const buf = await readFile(path.join(root, file));
        if (file.endsWith(".wasm")) r.setHeader("content-type", "application/wasm");
        r.end(buf);
      } catch { r.statusCode = 404; r.end(); }
    });
    await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
    const base = `http://127.0.0.1:${srv.address().port}`;
    const origLog = console.log; console.log = () => {};
    const swe = await SwissEPH.init(`${base}/swisseph.wasm`);
    await swe.swe_set_ephe_path(`${base}/ephe/`, ["seas_18.se1", "semo_18.se1", "sepl_18.se1"]);
    console.log = origLog;
    srv.close(); srv.unref();
    if (PUBLIC) return { swe, ...openData(await json("public/open/reference.json")) };
    return { swe, db: await json("public/data/astro.json"), yogam: await json("public/data/yogam.json") };
  })();
  return booted;
}
