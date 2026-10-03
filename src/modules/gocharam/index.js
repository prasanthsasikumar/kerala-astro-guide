// Gocharam: ഗ്രഹപകർച്ച (sign ingress times) and ഗോചരഫലം (transit results from janma rasi).
import { h } from "../../lib/dom.js";
import "../../styles/gochar-tools.css";
import { t, tx } from "../../lib/i18n.js";
import { getCtx } from "../../lib/ctx.js";
import { nowParts } from "../../components/birth-form.js";
import * as N from "../../engine/names.js";
import { AYANAMSA } from "../../engine/settings.js";
import { grahaPakarcha, gocharaPhalam, validatePakarcha, TRANSIT_PLANETS } from "../../engine/gochar.js";
import { ampm } from "../../engine/tools.js";
import { parseDate, placeFromParams, placeQuery, field, select, toolForm, go } from "./form.js";

const PLANET_ML = ["സൂര്യന്‍", "ചന്ദ്രന്‍", "ബുധന്‍", "ശുക്രന്‍", "ചൊവ്വ", "വ്യാഴം", "ശനി", "രാഹു", "കേതു"];
const planetLabel = (i) => tx(PLANET_ML[i], TRANSIT_PLANETS[i]);

export async function render(el, params) {
  const tab = params.tab === "phalam" ? "phalam" : "pakarcha";
  el.append(h("div.page-head", h("h1", t("gocharam"))));
  el.append(h("div.tabs.no-print", { role: "tablist" },
    [["pakarcha", "ഗ്രഹപകർച്ച", "Planet ingress"], ["phalam", "ഗോചരഫലം", "Transit results"]].map(([id, ml, en]) =>
      h("button", { role: "tab", type: "button", "aria-selected": String(tab === id), onclick: () => { if (id !== tab) location.hash = `#/gocharam?tab=${id}`; } }, tx(ml, en)))));
  const ctx = await getCtx();
  if (tab === "phalam") phalam(el, params, ctx);
  else pakarcha(el, params, ctx);
}

function pakarcha(el, params, ctx) {
  const place = placeFromParams(params);
  const today = nowParts(place.tz).date;
  const from = h("input.input.num", { type: "date", value: params.f || today, required: true });
  const to = h("input.input.num", { type: "date", value: params.t || today, required: true });
  const pl = Math.min(8, Math.max(0, +params.pl || 0));
  const planetSel = select(TRANSIT_PLANETS.map((_, i) => [i, planetLabel(i)]), pl);
  el.append(toolForm({
    fields: [field(tx("തീയതി മുതൽ", "From date"), from), field(tx("തീയതി വരെ", "To date"), to), field(tx("ഗ്രഹം", "Planet"), planetSel)],
    place, submitLabel: t("calculate"),
    onSubmit: (p) => go("gocharam", { f: from.value, t: to.value, pl: planetSel.value, ...placeQuery(p) }),
  }));

  const F = parseDate(params.f);
  const T = parseDate(params.t);
  if (!F || !T) return;
  const planet = TRANSIT_PLANETS[pl];
  const err = validatePakarcha({ planet, from: F, to: T });
  if (err) { el.append(h("div.error", { style: { marginTop: "var(--space-md)" } }, err)); return; }

  const rows = grahaPakarcha(ctx.swe, ctx.settings, { planet, from: F, to: T, tz: place.tz });
  const ayan = AYANAMSA.find((a) => a.v === ctx.settings.ayanamsa)?.label || "";
  const body = rows.map((r) => {
    const { y, m, d, min } = r.local;
    return h("tr",
      h("td", N.rasi(r.fromSign)),
      h("td.num", `${d}/${m}/${y}  ${ampm(min / 60).text}`),
      h("td", N.rasi(r.toSign), r.retro ? h("span.gt-retro", " (വ)") : null));
  });
  el.append(h("div.stack", { style: { marginTop: "var(--space-lg)" } },
    h("div.table-wrap",
      h("table.data",
        h("caption.gt-caption", planetLabel(pl)),
        h("thead", h("tr", h("th", tx("രാശി", "From sign")), h("th", tx("ദിവസം", "Date & time")), h("th", tx("രാശി", "To sign")))),
        h("tbody", rows.length ? body : h("tr", h("td", { colspan: 3 }, tx("ഈ തീയതികൾക്ക്  ഇടയില്‍ ഗ്രഹപകർച്ച ഇല്ല.", "No sign change between these dates.")))))),
    rows.length > 0 && h("p.notice",
      `${tx("അയനാംശരീതി", "Ayanamsa")} : ${ayan}`, h("br"),
      tx("(ശരാശരി വേഗത ഉപയോഗിച്ചു ഗണിക്കുന്നതിനാല്‍ ഈ കൊടുത്തിരിക്കുന്ന ഗ്രഹപ്പകര്‍ച്ചാസമയം ഏകദേശം മാത്രമാണ്.)",
        "(Times are approximate.)"),
      rows.some((r) => r.retro) && h("span", h("br"), tx("വ = വക്രം", "വ = retrograde")),
      h("br"), tx(`സമയം: ${place.name || ""} (UTC${place.tz >= 0 ? "+" : ""}${place.tz})`, `Times for ${place.name || "place"} (UTC${place.tz >= 0 ? "+" : ""}${place.tz})`))));
}

function phalam(el, params, ctx) {
  const place = placeFromParams(params);
  const now = nowParts(place.tz);
  const rasiSel = select(ctx.db.tblMalayalamMonths.slice(0, 12).map((r, i) => [i, tx(r.Malayalam, N.RASI_EN[i])]), params.r ?? 0);
  const date = h("input.input.num", { type: "date", value: params.d || now.date, required: true });
  const time = h("input.input.num", { type: "time", value: params.tm || now.time, required: true });
  el.append(toolForm({
    fields: [field(tx("ജന്മരാശി", "Janma rasi"), rasiSel), field(t("date"), date), field(t("time"), time)],
    place, submitLabel: t("calculate"),
    onSubmit: (p) => go("gocharam", { tab: "phalam", r: rasiSel.value, d: date.value, tm: time.value, ...placeQuery(p) }),
  }));
  if (params.r == null) return;
  const D = parseDate(params.d || now.date);
  const [hh, mi] = (params.tm || now.time).split(":").map(Number);
  if (!D || !Number.isFinite(hh)) return;
  const rasi = Math.min(11, Math.max(0, +params.r || 0));
  const res = gocharaPhalam(ctx.swe, ctx.settings, { rasi, date: D, hours: hh + (mi || 0) / 60, tz: place.tz });
  el.append(h("section.phalam.stack", { style: { marginTop: "var(--space-lg)" } },
    h("h2", tx("ഗോചരഫലം", "Transit results")),
    h("p.muted", `${tx("ജന്മരാശി", "Janma rasi")}: ${N.rasi(rasi)} · ${D.d}-${D.m}-${D.y} ${ampm(hh + (mi || 0) / 60).text}`),
    res.map((r) => h("div",
      h("h3", `${N.planet(r.planet)} · ${N.rasi(r.sign)} (${r.house + 1})`),
      r.text && h("p", r.text)))));
}
