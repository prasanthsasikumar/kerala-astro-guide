// Page 18: Pariharam (പരിഹാരം)
import { h } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";
import { pariharamHtml } from "../../../engine/phalam.js";
import { TEXTS } from "@private/phalam-texts.js";
import { htmlBlock } from "./phalam-common.js";

export function render(chart, { db }) {
  return h("div.card", h("h2", tx(TEXTS.PARIHARAM.band, "Remedies")), htmlBlock(pariharamHtml(db, chart)));
}
