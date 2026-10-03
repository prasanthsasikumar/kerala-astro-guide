// Page 11: Bhava phalam (ഭാവഫലം): where each house lord sits
import { h } from "../../../lib/dom.js";
import { bhavaPhalam } from "../../../engine/phalam.js";
import { TEXTS } from "@private/phalam-texts.js";
import { section } from "./phalam-common.js";

export function render(chart, { db }) {
  return section(TEXTS.BHAVA.band, "House results", bhavaPhalam(db, chart).map((x) => h("p", x.text)));
}
