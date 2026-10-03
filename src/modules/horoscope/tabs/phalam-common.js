// Shared rendering helpers for the phalam (interpretation) tabs
import { h } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";

// A titled card whose body is long-form text.
export const section = (ml, en, ...children) => h("div.card", h("h2", tx(ml, en)), h("div.phalam", children));
export const sub = (head, text) => [h("h3", head), h("p", text)];

// HTML text blocks (with <b>/<br/>/<table>) rendered as-is, with their tables restyled to the
// shared .data table.
export function htmlBlock(html) {
  const el = h("div.phalam", { html });
  for (const t of el.querySelectorAll("table")) {
    for (const a of [...t.attributes]) t.removeAttribute(a.name);
    t.className = "data";
    const wrap = h("div.table-wrap", { style: { margin: "var(--space-sm) 0" } });
    t.replaceWith(wrap);
    wrap.append(t);
  }
  return el;
}
