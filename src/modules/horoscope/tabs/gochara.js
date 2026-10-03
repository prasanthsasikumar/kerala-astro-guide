// Page 16: Gochara phalam (ഗോചരഫലം): static Sani text with the Moon sign
import { h } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";
import { gocharaHtml } from "../../../engine/phalam.js";
import { TEXTS } from "@private/phalam-texts.js";
import { htmlBlock } from "./phalam-common.js";

export function render(chart) {
  return h("div.card", h("h2", tx(TEXTS.GOCHARA.band, "Transit results (Saturn)")), htmlBlock(gocharaHtml(chart)));
}
