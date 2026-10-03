// Page 5: Shadvarga (ഷഡ്വര്‍ഗ്ഗം) - lords of D3 D2 D9 D30 D12 D1 per body
import { h, table } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";
import * as N from "../../../engine/names.js";
import { shadvarga, SHADVARGA_COLS } from "../../../engine/vargas.js";
import { band, ABBR_LEGEND } from "./calc-common.js";

export function render(chart) {
  const rows = shadvarga(chart);
  const t = table([tx("ഗ്രഹം", "Body"), ...SHADVARGA_COLS], rows.map((r) => [N.planet(r.key), ...SHADVARGA_COLS.map((c) => N.planetShort(r.lords[c]))]));
  const trs = t.querySelectorAll("tbody tr");
  rows.forEach((r, i) => {
    trs[i].classList.add(`tone-${r.tone}`);
    trs[i].querySelectorAll("td").forEach((td, j) => j && td.classList.add("c"));
  });
  t.querySelectorAll("th").forEach((th, j) => j && th.classList.add("c"));
  return h("div.stack",
    h("div", band("ഷഡ്വര്‍ഗ്ഗം", "Shadvarga"), t),
    h("p.legend", ABBR_LEGEND(), h("br"),
      tx("D1 = ക്ഷേത്രം. D2 = ഹോര. D3 = ദ്രേക്കാണം. D9 = നവാംശം. D12 = ദ്വാദശാംശം. D30 = ത്രിംശാംശം.",
        "D1 = rasi (kshetra), D2 = hora, D3 = drekkana, D9 = navamsa, D12 = dwadasamsa, D30 = trimsamsa. Each cell is the lord of that varga.")));
}
