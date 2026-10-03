// Swiss Ephemeris (WASM) boot, using the bundled Swiss Ephemeris files (1800-2400 AD).
import SwissEPH from "sweph-wasm";

let ready;
export function getSwe() {
  if (!ready) {
    ready = (async () => {
      const swe = await SwissEPH.init("/swisseph.wasm");
      await swe.swe_set_ephe_path("/ephe/", ["seas_18.se1", "semo_18.se1", "sepl_18.se1"]);
      return swe;
    })();
  }
  return ready;
}
