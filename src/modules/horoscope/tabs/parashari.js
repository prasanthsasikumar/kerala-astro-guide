// Page 20: Parashari (പരാശരി) - the 16 Parashara vargas with varga sphutas
import { h, table } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";
import * as N from "../../../engine/names.js";
import { ORDER } from "../../../engine/core.js";
import { getUI, setUI } from "../../../lib/store.js";
import { keralaChart } from "../../../components/kerala-chart.js";
import { parashariChart, PARASHARI_D } from "../../../engine/vargas.js";
import { band, nakSubLabel, NAK_SUB_LEGEND } from "./calc-common.js";
import { VARGA_SIGNIFICANCE } from "@private/texts.js";

export const PARASHARI_NAME = {
  1: "രാശി (D-1)", 2: "ഹോര (D-2)", 3: "ദ്രേക്കാണം (D-3)", 4: "ചതുര്‍ത്ഥാംശം (D-4)", 7: "സപ്താംശം (D-7)",
  9: "നവാംശം (D-9)", 10: "ദശാംശം (D-10)", 12: "ദ്വാദശാംശം (D-12)", 16: "ഷോഡശാംശം (D-16)", 20: "വിംശാംശം (D-20)",
  24: "സിദ്ധാംശം (D-24)", 27: "നക്ഷത്രാംശം (D-27)", 30: "ത്രിംശാംശം (D-30)", 40: "ഖവേദാംശം (D-40)",
  45: "അക്ഷവേദാംശം (D-45)", 60: "ഷഷ്ട്യംശം (D-60)",
};
const NAME_EN = { 1: "Rasi", 2: "Hora", 3: "Drekkana", 4: "Chaturthamsa", 7: "Saptamsa", 9: "Navamsa", 10: "Dasamsa", 12: "Dwadasamsa", 16: "Shodasamsa", 20: "Vimsamsa", 24: "Siddhamsa", 27: "Nakshatramsa", 30: "Trimsamsa", 40: "Khavedamsa", 45: "Akshavedamsa", 60: "Shashtyamsa" };
export const parashariName = (D) => tx(PARASHARI_NAME[D], `${NAME_EN[D]} (D-${D})`);


export function vargaCharts(chart, rows, label, sub) {
  const cells = Array.from({ length: 12 }, () => []);
  for (const r of rows) cells[r.sign].push(N.planetShort(r.key));
  const rasiCells = Array.from({ length: 12 }, (_, s) => ORDER.filter((k) => chart.planets[k].rasi === s).map((k) => N.planetShort(k)));
  const lag = rows.find((r) => r.key === "Lagna").sign;
  return h("div.charts-row",
    keralaChart(cells, { title: label, center: h("div", h("strong", label), h("div", sub)), mark: new Set([lag]) }),
    keralaChart(rasiCells, { title: tx("രാശി", "Rasi"), center: h("div", h("strong", tx("രാശി", "Rasi")), h("div", sub)), mark: new Set([chart.planets.Lagna.rasi]) }));
}

export function sphutaTable(rows, nameOf = (r) => N.planet(r.key)) {
  return table([tx("വർഗ്ഗസ്ഫുടം", "Varga sphuta"), tx("രാ. ഭാ. ക.", "Sign-deg-min"), tx("ന.", "Star")],
    rows.map((r) => [nameOf(r), h("span.num", N.sphuta(r.lon)), nakSubLabel(r.lon)]));
}

export function render(chart) {
  let D = PARASHARI_D.includes(+getUI().parashariD) ? +getUI().parashariD : 1;
  const out = h("div.stack");
  const select = h("select.input", { "aria-label": tx("വര്‍ഗ്ഗം", "Varga"), onchange: () => { D = +select.value; setUI({ parashariD: D }); draw(); } },
    PARASHARI_D.map((d) => h("option", { value: String(d), selected: d === D }, parashariName(d))));
  const body = h("div.stack");
  function draw() {
    const rows = parashariChart(chart, D);
    body.replaceChildren(...[
      vargaCharts(chart, rows, parashariName(D), tx("(പരാശരി)", "(Parashari)")),
      h("div", sphutaTable(rows), h("p.legend", NAK_SUB_LEGEND())),
      VARGA_SIGNIFICANCE && table([tx("വര്‍ഗനാമം", "Varga"), tx("ചിന്താവിഷയം", "Signifies")], VARGA_SIGNIFICANCE)].filter(Boolean));
  }
  draw();
  out.append(band("പരാശരി", "Parashari"), h("div.inline-form.no-print", h("label.field", h("span", tx("പരാശരി", "Varga")), select)), body);
  return out;
}
