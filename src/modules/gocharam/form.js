// Small form helpers shared by the Gocharam / Muhurtham / Tools screens.
import { h } from "../../lib/dom.js";
import { DEFAULT_PLACE } from "../../components/birth-form.js";
import { placePicker } from "../../components/place-picker.js";

export const parseDate = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
};
export const isoDate = (d) => `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;

export function placeFromParams(p) {
  if (p.la == null || p.lo == null || p.tz == null) return DEFAULT_PLACE;
  return { name: p.p || "", lat: +p.la, lon: +p.lo, tz: +p.tz };
}
export const placeQuery = (pl) => ({ p: pl.name || "", la: pl.lat, lo: pl.lon, tz: pl.tz });

export const field = (label, control, span) =>
  h("label.field", span ? { style: { gridColumn: `span ${span}` } } : {}, h("span", label), control);

export function select(options, value) {
  return h("select.input", options.map(([v, label]) => h("option", { value: String(v), selected: String(v) === String(value) }, label)));
}

/** A card form: fields grid + place picker + submit; onSubmit(place) is called with the picked place. */
export function toolForm({ fields, place, withPlace = true, submitLabel, onSubmit }) {
  let cur = place;
  const form = h("form.card.no-print.gt-form", {
    onsubmit: (e) => { e.preventDefault(); onSubmit(cur); },
  },
  h("div.form-grid", fields, withPlace && placePicker(cur, (p) => { cur = p; })),
  h("div.form-actions", h("button.btn.btn-primary", { type: "submit" }, submitLabel)));
  return form;
}

export const go = (route, q) => { location.hash = `#/${route}?` + new URLSearchParams(q).toString(); };
