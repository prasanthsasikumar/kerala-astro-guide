// Page 1: Sphutas (സ്ഫുടങ്ങള്‍)
import { h, table } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";
import * as N from "../../../engine/names.js";
import { ORDER } from "../../../engine/core.js";

const NL = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
export const nakLabel = (L) => {
  const n = Math.trunc(((L % 360) * 6) / 80);
  return `${N.NAK_SHORT_ML[n]} (${N.planetShort(NL[n % 9])})`;
};

export function render(chart) {
  const P = chart.planets;
  const T = chart.time;
  const marks = (k) => [P[k].retro ? tx(" (വ)", " (R)") : "", P[k].combust ? tx(" (മൌ)", " (C)") : ""].join("");
  const row = (label, lon) => [label, h("span.num", N.sphuta(lon)), nakLabel(lon)];
  const rows = ORDER.filter((k) => k !== "Mandi").map((k) => row(N.planet(k) + (P[k].retro !== undefined ? marks(k) : ""), P[k].lon));
  rows.push(row(N.planet("Mandi"), P.Mandi.lon));
  rows.push(row(tx("കുന്ദം", "Kunda"), (P.Lagna.lon * 81) % 360));
  rows.push(row(tx("തിഥി", "Tithi"), T.tithiSphutaTrue ?? tithiSphuta(P)));
  rows.push(row(tx("നിത്യയോഗം", "Nithya yoga"), yogaSphuta(P)));
  rows.push([h("strong", tx("പഞ്ചസ്ഫുടങ്ങള്‍", "Pancha sphutas")), "", ""]);
  const ps = T.pancha;
  rows.push(row(tx("ധൂമം", "Dhuma"), ps.dhuma));
  rows.push(row(tx("വ്യതീപാതം", "Vyatipata"), ps.vyatipata));
  rows.push(row(tx("പരിധി", "Paridhi"), ps.parivesha));
  rows.push(row(tx("ഇന്ദ്രധനുസ്", "Indradhanus"), ps.indrachapa));
  rows.push(row(tx("ഉപകേതു", "Upaketu"), ps.upaketu));
  return h("div.stack",
    table([tx("സ്ഫുടങ്ങൾ", "Body"), tx("രാ. ഭാ. ക.", "Sign-deg-min"), tx("ന.", "Star")], rows),
    h("p.muted", tx("വ = വക്രം. മൌ = മൌഢ്യം. ന. = നക്ഷത്രം. രാശി 0 = മേടം.", "R = retrograde. C = combust. Sign 0 = Mesha (Aries).")));
}

// Sphutas tab uses the TRUEPOS Sun/Moon (the Time tab uses apparent positions)
function tithiSphuta(P) {
  const d = P.Moon.lon - P.Sun.lon;
  return d < 0 ? d + 360 : d;
}
function yogaSphuta(P) {
  const s = P.Moon.lon + P.Sun.lon;
  return s > 360 ? s - 360 : s;
}
