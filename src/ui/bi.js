// Bilingual labels: Malayalam leads, English follows (both always visible).
// The language switch only changes which one comes first.
import { h } from "../lib/dom.js";
import { lang, tx } from "../lib/i18n.js";

// [main, gloss]: Malayalam/English pair each other; other languages lead with their translation
// and keep English as the gloss.
export function order(ml, en) {
  const l = lang();
  if (l === "ml") return [ml, en];
  if (l === "en") return [en, null]; // English mode: English only
  const main = tx(ml, en);
  return [main, main === en ? null : en];
}

const fill = (s, vars) => (s && vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "") : s);
// order() with {placeholders} filled in both strings
export const orderf = (ml, en, vars) => order(ml, en).map((x) => fill(x, vars));

// inline: "ജാതകം · Horoscope"
export function bi(ml, en, tag = "span", vars) {
  const [a, b] = orderf(ml, en, vars);
  return h(tag + ".bi", h("span.bi-main", a), b ? h("span.bi-gloss", " · ", b) : null);
}
// stacked: main line, gloss underneath
export function biStack(ml, en, { mainTag = "strong", cls = "", vars, detail } = {}) {
  const [a, b] = orderf(ml, en, vars);
  return h("span.bi-stack" + (cls ? "." + cls : ""), h(mainTag + ".bi-main", a), b ? h("span.bi-gloss", b) : null,
    detail ? h("span.bi-detail", detail) : null);
}
