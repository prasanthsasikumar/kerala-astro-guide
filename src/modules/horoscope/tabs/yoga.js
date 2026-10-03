// Page 14: Yoga phalam (യോഗഫലം): 19 yoga rules
import { h } from "../../../lib/dom.js";
import { yogaPhalam } from "../../../engine/phalam.js";
import { TEXTS } from "@private/phalam-texts.js";
import { section, sub } from "./phalam-common.js";

export function render(chart, { db }) {
  return section(TEXTS.YOGA.band, "Yogas and results", h("p.muted", TEXTS.YOGA.intro), yogaPhalam(db, chart).map((y) => sub(y.name, y.text)));
}
