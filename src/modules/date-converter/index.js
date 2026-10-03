// Malayalam -> English date converter (Tools).
import "../../styles/gochar-tools.css";
import { h } from "../../lib/dom.js";
import { t, tx } from "../../lib/i18n.js";
import { getCtx } from "../../lib/ctx.js";
import * as N from "../../engine/names.js";
import { malToEnglish, ddMMMyyyy, CONVERT_TYPES, CONVERT_SYSTEMS, WEEKDAY_FULL } from "../../engine/tools.js";
import { placeFromParams, placeQuery, field, select, toolForm, go } from "../gocharam/form.js";

const num = (v, min, max) => h("input.input.num", { type: "number", inputmode: "numeric", value: v, min, max, required: true });

export async function render(el, params) {
  const { swe, db, settings } = await getCtx();
  const place = placeFromParams(params);
  // defaults: 1 Medam 1190, 1 nazhika 1 vinazhika, first reference option, North Kerala
  const v = { d: params.d ?? 1, m: params.m ?? 1, y: params.y ?? 1190, n: params.n ?? 1, vn: params.vn ?? 1, ty: params.ty ?? 0, sy: params.sy ?? 0 };
  const day = num(v.d, 1, 32);
  const month = select(db.tblMalayalamMonths.slice(0, 12).map((r, i) => [i + 1, tx(r.Malayalam, N.MAL_MONTH_EN[i])]), v.m);
  const year = num(v.y, 1, 9999);
  const naz = num(v.n, 0, 60);
  const vin = num(v.vn, 0, 59);
  const type = select(CONVERT_TYPES.map(([ml, en], i) => [i, tx(ml, en)]), v.ty);
  const system = select(CONVERT_SYSTEMS.map(([ml, en], i) => [i, tx(ml, en)]), v.sy);

  el.append(h("div.page-head", h("h1", t("dateConverter"))));
  el.append(toolForm({
    fields: [
      field(tx("ദിവസം", "Day"), day), field(tx("മാസം", "Month"), month), field(tx("വർഷം (കൊല്ലവർഷം)", "Year (Kollam)"), year),
      field(tx("നാഴിക", "Nazhika"), naz), field(tx("വിനാഴിക", "Vinazhika"), vin), field(tx("സമയം", "Reference"), type),
      field(tx("ഗണിതരീതി", "System"), system, 2),
    ],
    place, submitLabel: tx("മാറ്റുക", "Convert"),
    onSubmit: (p) => go("date-converter", { d: day.value, m: month.value, y: year.value, n: naz.value, vn: vin.value, ty: type.value, sy: system.value, go: 1, ...placeQuery(p) }),
  }));
  if (!params.go) return;

  const input = { day: +v.d, month: +v.m, year: +v.y, naz: +v.n || 0, vin: +v.vn || 0, type: +v.ty, system: +v.sy, place };
  const r = malToEnglish(swe, db, settings, input);
  const card = h("section.card.stack", { style: { marginTop: "var(--space-lg)" }, "aria-live": "polite" });
  if (!r.ok) {
    card.append(h("p.dc-result", "No English Date Found"));
  } else {
    const monthName = db.tblMalayalamMonths[input.month - 1].Malayalam;
    const wk = (i) => tx(WEEKDAY_FULL[i], N.WEEKDAY_EN[i]);
    card.append(
      h("p.dc-result.num", `${ddMMMyyyy(r.date)} ${r.clock}`),
      h("p.dc-sub",
        tx(CONVERT_SYSTEMS[input.system][0], CONVERT_SYSTEMS[input.system][1]), "\n",
        `${input.day} ${monthName} ${input.year} ${Math.trunc(input.naz)} നാ. ${Math.trunc(input.vin)} വി. ${wk(r.hinduDow)}`, "\n",
        `${ddMMMyyyy(r.date)} ${r.clock} ${wk(r.westernDow)}`),
      h("p.muted", { style: { fontSize: "var(--text-xs)" } },
        tx(`${place.name || ""} · സമയമേഖല ${place.tz}`, `${place.name || ""} · UTC${place.tz >= 0 ? "+" : ""}${place.tz}`)));
  }
  el.append(card);
}
