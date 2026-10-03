// Page 15: Karthru dosham (കര്‍ത്തൃദോഷം)
import { h, kv } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";
import { karthru } from "../../../engine/phalam.js";

export function render(chart, { db }) {
  const k = karthru(db, chart);
  return h("div.card",
    h("h2", tx(k.title, "Karthru dosham")),
    kv(k.rows),
    k.closing.length > 0 && h("div.phalam", { style: { marginTop: "var(--space-md)" } }, k.closing.map((c) => h("p", c))));
}
