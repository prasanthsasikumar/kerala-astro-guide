// Page 19: Kalachakra dasa (കാലചക്ര ദശ)
import { h, table } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";
import * as N from "../../../engine/names.js";
import { fromDayNum } from "../../../engine/core.js";
import { kalachakra } from "../../../engine/vargas.js";
import { band } from "./calc-common.js";

const dmy = (n) => {
  const { y, m, d } = fromDayNum(n);
  return `${d}/${m}/${y}`;
};

export function render(chart, { db, yogam, settings }) {
  const parasari = settings.kalachakraParasari !== false;
  const k = kalachakra(yogam, chart, parasari);
  const rows = k.periods.map((p) => [`${N.rasi(p.sign - 1)} (${p.yrs})`, h("span.num", dmy(p.start)), h("span.num", dmy(p.end)), h("span.num", `${p.ageY}-${p.ageM}`)]);
  const b = k.balance;
  return h("div.stack",
    h("div", band("കാലചക്ര ദശ", "Kalachakra dasa"),
      h("p.muted", parasari ? "Parasari (Irregular)" : "Research (Regular)"),
      table([tx("രാശി", "Sign (years)"), tx("മുതൽ", "From"), tx("വരെ", "To"), tx("വയസ്സ് വ.-മാ.", "Age y-m")], rows)),
    h("div.card", { style: { padding: "var(--space-md)", lineHeight: 1.9 } },
      h("div", tx("ജന്മശിഷ്ടം", "Balance at birth"), " = ", `${b.y} ${tx("വ", "y")} - ${b.m} ${tx("മാ", "m")} - ${b.d} ${tx("ദി", "d")}`),
      // Research mode shows the nakshatra name too
      h("div", tx("നക്ഷത്രം", "Nakshatra"), " = ", N.nak(db, k.nak), ` ${tx("പാദം", "pada")} - ${k.pada}`),
      h("div", tx("ദേഹം", "Deha"), " = ", N.rasi(k.deha - 1)),
      h("div", tx("ജീവം", "Jeeva"), " = ", N.rasi(k.jeeva - 1)),
      h("div", tx("അംശം", "Amsa"), " = ", N.rasi(k.amsa - 1)),
      h("div", tx("പരമായുസ്സ്", "Paramayus"), " = ", k.longevity),
      h("div", tx("ചക്രം", "Chakra"), " = ", k.savya ? tx("സവ്യചക്രം", "Savya chakra") : tx("അപസവ്യചക്രം", "Apasavya chakra"))));
}
