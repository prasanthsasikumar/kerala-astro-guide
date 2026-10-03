// Display names (traditional Malayalam and English names) and formatters.
import { tx } from "../lib/i18n.js";
import { ANGADITYA_RESULT } from "@private/texts.js";

export const RASI_ML = ["മേടം", "ഇടവം", "മിഥുനം", "കര്‍ക്കിടകം", "ചിങ്ങം", "കന്നി", "തുലാം", "വൃശ്ചികം", "ധനു", "മകരം", "കുംഭം", "മീനം"];
export const RASI_EN = ["Mesha", "Vrishabha", "Mithuna", "Karkata", "Simha", "Kanya", "Tula", "Vrischika", "Dhanu", "Makara", "Kumbha", "Meena"];
export const rasi = (i) => tx(RASI_ML[i], RASI_EN[i]);

export const MAL_MONTH_EN = ["Medam", "Edavam", "Midhunam", "Karkidakam", "Chingam", "Kanni", "Thulam", "Vrischikam", "Dhanu", "Makaram", "Kumbham", "Meenam"];
export const malMonth = (id1) => tx(RASI_ML[id1 - 1], MAL_MONTH_EN[id1 - 1]);

const PLANET = {
  Lagna: ["ലഗ്നം", "ല", "Lagna", "As"],
  Sun: ["സൂര്യന്‍", "ര", "Sun", "Su"],
  Moon: ["ചന്ദ്രന്‍", "ച", "Moon", "Mo"],
  Mars: ["ചൊവ്വ", "കു", "Mars", "Ma"],
  Mercury: ["ബുധന്‍", "ബു", "Mercury", "Me"],
  Jupiter: ["വ്യാഴം", "ഗു", "Jupiter", "Ju"],
  Venus: ["ശുക്രന്‍", "ശു", "Venus", "Ve"],
  Saturn: ["ശനി", "മ", "Saturn", "Sa"],
  Rahu: ["രാഹു", "സ", "Rahu", "Ra"],
  Ketu: ["കേതു", "ശി", "Ketu", "Ke"],
  Mandi: ["മാന്ദി", "മാ", "Mandi", "Md"],
};
export const planet = (k) => tx(PLANET[k][0], PLANET[k][2]);
export const planetShort = (k) => tx(PLANET[k][1], PLANET[k][3]);
export const planetByShort = (abbr) => Object.keys(PLANET).find((k) => PLANET[k][1] === abbr);

export const NAK_EN = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
export const NAK_SHORT_ML = ["അ", "ഭ", "കാ", "രോ", "മ", "തി", "പു", "പൂ", "ആ", "മ", "പൂ", "ഉ", "അ", "ചി", "ചോ", "വി", "അ", "കേ", "മൂ", "പൂ", "ഉ", "തി", "അ", "ച", "പൂ", "ഉ", "രേ"];
export const nak = (db, id1) => tx(db.tblMalayalamNakshatra[id1 - 1].Name, NAK_EN[id1 - 1]);

export const MRUGAM = ["ആണ്‍ കുതിര", "ആണ്‍ ആന", "പെണ്‍ ആട്", "ആണ്‍ പാമ്പ്", "പെണ്‍ പാമ്പ്", "പെണ്‍ പട്ടി", "പെണ്‍ പൂച്ച", "ആണ്‍ ആട്", "ആണ്‍ പൂച്ച", "ആണ്‍ എലി", "പെണ്‍ എലി", "ആണ്‍ ഒട്ടകം, കാള", "എരുമ", "പെണ്‍ സിംഹം, പെണ്‍ കടുവ", "പോത്ത്", "ആണ്‍ സിംഹം, ആണ്‍ കടുവ", "പെണ്‍ മാന്‍", "ആണ്‍ മാന്‍", "ആണ്‍ പട്ടി", "ആണ്‍ കുരങ്ങന്‍", "കാള, ആണ്‍ കീരി", "പെണ്‍ കുരങ്ങന്‍", "എരുമ, പെണ്‍ സിംഹം", "പെണ്‍ കുതിര", "മനുഷ്യസ്ത്രീ, ആണ്‍ സിംഹം", "പശു", "പെണ്‍ ആന"];

export const SAMVATSARA = ["പ്രഭവ", "വിഭവ", "ശുക്ല", "പ്രമോദ", "പ്രജാപതി", "അംഗിരാ", "ശ്രീമുഖ", "ഭാവ", "യുവാ", "ധാതാ", "ഈശ്വര", "ബഹുധാന്യ", "പ്രമാഥീ", "വിക്രമ", "വൃഷ", "ചിത്രഭാനു", "സുഭാനു", "താരണ", "പാർഥിവ", "വ്യയ", "സർവജിത്", "സർവധാരീ", "വിരോധീ", "വികൃതി", "ഖര", "നന്ദന", "വിജയ", "ജയ", "മന്മഥ", "ദുർമുഖ", "ഹേമലംബീ", "വിലംബീ", "വികാരീ", "ശർവരീ", "പ്ലവ", "ശുഭകൃത്", "ശോഭന", "ക്രോധീ", "വിശ്വാവസു", "പരാഭവ", "പ്ലവംഗ", "കീലക", "സൗമ്യ", "സാധാരണ", "വിരോധകൃത്", "പരിധാവീ", "പ്രമാഥീ", "ആനന്ദ", "രാക്ഷസ", "നല", "പിംഗല", "കാല", "സിദ്ധാർഥ", "രൗദ്ര", "ദുർമതി", "ദുന്ദുഭീ", "രുധിരോദ്ഗാരീ", "രക്താക്ഷീ", "ക്രോധന", "ക്ഷയ"];
export const SAKA_MONTH = ["ചൈത്രം", "വൈശാഖം", "ജ്യേഷ്ഠ", "ആഷാഢം", "ശ്രാവണം", "ഭാദ്രപദം", "അശ്വിനം", "കാര്‍ത്തിക", "മാര്‍ഗ്ഗശീര്‍ഷം", "പൌഷം", "മാഘം", "ഫാല്‍ഗുനം"];
export const SAKA_MONTH_EN = ["Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada", "Ashvina", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"];
export const DAGDHA = ["തുലാം, മകരം", "ധനു, മീനം", "ചിങ്ങം, മകരം", "ഇടവം, കുംഭം", "മിഥുനം, കന്നി", "മേടം, ചിങ്ങം", "കർക്കടകം, ധനു", "മിഥുനം, കന്നി", "ചിങ്ങം, വൃശ്ചികം", "ചിങ്ങം, വൃശ്ചികം", "ധനു, മീനം", "തുലാം, മകരം", "ഇടവം, ചിങ്ങം", "മീനം, മിഥുനം, കന്നി, ധനു", "ഇല്ല"];
// Angaditya position (head, face, belly, hands, feet) with its optional result word
export const ANGADITYA = ["ശിരസില്‍", "മുഖത്ത്", "ഉദരത്തില്‍", "കൈകളില്‍", "പാദത്തില്‍"].map((x, i) => [x, ANGADITYA_RESULT?.[i] ?? null]);
export const RITHU = [["വസന്തം", "Vasantha"], ["ഗ്രീഷ്‌മം", "Grishma"], ["വർഷം", "Varsha"], ["ശരത്", "Sarat"], ["ഹേമന്തം", "Hemanta"], ["ശിശിരം", "Sisira"]];
export const BHUTA = [["ഭൂമി", "Earth"], ["ജലം", "Water"], ["അഗ്നി", "Fire"], ["വായു", "Air"], ["ആകാശം", "Space"]];
export const WEEKDAY_ML = ["ഞായര്‍", "തിങ്കള്‍", "ചൊവ്വ", "ബുധന്‍", "വ്യാഴം", "വെള്ളി", "ശനി"];
export const WEEKDAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const weekday = (dow1) => tx(WEEKDAY_ML[dow1 - 1], WEEKDAY_EN[dow1 - 1]);

// ---- formatting ----
const pad = (n) => String(n).padStart(2, "0");
const EPS = 1.3888888888888889e-8;
export function dms(deg) {
  const x = deg + EPS;
  const d = Math.trunc(x);
  const mf = (x - d) * 60;
  return `${d}° ${pad(Math.trunc(mf))}' ${pad(Math.trunc((mf % 1) * 60))}"`;
}
// in-sign position "Rasi 16° 47'"
export function signPos(lon) {
  const x = lon + EPS;
  const s = Math.trunc(x / 30);
  const inSign = x - s * 30;
  return `${rasi(s)} ${Math.trunc(inSign)}° ${pad(Math.trunc((inSign % 1) * 60))}'`;
}
// the Kerala "rasi - deg - min" sphuta notation
export const sphuta = (lon) => {
  const x = lon + EPS;
  return `${pad(Math.trunc(Math.trunc(x) / 30))} - ${pad(Math.trunc(x) % 30)} - ${pad(Math.trunc((x % 1) * 60))}`;
};
export const deg3 = (lon) => {
  const x = lon + EPS;
  return `${String(Math.trunc(x)).padStart(3, " ")}°${pad(Math.trunc((x % 1) * 60))}'`;
};
export function clock(hours, { ampm = true } = {}) {
  let h = Math.trunc(hours + 1e-9);
  const m = Math.trunc((hours - h) * 60 + 1e-6);
  if (!ampm) return `${pad(h)}:${pad(m)}`;
  const suffix = h >= 12 ? "PM" : "AM";
  h %= 12;
  if (h === 0) h = 12;
  return `${h}:${pad(m)} ${suffix}`;
}
export const nazhikaText = ({ n, v }) => tx(`${n} നാ. ${v} വിനാ.`, `${n} ng ${v} vn`);
export const fmtDate = (dn) => {
  const dt = new Date(dn * 864e5);
  return `${pad(dt.getUTCDate())}-${pad(dt.getUTCMonth() + 1)}-${dt.getUTCFullYear()}`;
};
