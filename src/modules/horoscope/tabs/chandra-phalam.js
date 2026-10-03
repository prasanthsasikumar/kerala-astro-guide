// Page 10: Chandra phalam (ചന്ദ്രഫലം)
import { h } from "../../../lib/dom.js";
import { chandraPhalam } from "../../../engine/phalam.js";
import { TEXTS } from "@private/phalam-texts.js";
import { section } from "./phalam-common.js";

export function render(chart, { db }) {
  return section(TEXTS.CHANDRA.band, "Moon sign results", h("p", chandraPhalam(db, chart)));
}
