// Panchanga shuddhi (Muhurtham): daily good/bad grid at sunrise for weekday, star, tithi, nithya yoga, karana.
import "../../styles/gochar-tools.css";
import { h, clear } from "../../lib/dom.js";
import { t, tx } from "../../lib/i18n.js";
import { getCtx } from "../../lib/ctx.js";
import { nowParts } from "../../components/birth-form.js";
import * as N from "../../engine/names.js";
import { panchangaShuddhi, validateShuddhi, shuddhiTime, dmy } from "../../engine/tools.js";
import { parseDate, placeFromParams, placeQuery, field, toolForm, go } from "../gocharam/form.js";

const COLS = [
  ["dow", "വാ.", "Day"],
  ["nak", "ന.", "Star"],
  ["tithi", "തി.", "Tithi"],
  ["nitya", "നി.", "Yoga"],
  ["karana", "ക.", "Kar."],
];

export async function render(el, params) {
  const place = placeFromParams(params);
  const today = nowParts(place.tz).date;
  const from = h("input.input.num", { type: "date", value: params.f || today, required: true });
  const to = h("input.input.num", { type: "date", value: params.t || today, required: true });
  el.append(h("div.page-head", h("div", h("h1", t("panchangaShuddhi")),
    params.f && h("p", [place.name, `${params.f} → ${params.t}`].filter(Boolean).join(" · ")))));
  el.append(toolForm({
    fields: [field(tx("തീയതി മുതൽ", "From date"), from), field(tx("തീയതി വരെ", "To date"), to)],
    place, submitLabel: t("calculate"),
    onSubmit: (p) => go("panchanga-shuddhi", { f: from.value, t: to.value, ...placeQuery(p) }),
  }));

  const F = parseDate(params.f);
  const T = parseDate(params.t);
  if (!F || !T) return;
  const err = validateShuddhi(F, T);
  if (err) { el.append(h("div.error", { style: { marginTop: "var(--space-md)" } }, err)); return; }

  const { swe, db, settings } = await getCtx();
  const days = panchangaShuddhi(swe, settings, { from: F, to: T, place });
  const detail = h("aside.card.ps-detail", { "aria-live": "polite" });
  const rows = [];

  const weekmal = (dow) => tx(db.tblWeekdayResult[dow - 1].Weekmal, N.WEEKDAY_EN[dow - 1]);
  function showDetail(i) {
    const d = days[i];
    rows.forEach((r, k) => r.classList.toggle("ps-selected", k === i));
    const params2 = new URLSearchParams(location.hash.split("?")[1] || "");
    params2.set("sel", dmy(d.date));
    history.replaceState(null, "", "#/panchanga-shuddhi?" + params2.toString());
    const th = db.tblThidhi[d.tithi - 1];
    const ny = db.tblNityayoga[d.nitya - 1];
    const kr = db.tblKaranam[d.karana - 1];
    const line = (good, name, label, end) => h("li", h("span.dot", { class: good ? "good" : "bad" }),
      h("span", h("strong", name), " ", label, end != null && [" ", h("span.num", shuddhiTime(end)), " ", tx("വരെ", "until")]));
    clear(detail).append(
      h("h3", `${dmy(d.date)} ${weekmal(d.dow)}`),
      h("ul",
        line(d.good.dow, weekmal(d.dow), tx("വാരം", "weekday")),
        line(d.good.nak, tx(db.tblMalayalamNakshatra[d.nak - 1].Name, N.NAK_EN[d.nak - 1]), tx("നക്ഷത്രം", "star"), d.ends.nak),
        line(d.good.tithi, tx(th.Malayalam, th.Thidhi), tx("തിഥി", "tithi"), d.ends.tithi),
        line(d.good.nitya, tx(ny.Html, ny.Name), tx("നിത്യയോഗം", "nithya yoga"), d.ends.nitya),
        line(d.good.karana, tx(kr.Html, kr.karanam), tx("കരണം", "karanam"), d.ends.karana)),
      h("p.muted", { style: { marginTop: "var(--space-sm)", fontSize: "var(--text-xs)" } },
        tx(`സൂര്യോദയം ${shuddhiTime(d.sunrise)} · * - അടുത്ത ദിവസം`, `Sunrise ${shuddhiTime(d.sunrise)} · * - Next day`)));
  }

  const tbody = h("tbody");
  days.forEach((d, i) => {
    const tr = h("tr",
      h("td.ps-date.num", dmy(d.date)),
      COLS.map(([k, ml, en]) => h("td", h("button.ps-cell", {
        type: "button", class: d.good[k] ? "good" : "bad",
        "aria-label": `${dmy(d.date)} ${tx(ml, en)} ${d.good[k] ? tx("ശുഭം", "good") : tx("അശുഭം", "bad")}`,
        onclick: () => showDetail(i),
      }, d.good[k] ? "✓" : "✕"))));
    rows.push(tr);
    tbody.append(tr);
  });

  el.append(h("div.ps-layout", { style: { marginTop: "var(--space-lg)" } },
    h("div.stack",
      h("div.table-wrap", h("table.data.ps-grid",
        h("thead", h("tr", h("th", tx("തീയതി", "Date")), COLS.map(([, ml, en]) => h("th", { title: en }, tx(ml, en))))),
        tbody)),
      h("div.ps-legend",
        h("span", h("i.good"), tx("ശുഭം", "Good")),
        h("span", h("i.bad"), tx("അശുഭം", "Bad")),
        h("span", "* - Next day"))),
    detail));

  const sel = days.findIndex((d) => dmy(d.date) === params.sel);
  showDetail(sel >= 0 ? sel : 0);
}
