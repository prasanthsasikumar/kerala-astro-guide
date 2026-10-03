// Malayalam / English labels.
import { getUI } from "./store.js";
import { DICT } from "./i18n-dict.js";
import { APP_NAME, APP_NAME_ML } from "./edition.js";

const L = {
  appName: [APP_NAME_ML, APP_NAME],
  about: ["വിവരം", "About"],
  ask: ["ജ്യോതിഷനോട് സംസാരിക്കാം", "Talk to the astrologer"],
  privacy: ["സ്വകാര്യത", "Privacy"],
  admin: ["Admin", "Admin"],
  home: ["ഹോം", "Home"],
  people: ["ആളുകൾ", "People"],
  more: ["കൂടുതൽ ഉപകരണങ്ങൾ", "More tools"],
  horoscope: ["ജാതകം", "Horoscope"],
  porutham: ["വിവാഹപൊരുത്തം", "Marriage matching"],
  prashnam: ["പ്രശ്നം", "Prashnam"],
  gocharam: ["ഗോചരം", "Transits"],
  muhurtham: ["മുഹൂർത്തം", "Muhurtham"],
  tools: ["ഉപകരണങ്ങൾ", "Tools"],
  settings: ["ക്രമീകരണങ്ങൾ", "Settings"],
  saved: ["സൂക്ഷിച്ച ജാതകങ്ങള്‍", "Saved charts"],
  panchangaShuddhi: ["പഞ്ചാംഗശുദ്ധി", "Panchanga shuddhi"],
  divasaPanchangam: ["ദിവസപഞ്ചാംഗം", "Daily panchangam"],
  dateConverter: ["മലയാളം - ഇംഗ്ലീഷ്", "Date converter"],
  nakPorutham: ["നക്ഷത്രപൊരുത്തം", "Star matching"],
  rasiPramanam: ["രാശിപ്രമാണം", "Rasi pramanam"],
  places: ["സ്ഥലം", "Places"],
  name: ["പേര്", "Name"],
  gender: ["ലിംഗം", "Gender"],
  male: ["പുരുഷൻ", "Male"],
  female: ["സ്ത്രീ", "Female"],
  date: ["തീയതി", "Date"],
  time: ["സമയം", "Time"],
  place: ["സ്ഥലം", "Place"],
  latitude: ["അക്ഷാംശം", "Latitude"],
  longitude: ["രേഖാംശം", "Longitude"],
  timezone: ["സമയമേഖല", "Time zone"],
  searchPlace: ["സ്ഥലം തിരയുക", "Search a place"],
  calculate: ["ഗണിക്കുക", "Calculate"],
  save: ["സൂക്ഷിക്കുക", "Save"],
  open: ["തുറക്കുക", "Open"],
  delete: ["നീക്കം ചെയ്യുക", "Delete"],
  print: ["പ്രിന്റ്", "Print"],
  now: ["ഇപ്പോൾ", "Now"],
  comingSoon: ["ഈ ഭാഗം നിർമ്മാണത്തിലാണ്", "This section is being built"],
  loading: ["കാത്തിരിക്കുക…", "Loading…"],
  backup: ["Backup", "Backup"],
  restore: ["Restore", "Restore"],
  newChart: ["പുതിയ ജാതകം", "New horoscope"],
  noSaved: ["സൂക്ഷിച്ച ജാതകങ്ങള്‍ ഇല്ല", "No saved charts yet"],
  theme: ["നിറം", "Theme"],
  light: ["പകൽ", "Light"],
  dark: ["രാത്രി", "Dark"],
  auto: ["സ്വയം", "Auto"],
};

// Malayalam is the default. Other Indian languages translate the simple screens through DICT
// (keyed by the English text); anything without a translation falls back to English.
export const LANGS = [
  { code: "ml", name: "മലയാളം", en: "Malayalam" },
  { code: "en", name: "English", en: "English" },
  { code: "hi", name: "हिन्दी", en: "Hindi", script: "Devanagari" },
  { code: "ta", name: "தமிழ்", en: "Tamil", script: "Tamil" },
  { code: "te", name: "తెలుగు", en: "Telugu", script: "Telugu" },
  { code: "kn", name: "ಕನ್ನಡ", en: "Kannada", script: "Kannada" },
];
export const lang = () => (LANGS.some((l) => l.code === getUI().lang) ? getUI().lang : "ml");
export function t(key) {
  const v = L[key];
  if (!v) return key;
  return tx(v[0], v[1]);
}
// BCP 47 locale for dates and numbers in the current language
export const locale = () => ({ ml: "ml-IN", en: "en-GB", hi: "hi-IN", ta: "ta-IN", te: "te-IN", kn: "kn-IN" })[lang()];

// Pick the string for the current language: Malayalam, English, or a translation of the English.
export function tx(ml, en) {
  const l = lang();
  if (l === "ml" || en == null) return ml;
  if (l === "en") return en;
  return DICT[l]?.[en] ?? en;
}
// Same, for strings with variables: tf("{name} ജനിച്ചത് എവിടെ?", "Where was {name} born?", { name })
export function tf(ml, en, vars = {}) {
  return tx(ml, en).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}

// Load Noto fonts for the chosen script (only when a non-Malayalam Indian language is picked).
export function applyLangFont() {
  const L2 = LANGS.find((l) => l.code === lang());
  const root = document.documentElement;
  if (!L2?.script) {
    root.style.removeProperty("--font-script");
    return;
  }
  const id = "font-" + L2.script;
  if (!document.getElementById(id)) {
    const fam = L2.script.replace(/ /g, "+");
    document.head.append(Object.assign(document.createElement("link"), {
      id, rel: "stylesheet",
      href: `https://fonts.googleapis.com/css2?family=Noto+Sans+${fam}:wght@400;600&family=Noto+Serif+${fam}:wght@700&display=swap`,
    }));
  }
  root.style.setProperty("--font-script", `"Noto Sans ${L2.script}"`);
  root.style.setProperty("--font-script-serif", `"Noto Serif ${L2.script}"`);
}
export function addLabels(obj) {
  Object.assign(L, obj);
}
