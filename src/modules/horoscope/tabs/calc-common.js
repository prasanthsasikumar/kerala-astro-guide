// Shared bits for the calculation tabs (shadvarga, ashtakavarga, kalachakra, parashari, varga, kp, print).
import "../../../styles/horoscope-calc.css";
import { h } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";
import * as N from "../../../engine/names.js";
import { NAK_LORD_SHORT, VIM_ORDER, nakSub } from "../../../engine/vargas.js";

export const band = (ml, en) => h("div.hc-band", tx(ml, en));

export const ABBR_LEGEND = () => tx(
  "ല = ലഗ്നം. ര. = രവി. ച. = ചന്ദ്രന്‍. കു = കുജന്‍ (ചൊവ്വ). ബു = ബുധന്‍. ഗു = ഗുരു. ശു = ശുക്രന്‍. മ = മന്ദന്‍ (ശനി). സ = രാഹു. ശി = കേതു. മാ = മാന്ദി .",
  "As = Lagna, Su = Sun, Mo = Moon, Ma = Mars, Me = Mercury, Ju = Jupiter, Ve = Venus, Sa = Saturn, Ra = Rahu, Ke = Ketu, Md = Mandi.");

// "ന." column: nakshatra (star lord - sub lord)
export function nakSubLabel(L) {
  const { nak, lord, sub } = nakSub(L);
  return tx(`${N.NAK_SHORT_ML[nak]} (${NAK_LORD_SHORT[lord]}-${NAK_LORD_SHORT[sub]})`,
    `${N.NAK_EN[nak]} (${N.planetShort(VIM_ORDER[lord])}-${N.planetShort(VIM_ORDER[sub])})`);
}
export const NAK_SUB_LEGEND = () => tx("ന. = നക്ഷത്രം (നക്ഷത്രാധിപൻ - ഉപാധിപൻ)", "Star = nakshatra (star lord - sub lord)");
