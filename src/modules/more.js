// More tools: the remaining tools, one per row.
import { h } from "../lib/dom.js";
import { bi, biStack } from "../ui/bi.js";
import { screenHeader } from "../ui/screen.js";

const TOOLS = [
  ["prashnam", "പ്രശ്നം", "Prashnam · horary chart for a question"],
  ["gocharam", "ഗോചരം", "Transits · planet sign changes"],
  ["panchanga-shuddhi", "പഞ്ചാംഗശുദ്ധി", "Panchanga shuddhi · good days"],
  ["divasa-panchangam", "ദിവസപഞ്ചാംഗം", "Daily panchangam"],
  ["date-converter", "മലയാളം - ഇംഗ്ലീഷ് തീയതി", "Date converter · Kollam to English"],
  ["nak-porutham", "നക്ഷത്രപൊരുത്തം", "Star match · by stars only"],
  ["rasi-pramanam", "രാശിപ്രമാണം", "Rasi pramanam · rising times"],
  ["about", "ഇതിനെക്കുറിച്ച്", "About · licences, sources"],
];

export function render(el) {
  el.append(
    screenHeader({ back: "#/" }),
    h("h1.title", bi("കൂടുതൽ ഉപകരണങ്ങൾ", "More tools")),
    h("div.rows.more-rows", TOOLS.map(([p, ml, en]) => h("a.row", { href: "#/" + p }, biStack(ml, en), h("span.chev", "›")))));
}
