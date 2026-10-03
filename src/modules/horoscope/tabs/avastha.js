// Page 17: Avastha phalam (അവസ്ഥാഫലം)
import { h } from "../../../lib/dom.js";
import { tx, lang } from "../../../lib/i18n.js";
import { avastha } from "../../../engine/phalam.js";
import { TEXTS } from "@private/phalam-texts.js";
import { sub } from "./phalam-common.js";

export function render(chart, { yogam }) {
  const A = TEXTS.AVASTHA;
  return h("div.stack",
    h("div.card", h("h2", tx(A.band, "Avastha results")),
      lang() === "en" && h("p.muted", `${A.retro} retrograde, ${A.combust} combust`)),
    avastha(yogam, chart).map((p) => h("div.card",
      h("h2", p.name),
      h("div.phalam", p.texts.map((t, i) => sub(A.heads[i], t))))));
}
