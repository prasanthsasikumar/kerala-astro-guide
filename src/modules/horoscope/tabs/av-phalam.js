// Page 7: Ashtakavarga phalam (അഷ്ടവര്‍ഗഫലം)
import { h, table } from "../../../lib/dom.js";
import { tx, lang } from "../../../lib/i18n.js";
import { avPhalam } from "../../../engine/phalam.js";
import { TEXTS } from "@private/phalam-texts.js";
import * as N from "../../../engine/names.js";

export function render(chart, { db, yogam }) {
  const A = TEXTS.AV;
  const signs = avPhalam(db, yogam, chart);
  return h("div.stack",
    h("div.card", h("h2", tx(A.title, "Ashtakavarga results in transit")),
      lang() === "en" && h("p.muted", "Result when each planet transits the sign; its bindus there in brackets.")),
    signs.map((s, i) => h("div.card",
      h("h3", tx(s.sign, N.RASI_EN[i])),
      table([A.head[0], A.head[1]], s.rows.map((r) => [h("span", tx(r.planet, r.key), " ", h("span.muted", `(${r.bindus})`)), r.text])))));
}
