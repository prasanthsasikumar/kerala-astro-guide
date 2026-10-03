// Bilingual labels: Malayalam leads, English follows (both always visible).
// The language switch only changes which one comes first.
import { h } from "../lib/dom.js";
import { lang } from "../lib/i18n.js";

export const order = (ml, en) => (lang() === "en" ? [en, ml] : [ml, en]);

// inline: "ജാതകം · Horoscope"
export function bi(ml, en, tag = "span") {
  const [a, b] = order(ml, en);
  return h(tag + ".bi", h("span.bi-main", a), b ? h("span.bi-gloss", " · ", b) : null);
}
// stacked: main line, gloss underneath
export function biStack(ml, en, { mainTag = "strong", cls = "" } = {}) {
  const [a, b] = order(ml, en);
  return h("span.bi-stack" + (cls ? "." + cls : ""), h(mainTag + ".bi-main", a), b ? h("span.bi-gloss", b) : null);
}
