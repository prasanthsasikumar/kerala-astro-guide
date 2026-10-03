// Rasi pramanam (Tools): rising duration of each sign in nazhika for a month and latitude.
import "../../styles/gochar-tools.css";
import { h } from "../../lib/dom.js";
import { t, tx } from "../../lib/i18n.js";
import { getCtx } from "../../lib/ctx.js";
import * as N from "../../engine/names.js";
import { AYANAMSA } from "../../engine/settings.js";
import { rasiPramanam, nvt } from "../../engine/tools.js";
import { placeFromParams, placeQuery, field, select, toolForm, go } from "../gocharam/form.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export async function render(el, params) {
  const { swe, settings } = await getCtx();
  const place = placeFromParams(params);
  const now = new Date();
  const year = h("input.input.num", { type: "number", value: params.y || now.getFullYear(), min: 1, max: 9999, required: true });
  const month = select(MONTHS.map((m, i) => [i + 1, m]), params.m || now.getMonth() + 1);

  el.append(h("div.page-head", h("h1", t("rasiPramanam"))));
  el.append(toolForm({
    fields: [field(tx("വർഷം", "Year"), year), field(tx("മാസം", "Month"), month)],
    place, submitLabel: t("calculate"),
    onSubmit: (p) => go("rasi-pramanam", { y: year.value, m: month.value, ...placeQuery(p) }),
  }));
  if (!params.y || !params.m) return;

  const r = rasiPramanam(swe, settings, { year: +params.y, month: +params.m, lat: place.lat });
  const ayan = AYANAMSA.find((a) => a.v === settings.ayanamsa)?.label || "";
  el.append(h("div.stack", { style: { marginTop: "var(--space-lg)", maxWidth: "560px" } },
    h("p.muted", `${MONTHS[+params.m - 1]} ${params.y} · ${place.name || ""} (${tx("അക്ഷാംശം", "lat")} ${place.lat.toFixed(2)}) · ${ayan} ${N.dms(r.ayanamsa)}`),
    h("div.table-wrap", h("table.data.rp-table",
      h("thead",
        h("tr", h("th", { rowspan: 2 }, tx("നമ്പർ", "No.")), h("th", { rowspan: 2 }, tx("രാശി", "Sign")), h("th", { colspan: 3, style: { textAlign: "center" } }, tx("രാശിമാനം", "Rasimanam"))),
        h("tr", h("th.r", tx("നാ.", "Naz.")), h("th.r", tx("വി.", "Vin.")), h("th.r", tx("ത.", "Tat.")))),
      h("tbody", r.nazhika.map((q, i) => {
        const [n, v, tt] = nvt(q);
        return h("tr", h("td.num", i + 1), h("td", N.rasi(i)), h("td.r.num", n), h("td.r.num", v), h("td.r.num", tt));
      }))))));
}
