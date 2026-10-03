// Page 9: Lagna phalam (ലഗ്നഫലം)
import { h } from "../../../lib/dom.js";
import { lagnaPhalam } from "../../../engine/phalam.js";
import { TEXTS } from "@private/phalam-texts.js";
import { section } from "./phalam-common.js";

export function render(chart, { db }) {
  return section(TEXTS.LAGNA.band, "Lagna results", h("p", lagnaPhalam(db, chart)));
}
