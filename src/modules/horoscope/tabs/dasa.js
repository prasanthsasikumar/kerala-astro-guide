// Page 3: Nakshatra dasa (നക്ഷത്ര ദശ) - list view with drill-down, or table view
import { h, table } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";
import * as N from "../../../engine/names.js";
import { dasa, subPeriods } from "../../../engine/core.js";
import { period } from "../../../engine/charts.js";

const lordKey = (d) => ({ Kethu: "Ketu", Ven: "Venus", Sun: "Sun", Moo: "Moon", Mar: "Mars", Rahu: "Rahu", Jup: "Jupiter", Sat: "Saturn", Mer: "Mercury" })[d.lord];
const fd = (n) => {
  const dt = new Date(n * 864e5);
  return `${dt.getUTCDate()}-${dt.getUTCMonth() + 1}-${dt.getUTCFullYear()}`;
};

export function render(chart, { db }) {
  let ref = "Moon";
  const wrap = h("div.stack");
  const draw = () => {
    const ds = dasa(db, chart, chart.dasaRef[ref]);
    const today = Math.floor(Date.now() / 864e5);
    const ageAt = (n) => {
      const p = period(ds.birthN, n);
      return `${p.y} ${tx("വ", "y")} ${p.m} ${tx("മാ", "m")} ${p.d} ${tx("ദി", "d")}`;
    };
    const visible = (list) => list.filter((p) => p.end > ds.birthN).map((p) => (p.start < ds.birthN ? { ...p, start: ds.birthN } : p));
    const label = (p) => `${N.planetShort(lordKey(p.dasa))} ${fd(p.start)} ${tx("മു", "to")} ${fd(p.end)}`;
    const isNow = (p) => p.start <= today && today < p.end;

    const picker = h("div.seg", { role: "group", "aria-label": "Dasa reference" },
      ["Moon", "Lagna", "Sun"].map((k) => h("button", { type: "button", "aria-pressed": String(ref === k), onclick: () => { ref = k; draw(); } }, N.planet(k))));
    const balance = h("p", tx("ജന്മശിഷ്ടം", "Balance at birth"), " = ", `${ds.balance.years} ${tx("വ", "y")} - ${ds.balance.months} ${tx("മാ", "m")} - ${ds.balance.days} ${tx("ദി", "d")} ${tx(ds.balance.lord.ml, ds.balance.lord.lord)}`);

    let body;
    if (chart.settings.dasaView === 1) {
      const rows = [];
      for (const p of visible(ds.periods)) {
        rows.push([h("strong", N.planetShort(lordKey(p.dasa))), h("strong.num", fd(p.start)), tx("മു.", "to"), h("strong.num", fd(p.end)), tx("വരെ", "")]);
        for (const s of visible(subPeriods(ds.D, ds.Y, p.dasa.id, p.years, p.dasa === ds.periods[0].dasa ? ds.periods[0].start : p.start)))
          rows.push(["", N.planetShort(lordKey(s.dasa)), h("span.num", fd(s.start)), "-", h("span.num", fd(s.end))]);
      }
      body = table([tx("ദശ", "Dasa"), tx("ആരംഭം", "From"), "", tx("അവസാനം", "To"), ""], rows);
    } else {
      // list view: dasa -> apahara -> chidra
      body = h("ul.dasa-list", visible(ds.periods).map((p, i) => node(p, ds.periods[i + (ds.periods.length - visible(ds.periods).length)], 1)));
      function node(p, raw, level) {
        const li = h("li", { class: isNow(p) ? "is-now" : "" });
        const btn = h("button.dasa-row", { type: "button", "aria-expanded": "false" },
          h("span", label(p)), h("span.muted", ` (${ageAt(p.end)})`));
        li.append(btn);
        if (level < 3) {
          btn.addEventListener("click", () => {
            const open = btn.getAttribute("aria-expanded") === "true";
            btn.setAttribute("aria-expanded", String(!open));
            if (open) { li.querySelector("ul")?.remove(); return; }
            const subs = visible(subPeriods(ds.D, ds.Y, raw.dasa.id, raw.years, raw.start));
            li.append(h("ul.dasa-list", subs.map((s) => node(s, subPeriods(ds.D, ds.Y, raw.dasa.id, raw.years, raw.start).find((x) => x.dasa === s.dasa), level + 1))));
          });
        } else btn.disabled = true;
        return li;
      }
    }
    wrap.replaceChildren(
      h("div", { style: { display: "flex", gap: "var(--space-sm)", alignItems: "center", flexWrap: "wrap" } }, h("span.muted", tx("ദശ ഏത് അടിസ്ഥാനത്തില്‍", "Dasa based on")), picker),
      h("h3", tx("ദശയും അപഹാരവും ഛിദ്രവും", "Dasa, apahara and chidra")),
      balance, body);
  };
  draw();
  return wrap;
}
