// Place search over the place table, with manual lat/lon/tz override.
import { h } from "../lib/dom.js";
import { searchPlaces, placeLabel } from "../lib/data.js";
import { t } from "../lib/i18n.js";
import { tzOffsetAt } from "../lib/edition.js";

export function placePicker(initial, onPick) {
  let place = initial;
  let results = [];
  let active = -1;
  const input = h("input.input", {
    type: "text", value: initial?.name || "", placeholder: t("searchPlace"),
    role: "combobox", "aria-expanded": "false", "aria-autocomplete": "list", autocomplete: "off",
  });
  const list = h("ul.combo-list", { role: "listbox", hidden: true });
  const lat = h("input.input.num", { type: "number", step: "0.0001", value: initial?.lat ?? "" });
  const lon = h("input.input.num", { type: "number", step: "0.0001", value: initial?.lon ?? "" });
  const tz = h("input.input.num", { type: "number", step: "0.25", value: initial?.tz ?? "" });

  const emit = () => onPick?.(place);
  const syncFields = () => { lat.value = place.lat.toFixed(4); lon.value = place.lon.toFixed(4); tz.value = place.tz; };
  for (const [el, k] of [[lat, "lat"], [lon, "lon"], [tz, "tz"]]) {
    el.addEventListener("change", () => { place = { ...place, [k]: parseFloat(el.value), ...(k === "tz" ? { tzName: undefined } : {}) }; emit(); });
  }

  function choose(p) {
    place = { name: placeLabel(p), lat: p[3], lon: p[4], tz: p[5] ?? tzOffsetAt(p[6], new Date().toISOString().slice(0, 10)), tzName: p[6] || undefined };
    input.value = place.name;
    close();
    syncFields();
    emit();
  }
  function close() { list.hidden = true; input.setAttribute("aria-expanded", "false"); active = -1; }
  function render() {
    list.replaceChildren(...results.map((p, i) =>
      h("li", { role: "option", "aria-selected": String(i === active), onmousedown: (e) => { e.preventDefault(); choose(p); } },
        p[2], " ", h("small", [p[1], p[0]].filter(Boolean).join(", ")))));
    list.hidden = results.length === 0;
    input.setAttribute("aria-expanded", String(!list.hidden));
  }
  let seq = 0;
  input.addEventListener("input", async () => {
    const my = ++seq;
    const r = await searchPlaces(input.value);
    if (my !== seq) return;
    results = r; active = -1; render();
  });
  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    if (e.key === "ArrowDown") { active = Math.min(results.length - 1, active + 1); render(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { active = Math.max(0, active - 1); render(); e.preventDefault(); }
    else if (e.key === "Enter" && active >= 0) { choose(results[active]); e.preventDefault(); }
    else if (e.key === "Escape") close();
  });
  input.addEventListener("blur", close);

  return h("div.form-grid", { style: { gridColumn: "1 / -1" } },
    h("label.field.field-wide", h("span", t("place")), h("div.combo", input, list)),
    h("label.field", h("span", t("latitude")), lat),
    h("label.field", h("span", t("longitude")), lon),
    h("label.field", h("span", t("timezone")), tz));
}
