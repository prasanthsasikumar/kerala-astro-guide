// Shared screen header: back top-left (never a hamburger), optional right-side control.
import { h } from "../lib/dom.js";
import { lang } from "../lib/i18n.js";
import { setUI } from "../lib/store.js";
import { order } from "./bi.js";

export function langPill() {
  return h("button.pill", {
    type: "button", "aria-label": "Language",
    onclick: () => setUI({ lang: lang() === "en" ? "ml" : "en" }),
  }, lang() === "en" ? "മലയാളം" : "EN");
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
