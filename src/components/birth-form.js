// Name / gender / date / time / place form shared by Horoscope, Porutham, Prashnam.
import { h } from "../lib/dom.js";
import { t } from "../lib/i18n.js";
import { placePicker } from "./place-picker.js";
import { tzOffsetAt } from "../lib/edition.js";

export const DEFAULT_PLACE = { name: "Calicut, Kerala, India", lat: 11.25, lon: 75.77, tz: 5.5 };

export function nowParts(tz = 5.5) {
  const d = new Date(Date.now() + tz * 3600e3);
  const iso = d.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export function birthForm(initial = {}, { withName = true, withGender = true, submitLabel = t("calculate"), onSubmit, extra, emptyPlace = false } = {}) {
  const v = { name: "", gender: "Male", ...nowParts(), place: emptyPlace ? null : DEFAULT_PLACE, ...initial };
  const name = h("input.input", { type: "text", value: v.name, autocomplete: "off" });
  const gender = h("select.input",
    h("option", { value: "Male", selected: v.gender === "Male" }, t("male")),
    h("option", { value: "Female", selected: v.gender === "Female" }, t("female")));
  const date = h("input.input.num", { type: "date", value: v.date, min: "1800-01-01", max: "2399-12-31", required: true });
  const time = h("input.input.num", { type: "time", value: v.time, required: true });
  let place = v.place;

  const form = h("form.card", {
    onsubmit: (e) => {
      e.preventDefault();
      if (!date.value || !time.value || !Number.isFinite(place?.lat)) {
        form.reportValidity();
        return;
      }
      // zone-based places: use the UTC offset in force at that date and time
      const p = place.tzName ? { ...place, tz: tzOffsetAt(place.tzName, date.value, time.value) } : place;
      onSubmit({ ...v, name: name.value.trim(), gender: gender.value, date: date.value, time: time.value, place: p });
    },
  },
    h("div.form-grid",
      withName && h("label.field.field-wide", h("span", t("name")), name),
      withGender && h("label.field", h("span", t("gender")), gender),
      h("label.field", h("span", t("date")), date),
      h("label.field", h("span", t("time")), time),
      placePicker(place, (p) => { place = p; }, { required: true })),
    extra,
    h("div.form-actions",
      h("button.btn.btn-primary", { type: "submit" }, submitLabel),
      h("button.btn", { type: "button", onclick: () => { const n = nowParts(place.tz); date.value = n.date; time.value = n.time; } }, t("now"))));
  return form;
}
