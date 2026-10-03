// Settings (ക്രമീകരണങ്ങൾ) - 21 options. Saved per browser.
import { h } from "../lib/dom.js";
import { t, tx } from "../lib/i18n.js";
import { getSettings, setSettings, exportBackup, importBackup } from "../lib/store.js";
import * as S from "../engine/settings.js";

const opt = (list) => list.map((o) => ({ v: o.v, label: o.en ? tx(o.label, o.en) : o.label }));
const bool = (falseLabel, trueLabel) => [{ v: false, label: falseLabel }, { v: true, label: trueLabel }];

const FIELDS = [
  ["ayanamsa", "അയനാംശം", "Ayanamsa", opt(S.AYANAMSA)],
  ["node", "രാഹു-കേതു", "Rahu / Ketu", opt(S.NODE)],
  ["kollamEra", "സംക്രമഗണിതം", "Sankramam (Malayalam date)", opt(S.KOLLAM)],
  ["sakaGovt", "ശകവര്‍ഷം", "Saka era", opt(S.SAKA)],
  ["house", "ഭാവം", "House system", opt(S.HOUSE)],
  ["yearLength", "വര്‍ഷദൈര്‍ഘ്യം", "Dasa year length", opt(S.YEAR_LENGTH)],
  ["sunrise", "സൂര്യോദയം", "Sunrise", opt(S.SUNRISE)],
  ["papa", "പാപസാമ്യം", "Papasamyam rule", opt(S.PAPA)],
  ["prasnaSphuta", "പ്രശ്നത്തിൽ ത്രിസ്ഫുടാദികളിൽ പരിഗണികേണ്ട സ്ഫുടം", "Prashna sphuta for trisphuta", opt(S.PRASNA_SPHUTA)],
  ["dasaView", "ദശാപഹാരം", "Dasa view", [{ v: 0, label: "List View" }, { v: 1, label: "Table View" }]],
  ["rithuSayana", "ഋതു", "Season (rithu)", bool("Nirayana", "Sayana")],
  ["ashtaTable", "അഷ്ടവര്‍ഗം", "Ashtakavarga display", bool("Chart", "Table")],
  ["ashtaRahuKetu", "അഷ്ടവര്‍ഗം (രാഹു & കേതു)", "Ashtakavarga Rahu & Ketu", bool("Don't Show", "Show")],
  ["kalachakraParasari", "കാലചക്രദശ", "Kalachakra dasa", bool("Research (Regular)", "Parasari (Irregular)")],
  ["dasaSandhiFromNow", "ദശസന്ധി", "Dasa sandhi", bool("From Birth Date", "From Current Date")],
  ["veedhiMethod1", "വീഥി & ഛത്രം", "Veedhi & chathram", bool("Method 2", "Method 1")],
  ["font", "അക്ഷരം", "Font", S.FONTS.map((f) => ({ v: f, label: f }))],
  ["fontSize", "അക്ഷരവലിപ്പം", "Font size", [16, 18, 19, 20, 21, 22, 24, 26].map((v) => ({ v, label: String(v) }))],
];

// apply font + size app-wide
export function applyTypography(s = getSettings()) {
  const root = document.documentElement;
  root.style.setProperty("--text-scale", String((s.fontSize || 21) / 21));
  if (s.font && s.font !== "Meera") {
    const id = "font-" + s.font;
    if (!document.getElementById(id)) {
      const st = document.createElement("style");
      st.id = id;
      st.textContent = `@font-face { font-family: "${s.font}"; src: url("/fonts/${s.font}.ttf") format("truetype"); font-display: swap; }`;
      document.head.append(st);
    }
    root.style.setProperty("--font-body", `"${s.font}", "Meera", system-ui, sans-serif`);
  } else root.style.removeProperty("--font-body");
}

export function render(el) {
  const s = getSettings();
  const status = h("p.muted", { role: "status" });
  const form = h("div.card", h("div.form-grid", FIELDS.map(([key, ml, en, options]) => {
    const sel = h("select.input", {
      onchange: () => {
        const o = options[sel.selectedIndex];
        setSettings({ [key]: o.v });
        applyTypography();
        status.textContent = tx("സൂക്ഷിച്ചു", "Saved");
      },
    }, options.map((o) => h("option", { selected: o.v === s[key] }, o.label)));
    return h("label.field", { style: { gridColumn: "1 / -1" } }, h("span", tx(ml, en)), sel);
  })));

  const file = h("input", { type: "file", accept: "application/json", hidden: true, onchange: async () => {
    try {
      importBackup(await file.files[0].text());
      location.reload();
    } catch (e) {
      alert(e.message);
    }
  } });
  el.append(
    h("div.page-head", h("h1", t("settings"))),
    form,
    h("div.form-actions",
      h("button.btn", { type: "button", onclick: () => {
        if (!confirm(tx("സ്ഥിരസ്ഥിതി ക്രമീകരണങ്ങളിലേക്ക് മാറ്റട്ടെ?", "Restore default settings?"))) return;
        setSettings({ ...S.DEFAULTS });
        location.reload();
      } }, tx("സ്ഥിരസ്ഥിതി", "Restore defaults")),
      h("button.btn", { type: "button", onclick: () => {
        const a = h("a", { href: URL.createObjectURL(new Blob([exportBackup()], { type: "application/json" })), download: `astro-guide-backup-${new Date().toISOString().slice(0, 10)}.json` });
        a.click();
        URL.revokeObjectURL(a.href);
      } }, t("backup")),
      h("button.btn", { type: "button", onclick: () => file.click() }, t("restore")), file),
    status);
}
