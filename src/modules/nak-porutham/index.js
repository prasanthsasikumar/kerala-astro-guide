// Tools > Nakshatra porutham (stars only).
import "../../styles/porutham.css";
import { h, table } from "../../lib/dom.js";
import { t, tx } from "../../lib/i18n.js";
import { getCtx } from "../../lib/ctx.js";
import { getUI, setUI } from "../../lib/store.js";
import * as N from "../../engine/names.js";
import { STAR_RASIS, RASI_SHORT, nakToolResult } from "../../engine/porutham.js";
import { poruthamTable, countBlock, gloss } from "../porutham/tabs.js";

const rasiLabel = (r) => tx(RASI_SHORT[r], N.RASI_EN[r]);
const clampStar = (x) => (x >= 1 && x <= 27 ? x : 1);

export async function render(el, params) {
  const { db } = await getCtx();
  const ui = getUI();
  // state: star 1..27 + 0-based rasi position, from the URL (fs, fr, ms, mr) or the last used stars
  const st = {
    fs: clampStar(+params.fs || (ui.fnak ?? 0) + 1), fr: +params.fr || 0,
    ms: clampStar(+params.ms || (ui.mnak ?? 0) + 1), mr: +params.mr || 0,
  };
  const fix = () => {
    if (st.fr >= STAR_RASIS[st.fs].length) st.fr = 0;
    if (st.mr >= STAR_RASIS[st.ms].length) st.mr = 0;
  };
  fix();

  el.append(h("div.page-head", h("div", h("h1", t("nakPorutham")),
    h("p", tx("നക്ഷത്രവും കൂറും മാത്രം നല്‍കി പൊരുത്തം നോക്കാം", "Match by birth star and moon sign only")))));
  const result = h("div.stack");

  const picker = (who, sKey, rKey) => {
    const star = h("select.input", { "aria-label": tx("നക്ഷത്രം", "Star") },
      db.tblMalayalamNakshatra.map((r, i) => h("option", { value: i + 1, selected: i + 1 === st[sKey] }, tx(r.Name, N.NAK_EN[i]))));
    const rasi = h("select.input", { "aria-label": tx("കൂറ്", "Moon sign") });
    const fillRasi = () => rasi.replaceChildren(...STAR_RASIS[st[sKey]].map((r, pos) => h("option", { value: pos, selected: pos === st[rKey] }, rasiLabel(r))));
    fillRasi();
    star.addEventListener("change", () => { st[sKey] = +star.value; st[rKey] = 0; fillRasi(); update(); });
    rasi.addEventListener("change", () => { st[rKey] = +rasi.value; update(); });
    return h("div.card", h("h2", { style: { marginTop: 0 } }, who),
      h("div.form-grid",
        h("label.field", h("span", tx("നക്ഷത്രം", "Star")), star),
        h("label.field", h("span", tx("കൂറ്", "Moon sign")), rasi)));
  };

  function update() {
    fix();
    setUI({ fnak: st.fs - 1, mnak: st.ms - 1 });
    history.replaceState(null, "", `#/nak-porutham?fs=${st.fs}&fr=${st.fr}&ms=${st.ms}&mr=${st.mr}`);
    const r = nakToolResult(db, st.fs, st.fr, st.ms, st.mr);
    const name = (s) => tx(db.tblMalayalamNakshatra[s - 1].Name, N.NAK_EN[s - 1]);
    result.replaceChildren(...[
      h("h2.pm-band", tx("നക്ഷത്രപൊരുത്തങ്ങള്‍", "Nakshatra porutham")),
      table(["", tx("നക്ഷത്രം", "Star"), tx("കൂറ്", "Moon sign")], [
        [tx("സ്ത്രീ", "Female"), name(st.fs), rasiLabel(STAR_RASIS[st.fs][st.fr])],
        [tx("പുരുഷന്‍", "Male"), name(st.ms), rasiLabel(STAR_RASIS[st.ms][st.mr])],
      ]),
      poruthamTable(r.grades),
      countBlock(r.cnt8, r.cnt10),
      r.verdict && h("div.card.phalam",
        h("h3", { style: { marginTop: 0 }, class: r.code[0] === "P" ? "pm-bad" : "" }, tx("അഭിപ്രായം", "Opinion"), h("span.muted", { style: { fontWeight: 400 } }, ` (${r.code})`)),
        gloss(r.verdict[0], r.verdict[1])),
      h("p.muted", tx(`പട്ടിക #${r.id}: ${r.value}`, `Table row #${r.id}: ${r.value}`))].filter(Boolean));
  }

  el.append(h("div.stack",
    h("div.pm-tool-grid", picker(tx("സ്ത്രീ", "Female"), "fs", "fr"), picker(tx("പുരുഷന്‍", "Male"), "ms", "mr")),
    result));
  update();
}
