// Page 12: Bhavashraya phalam (ഭാവാശ്രയഫലം): planet in house
import { h } from "../../../lib/dom.js";
import { bhavashraya } from "../../../engine/phalam.js";
import { TEXTS } from "@private/phalam-texts.js";
import { section } from "./phalam-common.js";

export function render(chart, { db }) {
  return section(TEXTS.BHAVASHRAYA.band, "Planet-in-house results", bhavashraya(db, chart).map((x) => h("p", x.text)));
}
