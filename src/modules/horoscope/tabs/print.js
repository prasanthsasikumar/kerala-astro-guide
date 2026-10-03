// Page 23: Print - full horoscope (ജാതകം) or the short head sheet (തലക്കുറി: Time + Charts).
// Every section is computed eagerly from the other tab modules and printed with window.print()
import { h, clear } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";
import { getUI, setUI } from "../../../lib/store.js";
import { TABS } from "../tabs.js";
import "./calc-common.js";

const SHORT = ["time", "charts"];

async function section(tab, chart, ctx) {
  const wrap = h("section.print-section", h("h2.hc-band", tx(tab.ml, tab.en)));
  try {
    const mod = await tab.load();
    if (mod.pending) return null; // not built yet
    // the dasa section prints the table view (the list view needs clicks)
    const c = tab.id === "dasa" ? { ...chart, settings: { ...chart.settings, dasaView: 1 } } : chart;
    wrap.append(await mod.render(c, ctx));
  } catch (err) {
    console.error(err);
    wrap.append(h("div.error", String(err.message || err)));
  }
  return wrap;
}

export async function buildReport(chart, ctx, kind) {
  const ids = kind === "short" ? SHORT : TABS.map((t) => t.id).filter((id) => id !== "print");
  const parts = await Promise.all(ids.map((id) => section(TABS.find((t) => t.id === id), chart, ctx)));
  const report = h("div.stack", parts.filter(Boolean));
  const a = astrologerBlock();
  if (a) report.append(h("div.astrologer", { style: { maxWidth: kind === "short" ? "30%" : "50%", minWidth: "240px" } }, a));
  return report;
}

function astrologerBlock() {
  const a = getUI().astrologer || {};
  if (!a.name && !a.address && !a.phone && !a.email) return null;
  return h("div.card", { style: { padding: "var(--space-md)", lineHeight: 1.7 } },
    a.name && h("strong", a.name), a.address && h("div", a.address),
    a.phone && h("div", `Phone : ${a.phone}`), a.email && h("div", `E-mail : ${a.email}`));
}

function astrologerForm(onSave) {
  const a = getUI().astrologer || {};
  const f = (key, label, type = "text") => h("label.field", h("span", label), h("input.input", { name: key, type, value: a[key] || "" }));
  const form = h("form.card.no-print", { style: { padding: "var(--space-md)" }, onsubmit: (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    setUI({ astrologer: d });
    onSave();
  } },
  h("h3", { style: { marginTop: 0 } }, "Astrologer Details"),
  h("div.form-grid", f("name", tx("പേര്", "Name")), f("address", tx("വിലാസം", "Address")), f("phone", "Phone", "tel"), f("email", "E-mail", "email")),
  h("div.form-actions", h("button.btn", { type: "submit" }, tx("സൂക്ഷിക്കുക", "Save"))));
  return form;
}

async function printReport(chart, ctx, kind, btn) {
  btn.dataset.state = "loading";
  const old = document.querySelector(".ag-print-report");
  old?.remove();
  const holder = h("div.ag-print-report");
  const name = chart.input.name || "";
  holder.append(h("h1", { style: { fontSize: "var(--text-xl)" } }, [kind === "short" ? tx("തലക്കുറി", "Thalakuri") : tx("ജാതകം", "Horoscope"), name].filter(Boolean).join(" - ")));
  holder.append(await buildReport(chart, ctx, kind));
  document.body.append(holder);
  document.body.classList.add("ag-printing");
  const prevTitle = document.title;
  document.title = "AG-Horoscope " + name;
  const done = () => {
    document.body.classList.remove("ag-printing");
    holder.remove();
    document.title = prevTitle;
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  delete btn.dataset.state;
  window.print();
}

export function render(chart, ctx) {
  const preview = h("div.stack");
  const full = h("button.btn.btn-primary", { type: "button", onclick: () => printReport(chart, ctx, "full", full) }, tx("ജാതകം", "Full horoscope"));
  const short = h("button.btn", { type: "button", onclick: () => printReport(chart, ctx, "short", short) }, tx("തലക്കുറി", "Thalakuri (Time + Charts)"));
  const astro = h("div");
  const drawAstro = () => astro.replaceChildren(astrologerBlock() || "");
  drawAstro();

  let mode = new URLSearchParams(location.hash.split("?")[1] || "").get("preview") || "";
  const seg = h("div.seg", { role: "group", "aria-label": "Preview" });
  const drawSeg = () => seg.replaceChildren(...[["", tx("ഒന്നുമില്ല", "None")], ["short", tx("തലക്കുറി", "Thalakuri")], ["full", tx("ജാതകം", "Full")]].map(([v, l]) =>
    h("button", { type: "button", "aria-pressed": String(mode === v), onclick: () => { mode = v; drawSeg(); drawPreview(); } }, l)));
  async function drawPreview() {
    if (!mode) return clear(preview);
    const my = mode;
    preview.replaceChildren(h("p.muted", tx("കാത്തിരിക്കുക…", "Loading…")));
    const r = await buildReport(chart, ctx, my);
    if (my === mode) preview.replaceChildren(r);
  }
  drawSeg();
  drawPreview();

  return h("div.stack",
    h("div.print-actions.no-print", full, short),
    astro,
    h("details.no-print", h("summary", tx("Astrologer Details", "Edit astrologer details")), astrologerForm(drawAstro)),
    h("div.no-print", { style: { display: "flex", gap: "var(--space-sm)", alignItems: "center", flexWrap: "wrap" } }, h("span.muted", tx("Preview", "Preview")), seg),
    preview);
}
