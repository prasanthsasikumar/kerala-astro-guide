// Page 8: Panchanga phalam (പഞ്ചാംഗഫലം)
import { panchangaPhalam } from "../../../engine/phalam.js";
import { TEXTS } from "@private/phalam-texts.js";
import { tx } from "../../../lib/i18n.js";
import { section, sub } from "./phalam-common.js";

const EN = ["Weekday", "Nakshatra", "Tithi", "Karanam", "Nithya yoga"];
export function render(chart, { db }) {
  return section(TEXTS.PANCHANGA.band, "Panchanga results",
    panchangaPhalam(db, chart).map((x, i) => sub(tx(x.head, EN[i]), x.text)));
}
