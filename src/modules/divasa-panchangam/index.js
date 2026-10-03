// Divasa panchangam (daily panchangam).
// Route #/divasa-panchangam?d=&t=&p=&la=&lo=&tz=&nk=[&tab=]
import { h } from "../../lib/dom.js";
import { PUBLIC } from "../../lib/edition.js";
import { t, tx } from "../../lib/i18n.js";
import { birthForm, nowParts, DEFAULT_PLACE } from "../../components/birth-form.js";
import { getCtx, inputToQuery, queryToInput } from "../../lib/ctx.js";
import * as N from "../../engine/names.js";
import { computeChart } from "../../engine/core.js";
import { timeData, lagnaPakarcha, kalahora, muhurtham, upagraha, panchangaPhalam, mrityudosham, MRITYU_TEXT, ampm } from "../../engine/panchangam.js";
import { tabbed, timeTab, sphutasTab, chartsTab, gunaDoshamTab, dataTable, band, labeller } from "../prashnam/shared.js";

function toQuery(i) {
  const q = new URLSearchParams(inputToQuery({ name: "", date: i.date, time: i.time, place: i.place }));
  q.delete("n"); q.delete("g");
  q.set("nk", i.nak);
  return q.toString();
}
function fromQuery(p) {
  const b = queryToInput(p);
  return b && { date: b.date, time: b.time, place: b.place, nak: Number.isFinite(+p.nk) && p.nk !== "" && p.nk != null ? +p.nk : 0 };
}

export async function render(el, params) {
  const input = fromQuery(params);
  el.append(h("div.page-head", h("div", h("h1", t("divasaPanchangam")),
    input && h("p", [input.date, input.time, input.place?.name].filter(Boolean).join(" · ")))));
  const ctx = await getCtx();
  if (!input || params.edit) {
    el.append(form(ctx, input || { ...nowParts(), place: DEFAULT_PLACE, nak: 0 }));
    return;
  }
  const chart = computeChart(ctx.swe, ctx.db, ctx.settings, { name: "", gender: "Male", date: input.date, time: input.time, place: input.place });
  const data = { inp: input, chart, time: timeData(ctx.swe, chart) };
  const q = toQuery(input);
  el.append(h("div.form-actions.no-print", { style: { margin: "0 0 var(--space-md)" } },
    h("a.btn", { href: `#/divasa-panchangam?${q}&edit=1` }, tx("മാറ്റുക", "Edit")),
    h("a.btn", { href: "#/divasa-panchangam" }, tx("പുതിയ തീയതി", "New date"))));
  tabbed(el, TABS, { params, uiKey: "divasaTab", data, ctx, hashBase: `#/divasa-panchangam?${q}` });
}

function form({ db }, v) {
  const nak = h("select.input", Array.from({ length: 27 }, (_, i) => h("option", { value: i, selected: i === +v.nak }, N.nak(db, i + 1))));
  const extra = h("div.form-grid", { style: { marginTop: "var(--space-md)" } },
    h("label.field", h("span", tx("ജന്മനക്ഷത്രം", "Birth star")), nak));
  return birthForm({ date: v.date, time: v.time, place: v.place }, {
    withName: false, withGender: false, extra,
    onSubmit: (i) => { location.hash = "#/divasa-panchangam?" + toQuery({ ...i, nak: +nak.value }); },
  });
}

// ---------- divasa-only tabs ----------
const timeRow = (label, s, e, now) => ({ cls: now ? "is-now" : "", cells: [label, h("span.num", ampm(s)), h("span.num", ampm(e))] });
const heads = () => [tx("", ""), tx("ആരംഭം", "Start"), tx("അവസാനം", "End")];
const nextDayNote = () => h("p.muted", tx("നിലവിലെ സമയം ഉൾപ്പെടുന്ന വരി നിറം നൽകി കാണിച്ചിരിക്കുന്നു.", "The row containing the chosen time is highlighted."));

function lagnaPakarchaTab({ chart }, { swe }) {
  const rows = lagnaPakarcha(swe, chart);
  return h("div.stack", band("ലഗ്നപകർച്ച", "Lagna changes"),
    dataTable([tx("ലഗ്നം", "Lagna"), tx("ആരംഭം", "Start"), tx("അവസാനം", "End")],
      rows.map((r) => ({ cls: r.now ? "is-now" : "", cells: [N.rasi(r.rasi), h("span.num", ampm(r.start) + (r.start < 0 ? " ⁻" : "")), h("span.num", ampm(r.end) + (r.end >= 24 ? " *" : ""))] }))),
    h("p.muted", tx("⁻ = തലേ ദിവസം, * = അടുത്ത ദിവസം", "⁻ = previous day, * = next day")));
}

function kalahoraTab({ chart }) {
  const k = kalahora(chart);
  const r = (x) => timeRow(N.planet(x.lord), x.start, x.end, x.now);
  return h("div.stack", band("കാലഹോര", "Kalahora"),
    dataTable(heads(), [{ section: tx("പകൽ‍", "Day") }, ...k.day.map(r), { section: tx("രാത്രി", "Night") }, ...k.night.map(r)]), nextDayNote());
}

function muhurthamTab({ chart }, { db }) {
  const m = muhurtham(db, chart);
  const r = (x) => timeRow(x.name, x.start, x.end, x.now);
  return h("div.stack", band("മുഹൂർത്തം", "Muhurtham"),
    dataTable(heads(), [{ section: tx("പകൽ‍", "Day") }, ...m.day.map(r), { section: tx("രാത്രി", "Night") }, ...m.night.map(r)]),
    m.phalam && h("div.phalam", h("h3", tx("മുഹൂര്‍ത്തഫലം", "Muhurtha result")), h("p", m.phalam)));
}

function upagrahaTab({ chart }) {
  const u = upagraha(chart);
  const r = (x) => timeRow(tx(x.ml, x.en), x.start, x.end, x.now);
  return h("div.stack", band("ഉപഗ്രഹകാലം", "Upagraha kalam"),
    dataTable(heads(), [
      { section: tx("രാഹുകാലം (അഷ്ടമംഗല രാഹു)", "Rahu kalam (Ashtamangala Rahu)") }, ...u.rahu.map(r),
      { section: tx("ഉപഗ്രഹകാലം പരാശരപക്ഷം (പകൽ)", "Upagraha kalam, Parashara (day)") }, ...u.day.map(r),
      { section: tx("ഉപഗ്രഹകാലം പരാശരപക്ഷം (രാത്രി)", "Upagraha kalam, Parashara (night)") }, ...u.night.map(r),
    ]), nextDayNote());
}

function panchangaPhalamTab({ chart, inp }, { swe, db }) {
  const p = panchangaPhalam(swe, db, chart, inp.nak + 1);
  const sec = (ml, en, x) => [h("h3", tx(ml, en), " ", h("span.muted", `(${x.name})`)), h("p", x.text)];
  return h("div.stack", band("പഞ്ചാംഗഫലം", "Panchanga results"),
    h("div.phalam",
      sec("തിഥിഫലം", "Tithi", p.tithi), sec("കരണഫലം", "Karanam", p.karana), sec("നക്ഷത്രഫലം", "Star (tara)", p.nakshatra),
      sec("നിത്യയോഗഫലം", "Nithya yoga", p.nitya), sec("വാരഫലം", "Weekday", p.vara)));
}

function mrityuTab({ chart }, { swe, db }) {
  const m = mrityudosham(swe, db, chart, labeller(db));
  const T = MRITYU_TEXT;
  const present = m.rows.filter((r) => r.present);
  return h("div.stack", band("മൃത്യുദോഷം", "Mrityu dosham"),
    dataTable(null, m.rows.map((r) => [tx(r.ml, r.en), r.present ? h("span.pr-yes-bad", tx("ഉണ്ട്", "Yes")) : tx("ഇല്ല", "No"), { td: r.detail, cls: "pr-detail" }])),
    T && h("div.phalam",
      h("p", T.intro),
      present.length === 0 ? h("p", h("strong", T.none)) : [
        h("h3", T.head),
        present.map((r) => h("p", h("strong", T[r.key][0]), " ", T[r.key][1])),
        h("p", T.close),
      ]));
}

const ALL_TABS = [
  { id: "time", ml: "സമയം", en: "Time", render: (d, c) => timeTab(d, c, "divasa") },
  { id: "sphutas", ml: "സ്ഫുടങ്ങള്‍", en: "Sphutas", render: (d) => sphutasTab(d) },
  { id: "chart", ml: "ഗ്രഹനില", en: "Chart", render: (d, c) => chartsTab(d, c, {}) },
  { id: "lagna-pakarcha", ml: "ലഗ്നപകർച്ച", en: "Lagna changes", render: lagnaPakarchaTab },
  { id: "kalahora", ml: "കാലഹോര", en: "Kalahora", render: (d) => kalahoraTab(d) },
  { id: "muhurtham", ml: "മുഹൂർത്തം", en: "Muhurtham", render: muhurthamTab },
  { id: "upagraha", ml: "ഉപഗ്രഹകാലം", en: "Upagraha kalam", render: (d) => upagrahaTab(d) },
  { id: "panchanga-phalam", ed: "full", ml: "പഞ്ചാംഗഫലം", en: "Panchanga results", render: panchangaPhalamTab },
  { id: "guna-dosham", ml: "ഗുണദോഷം", en: "Guna-dosham", render: (d, c) => gunaDoshamTab(d, c, d.inp.nak + 1) },
  { id: "mrityudosham", ml: "മൃത്യുദോഷം", en: "Mrityu dosham", render: mrityuTab },
];
export const TABS = ALL_TABS.filter((t) => !PUBLIC || t.ed !== "full");
