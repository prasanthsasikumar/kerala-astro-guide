// Page 13: Dasa-apahara phalam (ദശാപഹാരഫലം)
import { h } from "../../../lib/dom.js";
import { dasaPhalam, fmtDate } from "../../../engine/phalam.js";
import { TEXTS } from "@private/phalam-texts.js";
import { section } from "./phalam-common.js";

export function render(chart, { db }) {
  const D = TEXTS.DASA;
  const span = (a, b) => `${fmtDate(a)} ${D.from} ${fmtDate(b)} ${D.to}`;
  return section(D.band, "Dasa results", dasaPhalam(db, chart).map((d) => [
    h("h3", `${d.name} ${span(d.from, d.to)}`),
    h("p", d.text),
    h("div", { style: { marginLeft: "var(--space-lg)" } }, d.apaharas.map((a) =>
      h("p", h("strong", a.name), " ", span(a.from, a.to), h("br"), a.text))),
  ]));
}
