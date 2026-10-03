// About: what this is, disclaimer, licences and attributions.
import { h } from "../lib/dom.js";
import { t, tx } from "../lib/i18n.js";
import { APP_NAME, APP_NAME_ML, PUBLIC } from "../lib/edition.js";

export const SOURCE_URL = "https://github.com/prasanthsasikumar/kerala-astro-guide";

const a = (href, text) => h("a", { href, target: "_blank", rel: "noopener" }, text || href);

// [family, authors, licence]
const FONTS = [
  ["Meera", "Hussain K H, Suresh P, Swathanthra Malayalam Computing", "GPL-3.0-or-later with font exception"],
  ["Rachana", "Rachana Akshara Vedi, Swathanthra Malayalam Computing", "GPL-2.0-or-later with font exception"],
  ["Dyuthi", "Hiran Venugopalan, Hussain K H, Suresh P, Swathanthra Malayalam Computing", "GPL-3.0-or-later with font exception"],
  ["Suruma", "Suresh P", "GPL-3.0 with font exception"],
  ["Chilanka", "Santhosh Thottingal, Kavya Manohar, Swathanthra Malayalam Computing", "SIL OFL 1.1"],
  ["Keraleeyam", "Hussain K H, Rajeesh K Nambiar, Kavya Manohar, Swathanthra Malayalam Computing", "SIL OFL 1.1"],
  ["Uroob", "Hussain K H, Kavya Manohar, Rajeesh K Nambiar, Santhosh Thottingal, Swathanthra Malayalam Computing", "SIL OFL 1.1"],
  ["AnjaliNewLipi", "Kevin & Siji, Cibu Johny", "SIL OFL 1.1"],
  ["Noto Sans Malayalam", "Google", "SIL OFL 1.1"],
  ["Deshabhimani", "Deshabhimani Malayalam Daily", "SIL OFL 1.1"],
  ["Samathwa, Kayyoor, Nellu", "Appropriate Technology Promotion Society (ATPS)", "SIL OFL 1.1"],
  ["Sokanasini", "Chittur College, ATPS", "SIL OFL 1.1"],
];

export function render(el) {
  el.append(
    h("div.page-head", h("div", h("h1", t("about")), h("p", tx(APP_NAME_ML, APP_NAME)))),
    h("div.stack", { style: { maxWidth: "760px" } },
      h("div.card",
        h("h2", { style: { marginTop: 0 } }, tx("ഇത് എന്താണ്", "What this is")),
        h("p", tx(
          `${APP_NAME_ML} കേരളീയ ജ്യോതിഷ ഗണിതത്തിനുള്ള ഒരു സൗജന്യ വെബ് ആപ്പാണ്: ജാതകം (ഗ്രഹനില, ദശ, ഭാവം, വര്‍ഗ്ഗങ്ങള്‍, അഷ്ടവര്‍ഗം), വിവാഹപൊരുത്തം, പ്രശ്നം, ഗോചരം, മുഹൂര്‍ത്തം, ദിവസപഞ്ചാംഗം, മലയാളം തീയതി. എല്ലാ ഗണനവും നിങ്ങളുടെ ബ്രൗസറില്‍ത്തന്നെ നടക്കുന്നു; വിവരങ്ങള്‍ ഒരു സെര്‍വറിലേക്കും അയക്കുന്നില്ല.`,
          `${APP_NAME} is a free web app for Kerala-style astrological calculations: horoscope (charts, dasa, bhava, vargas, ashtakavarga), marriage matching (porutham), prashnam, transits, muhurtham, the daily panchangam and the Malayalam calendar. Everything is computed in your browser; nothing you enter is sent to a server.`)),
        PUBLIC && h("p", tx(
          "ഈ പതിപ്പ് ഗണിതഫലങ്ങള്‍, പട്ടികകള്‍, ചാര്‍ട്ടുകള്‍ എന്നിവ മാത്രം കാണിക്കുന്നു; ഫലവിവരണങ്ങള്‍ ഉള്‍പ്പെടുത്തിയിട്ടില്ല.",
          "This edition shows calculations, tables and charts only; it does not include interpretive texts."))),
      h("div.card",
        h("h2", { style: { marginTop: 0 } }, tx("നിരാകരണം", "Disclaimer")),
        h("p", tx(
          "പരമ്പരാഗത ജ്യോതിഷ നിയമങ്ങള്‍ അനുസരിച്ചുള്ള ഗണനകളാണ് ഇവ. സാംസ്കാരികവും വിദ്യാഭ്യാസപരവുമായ ആവശ്യങ്ങള്‍ക്കു മാത്രം. വൈദ്യം, നിയമം, സാമ്പത്തികം, വിവാഹം തുടങ്ങിയ പ്രധാന തീരുമാനങ്ങള്‍ക്ക് ഇതിനെ ആശ്രയിക്കരുത്. ഫലങ്ങള്‍ക്ക് യാതൊരു ഉറപ്പുമില്ല.",
          "These are calculations according to traditional astrological rules, provided for cultural and educational use. They are not scientific predictions and must not be relied on for medical, legal, financial, marriage or other important decisions. No warranty of any kind."))),
      h("div.card",
        h("h2", { style: { marginTop: 0 } }, tx("ലൈസന്‍സും കടപ്പാടും", "Licence and attributions")),
        h("ul", { style: { paddingLeft: "1.2em", lineHeight: 1.7 } },
          h("li", tx("സോഴ്സ് കോഡ്: ", "Source code: "), a(SOURCE_URL), " (GNU AGPL-3.0)."),
          h("li", "Swiss Ephemeris © Astrodienst AG, Zürich, ", a("https://www.astro.com/swisseph/", "astro.com/swisseph"),
            ", used under the GNU AGPL-3.0 (via ", a("https://github.com/ptprashanttripathi/sweph-wasm", "sweph-wasm"), ")."),
          h("li", tx("സ്ഥലവിവരങ്ങള്‍: ", "Place data: "), a("https://www.geonames.org/", "GeoNames"), ", CC BY 4.0."),
          h("li", tx("മലയാളം ഫോണ്ടുകള്‍:", "Malayalam fonts:"),
            h("ul", { style: { paddingLeft: "1.2em" } }, FONTS.map(([f, by, lic]) => h("li", h("strong", f), ` · ${by} · ${lic}`))))),
        h("p.muted", tx(
          "ഇത് ഒരു സ്വതന്ത്ര പ്രോജക്റ്റാണ്; മറ്റേതെങ്കിലും ജ്യോതിഷ സോഫ്റ്റ്‌വെയറിന്റെ നിർമ്മാതാക്കളുമായി ഇതിന് ബന്ധമോ അവരുടെ അംഗീകാരമോ ഇല്ല.",
          "Independent project, not affiliated with or endorsed by the makers of any other astrology software.")))));
}
