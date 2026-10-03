// Page 4: Bhava sphuta (ഭാവസ്ഫുടം)
import { h, table } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";
import * as N from "../../../engine/names.js";
import { HOUSE } from "../../../engine/settings.js";

export function render(chart) {
  const rows = chart.bhava.map((b) => [b.k, h("span.num", N.deg3(b.start)), h("span.num", N.deg3(b.madhya)), h("span.num", N.deg3(b.end)), b.planets.map((k) => N.planetShort(k)).join(" ")]);
  return h("div.stack",
    table([tx("ഭാ.", "House"), tx("ആ.", "Start"), tx("മ.", "Middle"), tx("അ.", "End"), tx("ഗ്ര.", "Bodies")], rows),
    h("p.muted", "House System : ", HOUSE.find((x) => x.v === chart.settings.house)?.label, h("br"),
      tx("ഭാ = ഭാവം, ആ = ആദ്യം, മ = മധ്യം, അ = അന്ത്യം, ഗ്ര = ഗ്രഹം", "Start and end are the bhava sandhis; middle is the cusp (bhava madhya).")));
}
