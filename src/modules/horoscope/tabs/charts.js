// Page 2: Charts (ഗ്രഹനില) - rasi, navamsa, bhava, bhavabala
import { h } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";
import * as N from "../../../engine/names.js";
import { keralaChart } from "../../../components/kerala-chart.js";
import { cellsBy, bhavaChartSign, bhavabala, period } from "../../../engine/charts.js";
import { dasa, dayNum } from "../../../engine/core.js";
import { HOUSE } from "../../../engine/settings.js";

export function chartBox(cells, label, opts = {}) {
  return keralaChart(cells.map((ks) => ks.map((k) => N.planetShort(k))), { title: label, center: h("strong", label), ...opts });
}

export function render(chart, { db }) {
  const P = chart.planets;
  const lagnaMark = new Set([P.Lagna.rasi]);
  const ds = dasa(db, chart, P.Moon.lon);
  const age = period(dayNum(chart.date.y, chart.date.m, chart.date.d), Math.floor(Date.now() / 864e5));
  const charts = [
    chartBox(cellsBy(chart, (k) => P[k].rasi), tx("രാശി", "Rasi"), { mark: lagnaMark }),
    chartBox(cellsBy(chart, (k) => P[k].navamsa), tx("നവാംശം", "Navamsa"), { mark: new Set([P.Lagna.navamsa]) }),
    chart.settings.house === 0
      ? chartBox(cellsBy(chart, (k) => P[k].rasi), tx("ഭാവം", "Bhava"), { mark: lagnaMark })
      : chartBox(cellsBy(chart, bhavaChartSign(chart)), tx("ഭാവം", "Bhava"), { mark: lagnaMark }),
    keralaChart(bhavabala(chart).map((v) => [String(v)]), { title: tx("ഭാവബലം", "Bhavabala"), center: h("strong", tx("ഭാവബലം", "Bhavabala")) }),
  ];
  return h("div.stack",
    h("div.card", { style: { padding: "var(--space-md)" } },
      h("div", tx("ജന്മശിഷ്ടം", "Dasa balance"), " = ", `${ds.balance.years} ${tx("വ", "y")} ${ds.balance.months} ${tx("മാ", "m")} ${ds.balance.days} ${tx("ദി", "d")} ${tx(ds.balance.lord.ml, ds.balance.lord.lord)}`),
      h("div", tx("വയസ്സ്", "Age"), " = ", `${age.y} ${tx("വ", "y")} ${age.m} ${tx("മാ", "m")} ${age.d} ${tx("ദി", "d")}`),
      h("div.muted", "House system: ", HOUSE.find((x) => x.v === chart.settings.house)?.label)),
    h("div.charts-row", charts),
    h("p.muted", tx("ല = ലഗ്നം. ര = രവി. ച = ചന്ദ്രന്‍. കു = കുജന്‍ (ചൊവ്വ). ബു = ബുധന്‍. ഗു = ഗുരു. ശു = ശുക്രന്‍. മ = മന്ദന്‍ (ശനി). സ = രാഹു. ശി = കേതു. മാ = മാന്ദി.",
      "As = Lagna, Su Mo Ma Me Ju Ve Sa, Ra = Rahu, Ke = Ketu, Md = Mandi. The shaded cell is the lagna.")));
}
