// r2 · Birth details, one question per step: who → when → where.
// #/person?for=horoscope|ask[&edit=<id>]
import { h, clear } from "../lib/dom.js";
import { tx, lang } from "../lib/i18n.js";
import { listCharts, saveChart, deleteChart } from "../lib/store.js";
import { tzOffsetAt } from "../lib/edition.js";
import { placePicker } from "../components/place-picker.js";
import { track } from "../lib/analytics.js";
import { hrefFor, rememberPerson } from "../lib/people.js";
import { bi } from "../ui/bi.js";

export function render(el, params) {
  const target = params.for === "ask" ? "ask" : "horoscope";
  const existing = params.edit ? listCharts().find((c) => c.id === params.edit) : null;
  const v = existing
    ? { ...existing, time: existing.timeUnknown ? "" : existing.time }
    : { name: "", gender: "", date: "", time: "", timeUnknown: false, place: null };
  let step = 1;
  const root = h("div.person-form");
  el.append(root);

  const both = (ml, en) => (lang() === "en" ? `${en} · ${ml}` : `${ml} · ${en}`);
  const nm = () => v.name.trim() || tx("ഇവർ", "they");
  const draw = () => {
    clear(root);
    const err = h("p.form-error", { role: "alert", hidden: true });
    const fail = (ml, en) => { err.textContent = tx(ml, en); err.hidden = false; };
    let body;
    let check;
    if (step === 1) {
      const name = h("input.big-input", { type: "text", value: v.name, autocomplete: "off", enterkeyhint: "next", "aria-label": tx("പേര്", "Name") });
      const choices = [["Male", "പുരുഷൻ", "Male"], ["Female", "സ്ത്രീ", "Female"]].map(([val, ml, en]) =>
        h("button.big-choice", { type: "button", "aria-pressed": String(v.gender === val), onclick: (e) => { v.gender = val; choices.forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget))); } }, bi(ml, en)));
      name.addEventListener("input", () => { v.name = name.value; });
      body = [question("ആരുടെ ജാതകമാണ്?", "Whose horoscope is it?"),
        h("div.form-stack", h("span.field-label", bi("പേര്", "Name")), name, h("span.field-label", bi("ആൺ / പെൺ", "Male / female")), h("div.big-choices", choices))];
      check = () => (!v.name.trim() ? fail("പേര് എഴുതുക", "Enter a name") : !v.gender ? fail("പുരുഷനോ സ്ത്രീയോ എന്ന് തിരഞ്ഞെടുക്കുക", "Choose male or female") : true);
      setTimeout(() => !v.name && name.focus(), 50);
    } else if (step === 2) {
      const date = h("input.big-input", { type: "date", value: v.date, min: "1800-01-01", max: "2399-12-31", "aria-label": tx("ജനന തീയതി", "Date of birth") });
      const time = h("input.big-input", { type: "time", value: v.time, disabled: v.timeUnknown, "aria-label": tx("ജനന സമയം", "Time of birth") });
      const unknown = h("input", { type: "checkbox", checked: v.timeUnknown });
      date.addEventListener("change", () => { v.date = date.value; });
      time.addEventListener("change", () => { v.time = time.value; });
      unknown.addEventListener("change", () => { v.timeUnknown = unknown.checked; time.disabled = unknown.checked; if (unknown.checked) { time.value = ""; v.time = ""; } });
      body = [question(`${nm()} ജനിച്ചത് എപ്പോൾ?`, `When was ${nm()} born?`),
        h("div.form-stack", h("span.field-label", bi("തീയതി", "Date")), date, h("span.field-label", bi("സമയം", "Time")), time,
          h("label.check-row", unknown, bi("സമയം കൃത്യമായി അറിയില്ല", "Exact time not known")))];
      check = () => (!v.date ? fail("ജനന തീയതി നൽകുക", "Enter the date of birth")
        : !v.timeUnknown && !v.time ? fail("ജനന സമയം നൽകുക, അല്ലെങ്കിൽ 'സമയം അറിയില്ല' തിരഞ്ഞെടുക്കുക", "Enter the time, or tick 'Exact time not known'") : true);
    } else {
      body = [question(`${nm()} ജനിച്ചത് എവിടെ?`, `Where was ${nm()} born?`),
        h("div.form-stack.where", placePicker(v.place, (p) => { v.place = p; })),
        h("p.note", tx("അക്ഷാംശം, രേഖാംശം, സമയമേഖല എന്നിവ തനിയെ ചേരും.", "Latitude, longitude and time zone fill in automatically."))];
      check = () => (Number.isFinite(v.place?.lat) ? true : fail("ജനിച്ച സ്ഥലം ലിസ്റ്റിൽ നിന്ന് തിരഞ്ഞെടുക്കുക", "Pick the birth place from the list"));
    }
    const isLast = step === 3;
    const cta = isLast ? (target === "ask" ? both("ജ്യോതിഷിയെ വിളിക്കാം", "Call the astrologer") : both("ജാതകം കാണുക", "See horoscope")) : both("അടുത്തത്", "Next");
    const summary = [v.name && step > 1 ? `${v.name}${v.gender ? " · " + tx(v.gender === "Male" ? "പുരുഷൻ" : "സ്ത്രീ", v.gender) : ""}` : "",
      v.date && step > 2 ? `${v.date.split("-").reverse().join("-")}${v.timeUnknown ? "" : ", " + v.time}` : ""].filter(Boolean);
    root.append(...[
      h("header.screen-head",
        h("a.back-link", {
          href: "#",
          onclick: (e) => {
            e.preventDefault();
            if (step > 1) { step -= 1; draw(); } else if (history.length > 1) history.back(); else location.hash = "#/";
          },
        }, "‹ ", bi("തിരികെ", "Back")),
        h("span.step-count", `${step} / 3`)),
      h("div.steps", [1, 2, 3].map((n) => h("span", { class: n <= step ? "is-done" : "" }))),
      ...body, err,
      h("div.bottom-bar",
        summary.length ? h("div.bottom-summary", summary.map((x) => h("span", x))) : null,
        h("button.btn-primary-xl", { type: "button", onclick: () => { if (check() !== true) return; if (!isLast) { step += 1; draw(); } else finish(); } }, cta)),
      existing && isLast ? h("p.note", h("button.ask-textbtn.danger", { type: "button", onclick: remove }, bi("ഈ ആളെ നീക്കം ചെയ്യുക", "Remove this person"))) : null,
    ].filter(Boolean));
  };

  function question(ml, en) {
    const [a, b] = lang() === "en" ? [en, ml] : [ml, en];
    return h("div.q", h("h1", a), h("p", b));
  }
  function finish() {
    const t = v.timeUnknown ? "12:00" : v.time;
    const place = v.place.tzName ? { ...v.place, tz: tzOffsetAt(v.place.tzName, v.date, t) } : v.place;
    const saved = saveChart({ ...(existing || {}), name: v.name.trim(), gender: v.gender, date: v.date, time: t, timeUnknown: !!v.timeUnknown, place, kind: "birth", star: undefined });
    if (!existing) track("person_added", { time_unknown: !!v.timeUnknown, for: target });
    rememberPerson(saved);
    location.hash = hrefFor(saved, target);
  }
  function remove() {
    if (!confirm(tx("ഈ ആളെ നീക്കം ചെയ്യട്ടെ?", "Remove this person?"))) return;
    deleteChart(existing.id);
    location.hash = "#/people";
  }
  draw();
}
