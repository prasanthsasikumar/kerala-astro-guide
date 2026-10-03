import { h, clear } from "../../lib/dom.js";
import { t, tx } from "../../lib/i18n.js";
import { birthForm } from "../../components/birth-form.js";
import { listCharts, saveChart, getUI, setUI } from "../../lib/store.js";
import { getCtx, inputToQuery, queryToInput } from "../../lib/ctx.js";
import { computeChart } from "../../engine/core.js";
import { TABS } from "./tabs.js";

export async function render(el, params) {
  const saved = params.id ? listCharts().find((c) => c.id === params.id) : null;
  const input = queryToInput(params) || saved;

  el.append(h("div.page-head", h("div", h("h1", t("horoscope")), input && h("p", [input.name, input.date, input.time, input.place?.name].filter(Boolean).join(" · ")))));

  if (!input || params.edit) {
    el.append(birthForm(input || {}, {
      onSubmit: (i) => { location.hash = "#/horoscope?" + inputToQuery({ ...i, id: input?.id }); },
    }));
    return;
  }

  const ctx = await getCtx();
  const chart = computeChart(ctx.swe, ctx.db, ctx.settings, input);

  const actions = h("div.form-actions.no-print", { style: { margin: "0 0 var(--space-md)" } },
    h("a.btn", { href: "#/horoscope?" + inputToQuery(input) + "&edit=1" }, tx("മാറ്റുക", "Edit")),
    h("a.btn", { href: "#/horoscope" }, t("newChart")),
    saveButton(input));
  el.append(actions);

  const tabBar = h("div.tabs.no-print", { role: "tablist" });
  const panel = h("section", { role: "tabpanel" });
  el.append(tabBar, panel);

  let current = TABS.find((x) => x.id === params.tab) || TABS.find((x) => x.id === getUI().horoTab) || TABS[0];
  const drawBar = () => tabBar.replaceChildren(...TABS.map((tab) =>
    h("button", { role: "tab", type: "button", "aria-selected": String(tab === current), onclick: () => show(tab) }, tx(tab.ml, tab.en))));
  let seq = 0;
  async function show(tab) {
    current = tab;
    setUI({ horoTab: tab.id });
    drawBar();
    const my = ++seq;
    clear(panel).append(h("p.muted", t("loading")));
    try {
      const mod = await tab.load();
      const node = await mod.render(chart, ctx);
      if (my === seq) clear(panel).append(node);
    } catch (err) {
      console.error(err);
      if (my === seq) clear(panel).append(h("div.error", String(err.message || err)));
    }
  }
  show(current);
}

function saveButton(input) {
  const btn = h("button.btn.btn-primary", { type: "button" }, t("save"));
  btn.addEventListener("click", () => {
    const name = input.name || prompt(tx("പേര്", "Name")) || "untitled";
    const c = saveChart({ ...input, name, kind: "birth" });
    btn.textContent = tx("സൂക്ഷിച്ചു", "Saved");
    btn.disabled = true;
    history.replaceState(null, "", "#/horoscope?" + inputToQuery({ ...c }));
  });
  return btn;
}
