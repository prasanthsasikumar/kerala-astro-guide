// Malayalam / English labels.
import { getUI } from "./store.js";
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

export const lang = () => getUI().lang || "ml";
export function t(key) {
  const v = L[key];
  if (!v) return key;
  return lang() === "en" ? v[1] : v[0];
}
// Pick between a Malayalam and an English string inline.
export const tx = (ml, en) => (lang() === "en" && en ? en : ml);
export function addLabels(obj) {
  Object.assign(L, obj);
}
