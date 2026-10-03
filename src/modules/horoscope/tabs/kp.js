// Page 22: KP system (കൃഷ്ണമൂർത്തി പദ്ധതി) - ruling planets at birth
import { h } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";
import * as N from "../../../engine/names.js";
import { kpRulingPlanets } from "../../../engine/vargas.js";
import { band } from "./calc-common.js";

// the KP tab names the Sun "രവി"
const name = (k) => (k === "Sun" ? tx("രവി", "Sun") : N.planet(k));

export function render(chart, { db }) {
  const r = kpRulingPlanets(chart);
  const nakLord = (nak) => `${db.tblMalayalamNakshatra[nak].Lord} (${db.tblMalayalamNakshatra[nak].Name})`;
  const rows = [
    [tx("ലഗ്ന നക്ഷത്രാധിപൻ", "Lagna star lord"), tx(nakLord(r.lagnaNak), `${N.planet(r.lagnaNakLord)} (${N.NAK_EN[r.lagnaNak]})`)],
    [tx("ലഗ്ന രാശ്യധിപൻ", "Lagna sign lord"), name(r.lagnaSignLord)],
    [tx("ചന്ദ്ര നക്ഷത്രാധിപൻ", "Moon star lord"), tx(nakLord(r.moonNak), `${N.planet(r.moonNakLord)} (${N.NAK_EN[r.moonNak]})`)],
    [tx("ചന്ദ്ര രാശ്യധിപൻ", "Moon sign lord"), name(r.moonSignLord)],
    [tx("വാരാധിപൻ", "Day lord"), name(r.dayLord)],
    [tx("ല. ന. ഉപാധിപൻ", "Lagna sub lord"), name(r.lagnaSub)],
    [tx("ച. ന. ഉപാധിപൻ", "Moon sub lord"), name(r.moonSub)],
  ];
  return h("div.stack",
    h("div", band("ഭരണഗ്രഹങ്ങൾ (RP)", "Ruling planets (RP)"),
      h("div.table-wrap", { style: { maxWidth: "560px" } }, h("table.data", h("tbody", rows.map(([a, b]) => h("tr", h("td", a), h("td", ":"), h("td", b))))))));
}
