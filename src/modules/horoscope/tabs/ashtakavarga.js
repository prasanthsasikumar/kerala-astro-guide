// Page 6: Ashtakavarga (അഷ്ടവര്‍ഗം) - BAV/SAV in chart or table mode + SAV analyses
import { h, table } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";
import * as N from "../../../engine/names.js";
import { keralaChart } from "../../../components/kerala-chart.js";
import { ashtakavarga, savAnalyses, BAV_PLANETS } from "../../../engine/ashtakavarga.js";
import { band } from "./calc-common.js";

const SIGN_SHORT = ["മേ", "ഇ", "മി", "കര്‍", "ചി", "ക", "തു", "വൃ", "ധ", "മ", "കും", "മീ"];

export function render(chart, { db, yogam, settings }) {
  const P = chart.planets;
  const { bav, sav } = ashtakavarga(db, yogam, chart);
  const showRK = !!settings.ashtaRahuKetu;
  const extra = ["Lagna", ...(showRK ? ["Rahu", "Ketu"] : [])];
  const mark = (k) => new Set([P[k].rasi]);

  let main;
  if (!settings.ashtaTable) {
    const big = keralaChart(sav.map((v) => [String(v)]), { title: tx("സമുദായം", "Sarva ashtakavarga"), center: h("strong", tx("സമുദായം", "Samudayam (SAV)")), mark: mark("Lagna"), size: 420 });
    big.classList.add("av-big");
    const small = [...BAV_PLANETS, ...extra].map((k) =>
      keralaChart(bav[k].map((v) => [String(v)]), { title: N.planet(k), center: h("strong", N.planet(k)), mark: mark(k), size: 240 }));
    main = h("div.stack", band("അഷ്ടവര്‍ഗം", "Ashtakavarga"), big, h("div.av-grid", small));
  } else {
    const cols = [...BAV_PLANETS, "SAV", ...extra];
    const head = [tx("രാശി", "Sign"), ...cols.map((k) => (k === "SAV" ? tx("സമു.", "SAV") : N.planetShort(k)))];
    const rows = Array.from({ length: 12 }, (_, s) => [tx(SIGN_SHORT[s], N.RASI_EN[s]), ...cols.map((k) => String(k === "SAV" ? sav[s] : bav[k][s]))]);
    rows.push([tx("ആകെ", "Total"), ...cols.map((k) => h("strong", String((k === "SAV" ? sav : bav[k]).reduce((a, b) => a + b, 0))))]);
    const t = table(head, rows, { rightCols: head.map((_, i) => i).slice(1) });
    t.querySelectorAll("tbody tr")[P.Lagna.rasi].classList.add("block-alt");
    main = h("div.stack", h("div", band("അഷ്ടവര്‍ഗം", "Ashtakavarga"), t),
      h("p.legend",
        tx("മേ = മേടം. ഇ = ഇടവം. മി = മിഥുനം. കര്‍ = കര്‍ക്കിടകം. ചി = ചിങ്ങം. ക = കന്നി. തു = തുലാം. വൃ = വൃശ്ചികം. ധ = ധനു. മ = മകരം. കും = കുംഭം. മീ= മീനം",
          "Su Mo Ma Me Ju Ve Sa = bhinnashtakavarga of each planet, SAV = samudayam (sum of the seven), As = lagna"), h("br"),
        tx("ര. = രവി. ച. = ചന്ദ്രന്‍. കു = കുജന്‍ (ചൊവ്വ). ബു = ബുധന്‍. ഗു = ഗുരു. ശു = ശുക്രന്‍. മ = മന്ദന്‍ (ശനി). സ = സര്‍പ്പന്‍(രാഹു). സമു. = സമുദായം",
          showRK ? "Ra = Rahu, Ke = Ketu" : "")));
  }
  return h("div.stack", main, analyses(sav, P.Lagna.rasi, chart.input.gender));
}

export function analyses(sav, lagnaSign, gender) {
  const rows = [];
  savAnalyses(sav, lagnaSign, gender).forEach((b, i) => {
    const alt = [0, 2, 3, 5, 7].includes(i); // grey blocks (kendra shares khanda's band)
    const cls = alt ? "block-alt" : "";
    if (b.title) rows.push(h("tr", { class: cls }, h("td.block-head", { colSpan: 2 }, b.title)));
    for (const [k, v] of b.values) rows.push(h("tr", { class: cls }, h("td.c", k), h("td.r", String(v))));
    if (b.phalam) rows.push(h("tr", { class: cls }, h("td", h("strong", b.phalamLabel)), h("td", b.phalam)));
  });
  return h("div.page-break", h("div.table-wrap", { style: { maxWidth: "720px" } }, h("table.data", h("tbody", rows))));
}
