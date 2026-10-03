// Prashnam (horary). Route #/prashnam?d=&t=&p=&la=&lo=&tz=&ar=&nk=&tn=&an=&sr=&sa=[&tab=]
import { h } from "../../lib/dom.js";
import { t, tx } from "../../lib/i18n.js";
import { birthForm, nowParts, DEFAULT_PLACE } from "../../components/birth-form.js";
import { getCtx, inputToQuery, queryToInput } from "../../lib/ctx.js";
import * as N from "../../engine/names.js";
import { computePrashna, validateAno, DEFAULT_PRASHNA } from "../../engine/prashnam.js";
import { tabbed } from "./shared.js";
import { TABS } from "./tabs.js";

function toQuery(i) {
  const q = new URLSearchParams(inputToQuery({ name: "", date: i.date, time: i.time, place: i.place }));
  q.delete("n"); q.delete("g");
  q.set("ar", i.arudam); q.set("nk", i.nak); q.set("tn", i.tno); q.set("an", i.ano);
  q.set("sr", i.swarnaRasi); q.set("sa", i.swarnamsha);
  return q.toString();
}
function fromQuery(p) {
  const base = queryToInput(p);
  if (!base) return null;
  const num = (x, d) => (x == null || x === "" || Number.isNaN(+x) ? d : +x);
  return {
    date: base.date, time: base.time, place: base.place,
    arudam: num(p.ar, 0), nak: num(p.nk, 0), tno: num(p.tn, 4), ano: num(p.an, 121),
    swarnaRasi: num(p.sr, 0), swarnamsha: num(p.sa, 0),
  };
}

export async function render(el, params) {
  const input = fromQuery(params);
  el.append(h("div.page-head", h("div", h("h1", t("prashnam")),
    input && h("p", [input.date, input.time, input.place?.name].filter(Boolean).join(" · ")))));
  const ctx = await getCtx();

  if (!input || params.edit) {
    el.append(prashnaForm(ctx, input || { ...DEFAULT_PRASHNA, ...nowParts(), place: DEFAULT_PLACE }));
    return;
  }
  const err = validateAno(input.ano);
  if (err) {
    el.append(h("div.error", "Enter Correct Ashtamangala sanghya"),
      prashnaForm(ctx, input));
    return;
  }

  const data = computePrashna(ctx.swe, ctx.db, ctx.settings, input);
  const q = toQuery(input);
  el.append(h("div.form-actions.no-print", { style: { margin: "0 0 var(--space-md)" } },
    h("a.btn", { href: `#/prashnam?${q}&edit=1` }, tx("മാറ്റുക", "Edit")),
    h("a.btn", { href: "#/prashnam" }, tx("പുതിയ പ്രശ്നം", "New query"))));
  tabbed(el, TABS, { params, uiKey: "prashnaTab", data, ctx, hashBase: `#/prashnam?${q}` });
}

function prashnaForm({ db }, v) {
  const sel = (items, value) => h("select.input", items.map(([val, label]) => h("option", { value: val, selected: +val === +value }, label)));
  const arudam = sel(Array.from({ length: 12 }, (_, i) => [i, N.rasi(i)]), v.arudam);
  const nak = sel(Array.from({ length: 27 }, (_, i) => [i, N.nak(db, i + 1)]), v.nak);
  const tno = h("input.input.num", { type: "number", min: "1", step: "1", value: v.tno, required: true, inputmode: "numeric" });
  const ano = h("input.input.num", { type: "text", value: v.ano, inputmode: "numeric", maxlength: "3", pattern: "[1-8]{3}", required: true });
  const swR = sel(Array.from({ length: 12 }, (_, i) => [i, N.rasi(i)]), v.swarnaRasi);
  let amsha = v.swarnamsha || 0;
  const boxes = Array.from({ length: 9 }, (_, i) => h("input", { type: "checkbox", checked: amsha === i + 1, "aria-label": String(i + 1) }));
  boxes.forEach((b, i) => b.addEventListener("change", () => {
    amsha = b.checked ? i + 1 : 0;
    boxes.forEach((o, j) => { o.checked = j === amsha - 1; });
  }));
  const msg = h("p.error", { hidden: true });
  const check = () => {
    ano.setAttribute("aria-invalid", "false");
    tno.setAttribute("aria-invalid", "false");
    if (String(tno.value).trim() === "" || !(+tno.value > 0)) { tno.setAttribute("aria-invalid", "true"); return "Enter Tamboola sanghya"; }
    const e = validateAno(ano.value);
    if (e === "len") { ano.setAttribute("aria-invalid", "true"); return "Ashtamangala sanghya must be 3 digits"; }
    if (e) { ano.setAttribute("aria-invalid", "true"); return "Enter Correct Ashtamangala sanghya (digits 1-8, sum 4, 12 or 20)"; }
    return null;
  };
  const field = (label, el2, span) => h("label.field", span ? { style: { gridColumn: "span 2" } } : {}, h("span", label), el2);
  const extra = h("div.stack", { style: { marginTop: "var(--space-md)" } },
    h("div.form-grid",
      field(tx("പ്രധാനാരൂഢം", "Arudha rasi"), arudam),
      field(tx("പൃച്ഛകനക്ഷത്രം", "Querent's star"), nak),
      field(tx("താംബൂലസംഖ്യ", "Tamboola number"), tno),
      field(tx("അഷ്ടമംഗലസംഖ്യ", "Ashtamangala number"), ano),
      field(tx("സ്വർണസ്ഥിത രാശി", "Gold (swarna) rasi"), swR),
      h("div.field", { style: { gridColumn: "span 2" } }, h("span", tx("സ്വർണാംശകം", "Gold navamsa (1-9)")),
        h("div.pr-swarna", boxes.map((b, i) => h("label", b, String(i + 1)))))),
    msg);
  return birthForm({ date: v.date, time: v.time, place: v.place }, {
    withName: false, withGender: false, extra,
    onSubmit: (i) => {
      const e = check();
      msg.hidden = !e;
      msg.textContent = e || "";
      if (e) return;
      location.hash = "#/prashnam?" + toQuery({
        date: i.date, time: i.time, place: i.place,
        arudam: +arudam.value, nak: +nak.value, tno: parseInt(tno.value, 10), ano: parseInt(ano.value, 10),
        swarnaRasi: +swR.value, swarnamsha: amsha,
      });
    },
  });
}
