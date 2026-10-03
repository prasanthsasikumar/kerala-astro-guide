// Page 21: Varga charts / harmonics (വര്‍ഗ്ഗചക്രങ്ങള്‍) - parivritti chart for any N 1..1800 with
// mrityubhaga flags
import { h, table } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";
import * as N from "../../../engine/names.js";
import { getUI, setUI } from "../../../lib/store.js";
import { harmonicChart, harmonicName, MRITYUBHAGA } from "../../../engine/vargas.js";
import { band, NAK_SUB_LEGEND } from "./calc-common.js";
import { vargaCharts, sphutaTable } from "./parashari.js";

const SIGN_SHORT = ["മേ", "ഇ", "മി", "കര്‍", "ചി", "ക", "തു", "വൃ", "ധ", "മ", "കും", "മീ"];
const BODY_SHORT = ["Lagna", "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu", "Mandi"];
const valid = (n) => Number.isInteger(n) && n >= 1 && n <= 1800;

export function render(chart) {
  let n = valid(+getUI().vargaN) ? +getUI().vargaN : 1;
  const input = h("input.input", { type: "number", min: "1", max: "1800", step: "1", inputMode: "numeric", value: String(n), placeholder: "1-1800", style: { maxWidth: "9rem" } });
  const err = h("p.error", { hidden: true }, "Enter a no. between 1-1800");
  const body = h("div.stack");
  const form = h("form.inline-form.no-print", {
    onsubmit: (e) => {
      e.preventDefault();
      const v = Number(input.value);
      if (!valid(v)) { err.hidden = false; input.setAttribute("aria-invalid", "true"); return; }
      err.hidden = true; input.removeAttribute("aria-invalid");
      n = v; setUI({ vargaN: n }); draw();
    },
  }, h("label.field", h("span", tx("വര്‍ഗ്ഗം (1-1800)", "Varga N (1-1800)")), input), h("button.btn.btn-primary", { type: "submit" }, "OK"));

  function draw() {
    const rows = harmonicChart(chart, n);
    const t = sphutaTable(rows, (r) => (r.mb ? `${N.planet(r.key)} (MB)` : N.planet(r.key)));
    rows.forEach((r, i) => r.mb && t.querySelectorAll("tbody tr")[i].firstChild.classList.add("mb"));
    const label = tx(harmonicName(n), `D-${n}`);
    body.replaceChildren(
      vargaCharts(chart, rows, label, tx("(പരിവൃത്തി)", "(harmonic)")),
      h("div", t, h("p.legend", tx("MB= മൃത്യുഭാഗ", "MB = mrityubhaga"), h("br"), NAK_SUB_LEGEND())),
      h("div", h("h3", tx("മൃത്യുഭാഗ", "Mrityubhaga degrees")),
        table([tx("രാ.", "Sign"), ...BODY_SHORT.map((k) => N.planetShort(k))],
          MRITYUBHAGA.map((row, s) => [tx(SIGN_SHORT[s], N.RASI_EN[s]), ...row.map((v) => h("span.num", String(v).padStart(2, "0")))]))));
  }
  draw();
  return h("div.stack", band("വര്‍ഗ്ഗചക്രങ്ങള്‍", "Varga charts"),
    h("p", tx("ഗ്രഹസ്ഫുടങ്ങളെ വര്‍ഗ്ഗസൂചകമായ ഗുണിതം കൊണ്ട് ഗുണിക്കുമ്പോള്‍ വര്‍ഗ്ഗസ്ഫുടം ലഭിക്കും.",
      "Multiplying each longitude by the varga number N gives the varga sphuta (harmonic / parivritti chart). This D-2 is not the Parashara hora.")),
    form, err, body);
}
