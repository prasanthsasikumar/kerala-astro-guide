// Page 2: Charts (ഗ്രഹനില) - rasi, navamsa, bhava, bhavabala
import { h } from "../../../lib/dom.js";
import { tx, tf, lang } from "../../../lib/i18n.js";
import * as N from "../../../engine/names.js";
import { keralaChart } from "../../../components/kerala-chart.js";
import { cellsBy, bhavaChartSign, bhavabala, period } from "../../../engine/charts.js";
import { dasa, dayNum } from "../../../engine/core.js";
import { HOUSE } from "../../../engine/settings.js";

export function chartBox(cells, label, opts = {}) {
  return keralaChart(cells.map((ks) => ks.map((k) => N.planetShort(k))), { title: label, center: h("strong", label), ...opts });
}

const DASA_EN = { Kethu: "Ketu", Ven: "Venus", Sun: "Sun", Moo: "Moon", Mar: "Mars", Rahu: "Rahu", Jup: "Jupiter", Sat: "Saturn", Mer: "Mercury" };

// Plain-language notes shown under each chart.
export const EXPLAIN = {
  rasi: (chart) => tf(
    "രാശിചക്രം: 12 കള്ളികൾ 12 രാശികളാണ്, എപ്പോഴും ഒരേ സ്ഥാനത്ത് (മീനം ഇടത്തേ മുകളിൽ, പിന്നെ ഘടികാരദിശയിൽ). ഓരോ ഗ്രഹവും ജനനസമയത്ത് നിന്ന രാശിയിൽ എഴുതിയിരിക്കുന്നു. നിറമുള്ള കള്ളി ലഗ്നമാണ്: ജനനസമയത്ത് കിഴക്ക് ഉദിച്ചുകൊണ്ടിരുന്ന രാശി, ഇവിടെ {lagna}. ചന്ദ്രൻ {moon} രാശിയിലായിരുന്നു, അതിനാൽ കൂറ് {moon}.",
    "Rasi chart: the 12 boxes are the 12 signs, always in the same place (Pisces top-left, then clockwise). Each planet is written in the sign it was in at birth. The shaded box is the Lagna (As), the sign rising in the east at birth, here {lagna}. The Moon was in {moon}, so the Moon sign (koor) is {moon}.",
    { lagna: N.rasi(chart.planets.Lagna.rasi), moon: N.rasi(chart.planets.Moon.rasi) }),
  navamsa: () => tx(
    "നവാംശം: ഓരോ രാശിയെയും ഒമ്പതായി ഭാഗിച്ചു നോക്കുന്ന ചക്രം. ഗ്രഹങ്ങളുടെ യഥാർത്ഥ ബലവും വിവാഹകാര്യങ്ങളും നോക്കാൻ ഇത് ഉപയോഗിക്കുന്നു.",
    "Navamsa: each sign divided into nine parts, like zooming in. Astrologers use it to see how strong each planet really is, and for marriage and partnership."),
  bhava: () => tx(
    "ഭാവചക്രം: ലഗ്നം മുതൽ എണ്ണിയ ഭാവങ്ങളിൽ ഗ്രഹങ്ങൾ. ഓരോ ഭാവവും ജീവിതത്തിന്റെ ഒരു മേഖലയാണ്: 1 സ്വന്തം, 2 ധനം, കുടുംബം, 4 വീട്, അമ്മ, 5 മക്കൾ, 7 ജീവിതപങ്കാളി, 10 തൊഴിൽ, 11 ലാഭം.",
    "Bhava chart: the planets placed in houses, counted from the Lagna. Each house is an area of life: 1 self, 2 money and family, 4 home and mother, 5 children, 7 partner, 10 work, 11 gains."),
  bhavabala: () => tx(
    "ഭാവബലം: ഓരോ കള്ളിക്കും ഒരു ബലസംഖ്യ. സംഖ്യ കൂടുന്തോറും ആ മേഖലയ്ക്ക് ജാതകത്തിൽ കൂടുതൽ പിന്തുണയുണ്ട്.",
    "Bhavabala: a strength score for each box. Higher numbers mean that area of life gets more support in this chart."),
  legend: () => tx(
    "ല = ലഗ്നം · ര = സൂര്യൻ · ച = ചന്ദ്രൻ · കു = ചൊവ്വ · ബു = ബുധൻ · ഗു = വ്യാഴം · ശു = ശുക്രൻ · മ = ശനി · സ = രാഹു · ശി = കേതു · മാ = മാന്ദി",
    "As = Ascendant (Lagna) · Su = Sun · Mo = Moon · Ma = Mars · Me = Mercury · Ju = Jupiter · Ve = Venus · Sa = Saturn · Ra = Rahu · Ke = Ketu · Md = Mandi"),
  timeUnknown: () => tx(
    "ജനനസമയം അറിയാത്തതിനാൽ ലഗ്നവും ഭാവങ്ങളും ഏകദേശം മാത്രമാണ്.",
    "The birth time is not known, so the Lagna and houses are only a rough guess."),
};

// a chart with its plain-language note underneath
export const explained = (chartNode, note) => h("figure.chart-fig", chartNode, h("figcaption.chart-note", note));

export function render(chart, { db }) {
  const P = chart.planets;
  const lagnaMark = new Set([P.Lagna.rasi]);
  const ds = dasa(db, chart, P.Moon.lon);
  const age = period(dayNum(chart.date.y, chart.date.m, chart.date.d), Math.floor(Date.now() / 864e5));
  const b = ds.balance;
  const lord = lang() === "ml" ? b.lord.ml : DASA_EN[b.lord.lord];
  const charts = [
    explained(chartBox(cellsBy(chart, (k) => P[k].rasi), tx("രാശി", "Rasi"), { mark: lagnaMark }), EXPLAIN.rasi(chart)),
    explained(chartBox(cellsBy(chart, (k) => P[k].navamsa), tx("നവാംശം", "Navamsa"), { mark: new Set([P.Lagna.navamsa]) }), EXPLAIN.navamsa()),
    explained(chart.settings.house === 0
      ? chartBox(cellsBy(chart, (k) => P[k].rasi), tx("ഭാവം", "Bhava"), { mark: lagnaMark })
      : chartBox(cellsBy(chart, bhavaChartSign(chart)), tx("ഭാവം", "Bhava"), { mark: lagnaMark }), EXPLAIN.bhava()),
    explained(keralaChart(bhavabala(chart).map((v) => [String(v)]), { title: tx("ഭാവബലം", "Bhavabala"), center: h("strong", tx("ഭാവബലം", "Bhavabala")) }), EXPLAIN.bhavabala()),
  ];
  return h("div.stack",
    h("div.card.chart-intro",
      h("p", tf("{name} ജനിച്ച നിമിഷം ആകാശത്ത് ഗ്രഹങ്ങൾ എവിടെയായിരുന്നു എന്നാണ് ഈ ചക്രങ്ങൾ കാണിക്കുന്നത്.",
        "These charts show where the planets were in the sky at the moment {name} was born.", { name: chart.input.name || tx("ഇവർ", "this person") })),
      h("p", tf("ജന്മശിഷ്ടം: ജനിക്കുമ്പോൾ {lord} {y} വർഷം {m} മാസം {d} ദിവസം ബാക്കിയുണ്ടായിരുന്നു. ജീവിതം ഒമ്പത് ഗ്രഹദശകളിലൂടെ കടന്നുപോകുന്നു; ജനിച്ചത് ഈ ദശയിലാണ്.",
        "Dasa balance: at birth, {y} years {m} months {d} days of the {lord} period were left. Life moves through nine planet periods (dasas); this is the one {name} was born in.",
        { lord, y: b.years, m: b.months, d: b.days, name: chart.input.name || tx("ഇവർ", "this person") })),
      h("p.muted", tx("വയസ്സ്", "Age"), ": ", `${age.y} ${tx("വ", "y")} ${age.m} ${tx("മാ", "m")} ${age.d} ${tx("ദി", "d")}`, " · ",
        tx("ഭാവരീതി", "House system"), ": ", HOUSE.find((x) => x.v === chart.settings.house)?.label),
      chart.input.timeUnknown ? h("p.notice", EXPLAIN.timeUnknown()) : null),
    h("div.charts-row", charts),
    h("p.chart-legend", EXPLAIN.legend()));
}
