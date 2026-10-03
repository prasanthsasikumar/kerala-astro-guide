// Settings model.
export const AYANAMSA = [
  { v: 1, label: "Chitrapaksha (Lahiri)" },
  { v: 255, label: "Chandrahari" },
  { v: 5, label: "KP" },
  { v: 17, label: "Galaxy centric" },
  { v: 3, label: "B V Raman" },
  { v: 0, label: "Fagan Bradley" },
];
export const NODE = [{ v: 10, label: "Mean node" }, { v: 11, label: "True node" }];
export const KOLLAM = [{ v: 1, label: "വടക്കന്‍ കേരള സംക്രമഗണിത പ്രകാരം", en: "North Kerala" }, { v: 0, label: "തെക്കന്‍ കേരള സംക്രമഗണിത പ്രകാരം", en: "South Kerala" }];
export const SAKA = [{ v: false, label: "Traditional Saka" }, { v: true, label: "Indian Govt. Saka" }];
export const HOUSE = [
  { v: 0, label: "Arsha (Whole sign)" },
  { v: 1, label: "KP (Placidus)" },
  { v: 2, label: "Sripathi (Porphyry)" },
  { v: 3, label: "Koch" },
];
export const HOUSE_HSYS = { 1: "P", 2: "O", 3: "K" };
export const YEAR_LENGTH = [
  { v: 365.256363004, label: "Sidereal year (365.256363004)" },
  { v: 365.24219, label: "Tropical year (365.24219)" },
  { v: 360, label: "Savana year (360)" },
  { v: 354, label: "Thithi year (354)" },
  { v: 324, label: "Nakshatra year (324)" },
  { v: 365.2425, label: "Normal solar year (365.2425)" },
];
// Each sunrise option maps to its intended Swiss Ephemeris flags.
export const SUNRISE = [
  { v: 768, label: "The center of Sun disk is truly on the eastern horizon" },
  { v: 8704, label: "The bottom of Sun disk is truly on the eastern horizon" },
  { v: 256, label: "The center of Sun disk appears on the eastern horizon" },
  { v: 8192, label: "The bottom of Sun disk appears on the eastern horizon" },
];
export const PAPA = [
  { v: 0, label: "ദമ്പത്യോരൈക്യകാലേ എന്നിത്യാദി നിയമം" },
  { v: 1, label: "ലഗ്നാത് പൂർണം..." },
  { v: 2, label: "ദീർഘമംഗല്യയോഗമാണ്..." },
];
export const PRASNA_SPHUTA = [{ v: 0, label: "ലഗ്നസ്ഫുടം" }, { v: 1, label: "ആരൂഢസ്ഫുടം" }];
export const FONTS = ["Meera", "AnjaliNewLipi", "NotoSans", "Rachana", "Suruma", "chilanka", "Deshabhimani", "Dyuthi", "Kayyoor", "keraleeyam", "Nellu", "Samathwa", "Sokanasini", "Uroob"];

export const DEFAULTS = {
  ayanamsa: 1,
  node: 10,
  kollamEra: 0, // default South Kerala
  sakaGovt: true,
  house: 2,
  yearLength: 365.2425,
  sunrise: 768,
  papa: 0,
  prasnaSphuta: 0,
  fontSize: 21,
  font: "Meera",
  dasaView: 0, // 0 list, 1 table
  rithuSayana: false,
  ashtaTable: false,
  ashtaRahuKetu: false,
  kalachakraParasari: true,
  dasaSandhiFromNow: true,
  veedhiMethod1: true,
};
