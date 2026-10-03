// Vivaha porutham (marriage matching): input (female + male) and the 9 result tabs.
import "../../styles/porutham.css";
import { h, clear } from "../../lib/dom.js";
import { t, tx } from "../../lib/i18n.js";
import { birthForm } from "../../components/birth-form.js";
import { listCharts, getUI, setUI } from "../../lib/store.js";
import { getCtx, inputToQuery, queryToInput } from "../../lib/ctx.js";
import { computeMatch } from "../../engine/porutham.js";
import { TABS } from "./tabs.js";

// Two inputs in one query: every key of inputToQuery prefixed with "f" (female) or "m" (male).
export function pairToQuery(f, m) {
  const q = new URLSearchParams();
  for (const [pre, i] of [["f", f], ["m", m]]) for (const [k, v] of new URLSearchParams(inputToQuery(i))) q.set(pre + k, v);
  return q.toString();
}
export function queryToPair(params) {
  const side = (pre, gender) => {
    const o = {};
    for (const [k, v] of Object.entries(params)) if (k.startsWith(pre)) o[k.slice(1)] = v;
    const i = queryToInput(o);
    return i && { ...i, gender };
  };
  return { f: side("f", "Female"), m: side("m", "Male") };
}

export async function render(el, params) {
  const { f, m } = queryToPair(params);
  const title = h("div.page-head", h("div", h("h1", t("porutham")),
    f && m && h("p", `${f.name || "untitled"} (${f.date}) & ${m.name || "untitled"} (${m.date})`)));
  el.append(title);
  if (!f || !m || params.edit) return el.append(inputForm(f, m));

  const ctx = await getCtx();
  const M = computeMatch(ctx.swe, ctx.db, ctx.settings, f, m);

  el.append(h("div.form-actions.no-print", { style: { margin: "0 0 var(--space-md)" } },
    h("a.btn", { href: "#/porutham?" + pairToQuery(f, m) + "&edit=1" }, tx("മാറ്റുക", "Edit")),
    h("a.btn", { href: "#/porutham" }, tx("പുതിയ പൊരുത്തം", "New match"))));

  const tabBar = h("div.tabs.no-print", { role: "tablist" });
  const panel = h("section", { role: "tabpanel" });
  el.append(tabBar, panel);
  let current = TABS.find((x) => x.id === params.tab) || TABS.find((x) => x.id === getUI().poruthamTab) || TABS[0];
  const drawBar = () => tabBar.replaceChildren(...TABS.map((tab) =>
    h("button", { role: "tab", type: "button", "aria-selected": String(tab === current), onclick: () => show(tab) }, tx(tab.ml, tab.en))));
  function show(tab) {
    current = tab;
    setUI({ poruthamTab: tab.id });
    drawBar();
    try {
      clear(panel).append(tab.render(M, ctx));
    } catch (err) {
      console.error(err);
      clear(panel).append(h("div.error", String(err.message || err)));
    }
  }
  show(current);
}

function inputForm(f, m) {
  const vals = { f: null, m: null };
  const blocks = {};
  const saved = listCharts().filter((c) => c.date && c.time && c.place);
  const block = (key, label, gender, initial) => {
    const wrap = h("div.pm-person");
    const draw = (init) => {
      const form = birthForm({ gender, ...(init || {}) }, {
        withGender: false,
        onSubmit: (v) => { vals[key] = { ...v, gender }; },
      });
      form.querySelector("button[type=submit]")?.remove(); // one shared Proceed button below
      blocks[key] = form;
      const pick = saved.length > 0 && h("label.field.pm-load",
        h("span", tx("സൂക്ഷിച്ച ജാതകം എടുക്കുക", "Load a saved chart")),
        h("select.input", {
          onchange: (e) => { const c = saved.find((x) => x.id === e.target.value); if (c) draw({ ...c, gender }); },
        }, h("option", { value: "" }, "—"), saved.map((c) => h("option", { value: c.id }, `${c.name || "untitled"} · ${c.date} ${c.time}`))));
      wrap.replaceChildren(h("h2", label), pick || "", form);
    };
    draw(initial);
    return wrap;
  };
  const proceed = () => {
    vals.f = vals.m = null;
    blocks.f.requestSubmit();
    blocks.m.requestSubmit();
    if (vals.f && vals.m) location.hash = "#/porutham?" + pairToQuery(vals.f, vals.m);
  };
  return h("div.stack",
    block("f", tx("സ്ത്രീ", "Female"), "Female", f),
    block("m", tx("പുരുഷൻ", "Male"), "Male", m),
    h("div.form-actions", h("button.btn.btn-primary", { type: "button", onclick: proceed }, tx("പൊരുത്തം നോക്കുക", "Match"))));
}
