// Prashnam tabs in display order. render(data, ctx) -> Node.
import { h, kv } from "../../lib/dom.js";
import { tx } from "../../lib/i18n.js";
import * as N from "../../engine/names.js";
import { SPHUTA_EXPLAIN, ASHTA, fmtLd, J, R } from "../../engine/prashnam.js";
import { timeTab, sphutasTab, chartsTab, gunaDoshamTab, dataTable, band, nakCell } from "./shared.js";

const sphutaRow = (label, lon) => [label, h("span.num", N.sphuta(lon))];

function prashnaSphutasTab({ sphutas }) {
  return h("div.stack",
    band("പ്രശ്നസ്ഫുടങ്ങള്‍", "Prashna sphutas"),
    dataTable([tx("സ്ഫുടങ്ങൾ", "Sphuta"), tx("രാ. ഭാ. ക.", "Sign-deg-min"), tx("നക്ഷ.", "Star")],
      sphutas.list.map((s) => [tx(s.ml, s.en), h("span.num", fmtLd(s.lon)), N.NAK_SHORT_ML[Math.trunc((s.lon * 6) / 80) % 27]])),
    h("div", h("h3", tx("വിവരണം", "Explanation")),
      dataTable(null, SPHUTA_EXPLAIN.map(([a, b]) => [a, "=", b]))),
    h("p.muted", tx("ന. = നക്ഷത്രം, ബിംബസാ. = ബിംബസാധനം", "Sign 0 = Mesha. Formulas as written in the Malayalam tradition.")));
}

function tamboolamTab({ inp, tamboolam: T }, { db }) {
  return h("div.card", band("താംബൂലം", "Tamboolam"), kv([
    [tx("പ്രധാനാരൂഢം", "Arudha rasi"), N.rasi(inp.arudam)],
    [tx("പൃച്ഛകനക്ഷത്രം", "Querent's star"), N.nak(db, inp.nak + 1)],
    [tx("ആരൂഢസ്ഫുടം", "Arudha sphuta"), h("span.num", N.sphuta(T.aru))],
    [tx("വീഥിരാശി", "Veedhi rasi"), N.rasi(T.veedhiRasi)],
    [tx("വീഥിസ്പുടം", "Veedhi sphuta"), h("span.num", N.sphuta(T.veedhi))],
    [tx("ഛത്രരാശി", "Chatra rasi"), N.rasi(T.chatraRasi)],
    [tx("ഛത്രസ്പുടം", "Chatra sphuta"), h("span.num", N.sphuta(T.chatra % 360))],
    [tx("അഷ്ടമംഗലസംഖ്യ", "Ashtamangala number"), String(inp.ano)],
    [tx("താംബൂലസംഖ്യ", "Tamboola number"), String(inp.tno)],
    T.tnoResult && [tx("താംബൂലസംഖ്യാഫലം", "Tamboola number result"), T.tnoResult],
    [tx("താംബൂലഗ്രഹം", "Tamboola planet"), N.planet(T.planet)],
    T.planetResult && [tx("താംബൂലഗ്രഹഫലം", "Tamboola planet result"), T.planetResult],
    [tx("താംബൂലാരൂഢം", "Tamboola arudha"), N.rasi(T.tamRasi)],
    T.tamRasiResult && [tx("താംബൂലാരൂഢഫലം", "Tamboola arudha result"), T.tamRasiResult],
    [tx("സ്വർണസ്ഥിത രാശി", "Gold rasi"), N.rasi(inp.swarnaRasi)],
    T.swarna && [tx("സ്വർണാംശകം", "Gold navamsa"), N.rasi(T.swarna.navRasi)],
  ]));
}

function sutramsTab({ sutrams }) {
  const res = (s) => h("strong.pr-result", { class: s.result === J ? "pr-yes-good" : s.result === R ? "" : "pr-yes-bad" }, s.result);
  const rows = sutrams.flatMap((s) => [
    { section: h("span", tx(s.ml, s.en), " : ", s.note ? `${s.note} ` : "", res(s)) },
    s.bhutam && [tx("ഭൂതം", "Element"), s.bhutam],
    s.graham && [tx("ഗ്രഹം", "Planet"), N.planet(s.graham)],
  ]);
  return h("div.stack", band("സൂത്രം", "Sutrams"), dataTable(null, rows));
}

function shadvargaTab({ shadvarga }) {
  const sh = (k) => N.planetShort(k);
  return h("div.stack",
    band("പ്രശ്നഷഡ്വര്‍ഗ്ഗം", "Prashna shadvarga"),
    dataTable([tx("സ്ഫുടം", "Sphuta"), "D3", "D2", "D9", "D30", "D12", "D1"],
      shadvarga.map((r) => ({ cls: `sv-${r.tone}`, cells: [tx(r.ml, r.en), sh(r.D3), sh(r.D2), sh(r.D9), sh(r.D30), sh(r.D12), sh(r.D1)] }))),
    h("p.muted", tx("ര. = രവി. ച. = ചന്ദ്രന്‍. കു = കുജന്‍ (ചൊവ്വ). ബു = ബുധന്‍. ഗു = ഗുരു. ശു = ശുക്രന്‍. മ = മന്ദന്‍ (ശനി). സ = രാഹു. ശി = കേതു. മാ = മാന്ദി.",
      "Su Mo Ma Me Ju Ve Sa = the seven planets. Red: more than 3 malefic vargas; green: fewer than 3 malefic and more than 3 benefic; yellow: mixed.")),
    h("p.muted", "D1 = ക്ഷേത്രം. D2 = ഹോര. D3 = ദ്രേക്കാണം. D9 = നവാംശം. D12 = ദ്വാദശാംശം. D30 = ത്രിംശാംശം."));
}

function ashtamangalamTab({ ashta }) {
  const heads = [["ഭൂതം‍", "Past"], ["വർത്തമാനം", "Present"], ["ഭാവി", "Future"]];
  const rows = ashta.flatMap((n, k) => [
    { section: tx(heads[k][0], heads[k][1]) },
    [tx("അക്കം", "Digit"), String(n)],
    [tx("ഗ്രഹം", "Planet"), N.planet(ASHTA.graha[n - 1])],
    ...(ASHTA.dev ? [
      [tx("ദേവത", "Deity"), ASHTA.dev[n - 1]],
      [tx("ധ്വജാദിയോനി", "Dhwajadi yoni"), ASHTA.dhwaja[n - 1]],
      [tx("ഗരുഡാദിയോനി", "Garudadi yoni"), ASHTA.garuda[n - 1]],
      [tx("പക്ഷി", "Bird"), ASHTA.bird[n - 1]],
      [tx("വൃക്ഷം", "Tree"), ASHTA.tree[n - 1]],
      [tx("ഭൂതം", "Element"), ASHTA.bhuta[n - 1].trim()],
      [tx("മറ്റുള്ളവ", "Others"), ASHTA.other[k]],
    ] : []),
  ]);
  return h("div.stack", band("അഷ്ടമംഗലം", "Ashtamangalam"), dataTable(null, rows));
}

function kpTab({ kp }, { db }) {
  const nl = (lord, nk) => `${N.planet(lord)} (${N.nak(db, nk)})`;
  return h("div.card", band("ഭരണഗ്രഹങ്ങൾ (RP)", "Ruling planets (RP)"), kv([
    [tx("ലഗ്ന നക്ഷത്രാധിപൻ", "Lagna star lord"), nl(kp.lagnaNakLord, kp.lagnaNak)],
    [tx("ലഗ്ന രാശ്യധിപൻ", "Lagna sign lord"), N.planet(kp.lagnaRasiLord)],
    [tx("ചന്ദ്ര നക്ഷത്രാധിപൻ", "Moon star lord"), nl(kp.moonNakLord, kp.moonNak)],
    [tx("ചന്ദ്ര രാശ്യധിപൻ", "Moon sign lord"), N.planet(kp.moonRasiLord)],
    [tx("വാരാധിപൻ", "Weekday lord"), N.planet(kp.varaLord)],
    [tx("ല. ന. ഉപാധിപൻ", "Lagna sub lord"), N.planet(kp.lagnaSub)],
    [tx("ച. ന. ഉപാധിപൻ", "Moon sub lord"), N.planet(kp.moonSub)],
  ]));
}

function printTab(data, ctx) {
  const parts = TABS.filter((x) => x.id !== "print").map((x) => x.render(data, ctx));
  return h("div.pr-print",
    h("div.form-actions.no-print", { style: { marginTop: 0, marginBottom: "var(--space-md)" } },
      h("button.btn.btn-primary", { type: "button", onclick: () => window.print() }, tx("പ്രിന്റ്", "Print"))),
    parts.flatMap((p, i) => (i ? [h("div.pr-print-sep"), p] : [p])));
}

export const TABS = [
  { id: "time", ml: "സമയം", en: "Time", render: (d, c) => timeTab(d, c, "prashnam") },
  { id: "sphutas", ml: "സ്ഫുടങ്ങൾ", en: "Sphutas", render: (d) => sphutasTab(d) },
  { id: "chart", ml: "ഗ്രഹനില", en: "Chart", render: (d, c) => chartsTab(d, c, { arudha: d.arudha, swarna: d.swarna, bhavabala: true }) },
  { id: "prashna-sphutas", ml: "പ്രശ്നസ്ഫുടങ്ങൾ", en: "Prashna sphutas", render: (d) => prashnaSphutasTab(d) },
  { id: "tamboolam", ml: "താംബൂലം", en: "Tamboolam", render: tamboolamTab },
  { id: "guna-dosham", ml: "ഗുണദോഷം", en: "Guna-dosham", render: (d, c) => gunaDoshamTab(d, c, d.inp.nak + 1) },
  { id: "sutrams", ml: "സൂത്രങ്ങൾ", en: "Sutrams", render: (d) => sutramsTab(d) },
  { id: "shadvarga", ml: "പ്രശ്നഷഡ്വര്‍ഗ്ഗം", en: "Prashna shadvarga", render: (d) => shadvargaTab(d) },
  { id: "ashtamangalam", ml: "അഷ്ടമംഗലം", en: "Ashtamangalam", render: (d) => ashtamangalamTab(d) },
  { id: "kp", ml: "കൃഷ്ണമൂർത്തി പദ്ധതി", en: "KP", render: kpTab },
  { id: "print", ml: "Print", en: "Print", render: printTab },
];

export { nakCell, sphutaRow };
