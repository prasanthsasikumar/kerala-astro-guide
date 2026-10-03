// Horoscope tab registry. Each tab module exports render(chart, ctx) -> Node.
// full(...) marks interpretive-text tabs that exist only in the full edition (ed: "full");
// in the public build they are dropped at compile time, so their modules are not bundled.
// (import.meta.env is replaced at build time, which lets the bundler drop the imports.)
const FULL = import.meta.env?.VITE_EDITION !== "public";

const ALL_TABS = [
  { id: "time", ml: "സമയം", en: "Time", load: () => import("./tabs/time.js") },
  { id: "sphutas", ml: "സ്ഫുടങ്ങള്‍", en: "Sphutas", load: () => import("./tabs/sphutas.js") },
  { id: "charts", ml: "ഗ്രഹനില", en: "Charts", load: () => import("./tabs/charts.js") },
  { id: "dasa", ml: "നക്ഷത്ര ദശ", en: "Dasa", load: () => import("./tabs/dasa.js") },
  { id: "bhava", ml: "ഭാവസ്ഫുടം", en: "Bhava sphuta", load: () => import("./tabs/bhava.js") },
  { id: "shadvarga", ml: "ഷഡ്വര്‍ഗ്ഗം", en: "Shadvarga", load: () => import("./tabs/shadvarga.js") },
  { id: "ashtakavarga", ml: "അഷ്ടവര്‍ഗം", en: "Ashtakavarga", load: () => import("./tabs/ashtakavarga.js") },
  FULL && { ed: "full", id: "av-phalam", ml: "അഷ്ടവര്‍ഗഫലം", en: "Ashtakavarga results", load: () => import("./tabs/av-phalam.js") },
  FULL && { ed: "full", id: "panchanga-phalam", ml: "പഞ്ചാംഗഫലം", en: "Panchanga results", load: () => import("./tabs/panchanga-phalam.js") },
  FULL && { ed: "full", id: "lagna-phalam", ml: "ലഗ്നഫലം", en: "Lagna results", load: () => import("./tabs/lagna-phalam.js") },
  FULL && { ed: "full", id: "chandra-phalam", ml: "ചന്ദ്രഫലം", en: "Moon results", load: () => import("./tabs/chandra-phalam.js") },
  FULL && { ed: "full", id: "bhava-phalam", ml: "ഭാവഫലം", en: "House results", load: () => import("./tabs/bhava-phalam.js") },
  FULL && { ed: "full", id: "bhavashraya", ml: "ഭാവാശ്രയഫലം", en: "Planet-in-house results", load: () => import("./tabs/bhavashraya.js") },
  FULL && { ed: "full", id: "dasa-phalam", ml: "ദശാപഹാരഫലം", en: "Dasa results", load: () => import("./tabs/dasa-phalam.js") },
  FULL && { ed: "full", id: "yoga", ml: "യോഗഫലം", en: "Yogas", load: () => import("./tabs/yoga.js") },
  { id: "karthru", ml: "കര്‍ത്തൃദോഷം", en: "Karthru dosham", load: () => import("./tabs/karthru.js") },
  FULL && { ed: "full", id: "gochara", ml: "ഗോചരഫലം", en: "Transit results", load: () => import("./tabs/gochara.js") },
  FULL && { ed: "full", id: "avastha", ml: "അവസ്ഥാഫലം", en: "Avastha results", load: () => import("./tabs/avastha.js") },
  FULL && { ed: "full", id: "pariharam", ml: "പരിഹാരം", en: "Remedies", load: () => import("./tabs/pariharam.js") },
  { id: "kalachakra", ml: "കാലചക്ര ദശ", en: "Kalachakra dasa", load: () => import("./tabs/kalachakra.js") },
  { id: "parashari", ml: "പരാശരി", en: "Parashari", load: () => import("./tabs/parashari.js") },
  { id: "varga", ml: "വര്‍ഗ്ഗചക്രങ്ങള്‍", en: "Varga charts", load: () => import("./tabs/varga.js") },
  { id: "kp", ml: "കൃഷ്ണമൂർത്തി പദ്ധതി", en: "KP system", load: () => import("./tabs/kp.js") },
  { id: "print", ml: "Print", en: "Print", load: () => import("./tabs/print.js") },
];

export const TABS = ALL_TABS.filter(Boolean);
