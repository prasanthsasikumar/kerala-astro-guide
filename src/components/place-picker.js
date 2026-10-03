// Place input: type a place name (built-in list first, then OpenStreetMap for villages) or use the
// device location. Latitude, longitude and time zone are filled in automatically and kept under
// "details" for anyone who wants to adjust them.
import { h } from "../lib/dom.js";
import { searchPlaces, searchPlacesOnline, reverseGeocode, nearestZone, placeLabel } from "../lib/data.js";
import { t, tx } from "../lib/i18n.js";
import { tzOffsetAt } from "../lib/edition.js";

const fmtTz = (tz) => {
  const a = Math.abs(tz);
  return `UTC${tz < 0 ? "−" : "+"}${Math.trunc(a)}:${String(Math.round((a % 1) * 60)).padStart(2, "0")}`;
};
const fmtCoord = (lat, lon) => `${Math.abs(lat).toFixed(2)}°${lat < 0 ? "S" : "N"} ${Math.abs(lon).toFixed(2)}°${lon < 0 ? "W" : "E"}`;
const today = () => new Date().toISOString().slice(0, 10);
const label = (p) => [p[2], p[8], p[1], p[0]].filter((x, i, a) => x && a.indexOf(x) === i).join(", ");

export function placePicker(initial, onPick, { required = false } = {}) {
  let place = initial?.name ? initial : null;
  let results = [];
  let active = -1;
  const input = h("input.input", {
    type: "text", value: place?.name || "", placeholder: tx("സ്ഥലത്തിന്റെ പേര് ഇംഗ്ലീഷിൽ (ഉദാ. Thiruvalla)", "Type a town or village"),
    role: "combobox", "aria-expanded": "false", "aria-autocomplete": "list", autocomplete: "off", required,
  });
  const list = h("ul.combo-list", { role: "listbox", hidden: true });
  const summary = h("p.place-summary", { role: "status" });
  const lat = h("input.input.num", { type: "number", step: "0.0001" });
  const lon = h("input.input.num", { type: "number", step: "0.0001" });
  const tz = h("input.input.num", { type: "number", step: "0.25" });
  const details = h("details.place-details",
    h("summary", tx("വിശദാംശങ്ങൾ (അക്ഷാംശം, രേഖാംശം, സമയമേഖല)", "Details (latitude, longitude, time zone)")),
    h("div.form-grid",
      h("label.field", h("span", t("latitude")), lat),
      h("label.field", h("span", t("longitude")), lon),
      h("label.field", h("span", t("timezone")), tz)));
  const locBtn = "geolocation" in navigator
    ? h("button.btn.btn-sm.place-here", { type: "button" }, "📍 ", tx("ഇപ്പോഴത്തെ സ്ഥലം ഉപയോഗിക്കുക", "Use my current location"))
    : null;

  const sync = () => {
    if (!place) {
      summary.textContent = tx("ലിസ്റ്റിൽ നിന്ന് സ്ഥലം തിരഞ്ഞെടുക്കുക", "Pick the place from the list");
      summary.classList.add("is-empty");
      return;
    }
    summary.classList.remove("is-empty");
    summary.textContent = `✓ ${fmtCoord(place.lat, place.lon)} · ${fmtTz(place.tz)}${place.tzName ? " (" + place.tzName + ")" : ""}`;
    lat.value = (+place.lat).toFixed(4);
    lon.value = (+place.lon).toFixed(4);
    tz.value = place.tz;
  };
  const emit = () => {
    input.setCustomValidity(required && !place ? tx("സ്ഥലം തിരഞ്ഞെടുക്കുക", "Choose a place") : "");
    onPick?.(place);
  };
  for (const [el, k] of [[lat, "lat"], [lon, "lon"], [tz, "tz"]]) {
    el.addEventListener("change", () => {
      if (!place) return;
      place = { ...place, [k]: parseFloat(el.value), ...(k === "tz" ? { tzName: undefined } : {}) };
      sync();
      emit();
    });
  }

  async function choose(p) {
    let zone = { tz: p[5], tzName: p[6] || undefined };
    if (zone.tz == null && !zone.tzName) zone = await nearestZone(p[3], p[4]);
    if (zone.tz == null) zone.tz = tzOffsetAt(zone.tzName, today());
    place = { name: label(p), lat: p[3], lon: p[4], ...zone };
    input.value = place.name;
    close();
    sync();
    emit();
  }
  function close() { list.hidden = true; input.setAttribute("aria-expanded", "false"); active = -1; }
  function render(loading) {
    const items = results.map((p, i) =>
      h("li", { role: "option", "aria-selected": String(i === active), onmousedown: (e) => { e.preventDefault(); choose(p); } },
        h("span.place-name", p[2]), " ", h("small", [p[8], p[1], p[0]].filter(Boolean).join(", "))));
    if (loading) items.push(h("li.place-loading", { "aria-disabled": "true" }, tx("കൂടുതൽ സ്ഥലങ്ങൾ തിരയുന്നു…", "Searching more places…")));
    list.replaceChildren(...items);
    list.hidden = items.length === 0;
    input.setAttribute("aria-expanded", String(!list.hidden));
  }

  let seq = 0;
  let timer = 0;
  let ctrl = null;
  input.addEventListener("input", async () => {
    const my = ++seq;
    if (place) { place = null; sync(); emit(); }
    const q = input.value;
    const local = await searchPlaces(q, 8);
    if (my !== seq) return;
    results = local;
    active = -1;
    render(q.trim().length >= 3);
    clearTimeout(timer);
    ctrl?.abort();
    if (q.trim().length < 3) return;
    timer = setTimeout(async () => {
      ctrl = new AbortController();
      const online = await searchPlacesOnline(q, { signal: ctrl.signal });
      if (my !== seq) return;
      // merge, dropping online hits that duplicate a built-in place nearby
      const near = (a, b) => Math.abs(a[3] - b[3]) < 0.05 && Math.abs(a[4] - b[4]) < 0.05;
      results = [...local, ...online.filter((o) => !local.some((l) => near(l, o) && l[2].toLowerCase() === o[2].toLowerCase()))].slice(0, 14);
      render(false);
    }, 350);
  });
  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    if (e.key === "ArrowDown") { active = Math.min(results.length - 1, active + 1); render(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { active = Math.max(0, active - 1); render(); e.preventDefault(); }
    else if (e.key === "Enter" && active >= 0) { choose(results[active]); e.preventDefault(); }
    else if (e.key === "Escape") close();
  });
  input.addEventListener("blur", () => setTimeout(close, 150));

  locBtn?.addEventListener("click", () => {
    locBtn.disabled = true;
    locBtn.dataset.state = "loading";
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: la, longitude: lo } = pos.coords;
      const row = (await reverseGeocode(la, lo)) || ["", "", tx("എന്റെ സ്ഥലം", "My location"), la, lo, null, null, "", ""];
      row[3] = la;
      row[4] = lo;
      await choose(row);
      locBtn.disabled = false;
      delete locBtn.dataset.state;
    }, () => {
      locBtn.disabled = false;
      delete locBtn.dataset.state;
      summary.textContent = tx("സ്ഥലം കണ്ടെത്താനായില്ല. പേര് ടൈപ്പ് ചെയ്യുക.", "Couldn't get your location. Please type the place.");
    }, { enableHighAccuracy: false, timeout: 15000 });
  });

  sync();
  emit();
  return h("div.place-picker", { style: { gridColumn: "1 / -1" } },
    h("label.field", h("span", t("place")), h("div.combo", input, list)),
    h("div.place-row", summary, locBtn),
    details);
}
