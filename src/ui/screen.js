// Shared screen header: back top-left (never a hamburger), optional right-side control.
import { h } from "../lib/dom.js";
import { lang, LANGS } from "../lib/i18n.js";
import { setUI } from "../lib/store.js";
import { order } from "./bi.js";

// Language pill: shows the current language; opens a picker with all languages.
export function langPill() {
  const cur = LANGS.find((l) => l.code === lang());
  return h("button.pill", { type: "button", "aria-label": "Language", "aria-haspopup": "dialog", onclick: () => openLangPicker() },
    cur.code === "en" ? "EN" : cur.name, " ▾");
}
export function openLangPicker() {
  import("./sheet.js").then(({ openSheet }) => {
    const dlg = openSheet("ഭാഷ · Language", h("div.rows", LANGS.map((l) =>
      h("button.row", {
        type: "button", "aria-current": l.code === lang() ? "true" : null,
        onclick: () => { dlg.close(); setUI({ lang: l.code }); },
      }, h("span.bi-stack", h("strong.bi-main", l.name), h("span.bi-gloss", l.en)), l.code === lang() ? h("span.chev", "✓") : h("span")))));
  });
}

export function screenHeader({ back = null, right = langPill(), step = null } = {}) {
  const [b1, b2] = order("തിരികെ", "Back");
  return h("header.screen-head",
    back
      ? h("a.back-link", { href: back === true ? "#/" : back, onclick: back === true ? (e) => { if (history.length > 1) { e.preventDefault(); history.back(); } } : null }, "‹ ", b1, h("span.bi-gloss", " · ", b2))
      : h("span"),
    step || right || h("span"));
}

// "‹ ജാതകം" style title row used at the top of result screens
export function personHead(person, sub) {
  const initial = (person.name || "?").trim().charAt(0).toUpperCase();
  return h("div.person-head",
    h("span.avatar", initial),
    h("div", h("h1", person.name || "—"), h("p.muted", sub)));
}
