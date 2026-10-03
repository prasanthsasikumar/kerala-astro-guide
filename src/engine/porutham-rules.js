// Nakshatra porutham (ten-point star matching) computed from traditional Kerala rules.
//
// Inputs are 1..36 "star-rasi" indices: the 27 stars in order, with each of the nine stars that
// straddle two rasis split into two entries (one per rasi). Female first, as is customary: every
// count runs from the woman's star / rasi to the man's.
//
// Output per pair: "<10 grades>-<count of 8>-<count of 10>-<3-letter code>", e.g. GGGSGMGDGG-5z-7z-UNN.
//   Grades in order: 0 Rasi, 1 Rasyadhipam, 2 Vasyam, 3 Mahendram, 4 Ganam, 5 Yoni, 6 Dinam,
//   7 Sthree deergham, 8 Madhyama rajju, 9 Vedham.
//   Letters: G uttamam (1 point), M madhyamam (0.5), S samanyam (0), D adhamam (0).
//   Count tokens: "<n>y" = n, "<n>z" = n + 0.5. Count of 8 = points of grades 0..7, of 10 = all ten.
//   Code: [rating][R|N][V|N]; R = madhyama rajju dosham, V = vedha dosham.

// ---- plain facts -------------------------------------------------------------------------------

// star (1..27) and rasi (0 = Mesha .. 11 = Meena) of each star-rasi index 1..36
const IDX_STAR = [1, 2, 3, 3, 4, 5, 5, 6, 7, 7, 8, 9, 10, 11, 12, 12, 13, 14, 14, 15, 16, 16, 17, 18, 19, 20, 21, 21, 22, 23, 23, 24, 25, 25, 26, 27];
const IDX_RASI = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11];

// rasi lords
const SIGN_LORD = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];

// Natural (naisargika) planetary relationships, as seen from the first planet.
const FRIENDS = {
  Sun: ["Moon", "Mars", "Jupiter"], Moon: ["Sun", "Mercury"], Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"], Jupiter: ["Sun", "Moon", "Mars"], Venus: ["Mercury", "Saturn"], Saturn: ["Mercury", "Venus"],
};
const ENEMIES = {
  Sun: ["Venus", "Saturn"], Moon: [], Mars: ["Mercury"], Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"], Venus: ["Sun", "Moon"], Saturn: ["Sun", "Moon", "Mars"],
};

// Vasya rasis: the signs each sign "controls" (traditional list).
const VASYA = [[4, 7], [3, 6], [5], [7, 8], [6], [2, 11], [5, 9], [3], [11], [0, 10], [0], [9]];

// Gana: 0 deva, 1 manushya, 2 asura (stars 1..27)
const GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];

// Yoni gender in the Kerala convention: true = purusha (male) star, false = stree (female) star.
const PURUSHA = [true, true, false, false, false, false, false, true, true, true, false, true, false, false, true, true, false, true, true, true, true, true, false, false, true, false, false];

// Madhyama rajju stars (the middle "waist" cord): Bharani, Makayiram, Pooyam, Pooram, Chithira,
// Anizham, Pooradam, Avittam, Uthrattathi.
const MADHYA_RAJJU = [2, 5, 8, 11, 14, 17, 20, 23, 26];

// Vedha (mutually obstructing) star pairs; Makayiram, Chithira and Avittam obstruct one another.
const VEDHA_PAIRS = [[1, 18], [2, 17], [3, 16], [4, 15], [6, 22], [7, 21], [8, 20], [9, 19], [10, 27], [11, 26], [12, 25], [13, 24]];
const VEDHA_GROUP = [5, 14, 23];

// ---- the ten poruthams -------------------------------------------------------------------------

// 1) Rasi: by the count from the woman's rasi to the man's (1 = same rasi). Same rasi, 7th,
// 9th, 10th and 11th are good; 4th, 8th and 12th medium; 2nd, 3rd, 5th, 6th bad (2/12 and 6/8
// as counted from the woman are judged asymmetrically in the Kerala convention).
const RASI_GRADE = [null, "G", "D", "D", "M", "D", "D", "G", "M", "G", "G", "G", "M"];
const rasiP = (rc) => RASI_GRADE[rc];

// 2) Rasyadhipam: the woman's rasi lord's natural relation to the man's rasi lord.
// Same lord or friend = G, neutral = M, enemy = D.
function rasyadhipam(fr, mr) {
  const a = SIGN_LORD[fr], b = SIGN_LORD[mr];
  if (a === b || FRIENDS[a].includes(b)) return "G";
  return ENEMIES[a].includes(b) ? "D" : "M";
}

// 3) Vasyam: same rasi, or either rasi is vasya to the other = G; otherwise samanyam.
const vasyam = (fr, mr) => (fr === mr || VASYA[fr].includes(mr) || VASYA[mr].includes(fr) ? "G" : "S");

// 4) Mahendram: the man's star counted from the woman's is the 4th, 7th, 10th ... 25th.
// Kerala convention also counts the same star (k = 1) as mahendram.
const mahendram = (k) => (k % 3 === 1 ? "G" : "S");

// 5) Ganam: woman's gana (rows) x man's gana (columns), deva / manushya / asura.
// Same gana is best; a manushya woman with a deva man is also best and with an asura man medium;
// a deva woman with a man of any other gana and an asura woman with a non-asura man are bad.
const GANA_GRADE = [["G", "D", "D"], ["G", "G", "M"], ["D", "D", "G"]];
const ganam = (fs, ms) => GANA_GRADE[GANA[fs - 1]][GANA[ms - 1]];

// 6) Yoni: stree (female) star woman with purusha (male) star man is best; both of the same
// gender medium; purusha-star woman with stree-star man bad.
function yoni(fs, ms) {
  const f = PURUSHA[fs - 1], m = PURUSHA[ms - 1];
  if (!f && m) return "G";
  return f && !m ? "D" : "M";
}

// 7) Dinam: the man's star counted from the woman's (k = 1 is the same star).
// 3rd, 5th and 7th (vipat, pratyak, vadha) are bad; the 12th, 14th, 16th and 21st, 23rd, 25th
// (the same taras in the 2nd and 3rd rounds) medium; all others good.
const dinam = (k) => ([3, 5, 7].includes(k) ? "D" : [12, 14, 16, 21, 23, 25].includes(k) ? "M" : "G");

// 8) Sthree deergham: the man's star should be far from the woman's. Count 2..9 bad, 10..14
// medium, 15 and beyond good. The same star is bad, except that for a star split across two
// rasis the man in the earlier rasi and the woman in the later rasi counts as good (his star
// portion precedes hers by a full rasi boundary).
function sthreeDeergham(k, fIdx, mIdx) {
  if (k === 1) return fIdx > mIdx ? "G" : "D";
  return k <= 9 ? "D" : k <= 14 ? "M" : "G";
}

// 9) Madhyama rajju: Kerala convention checks only the middle cord; both stars on it = dosham.
const rajju = (fs, ms) => (MADHYA_RAJJU.includes(fs) && MADHYA_RAJJU.includes(ms) ? "D" : "G");

// 10) Vedham: the two stars obstruct each other.
function vedham(fs, ms) {
  if (VEDHA_GROUP.includes(fs) && VEDHA_GROUP.includes(ms)) return "D";
  return VEDHA_PAIRS.some(([a, b]) => (a === fs && b === ms) || (a === ms && b === fs)) ? "D" : "G";
}

// ---- totals and the overall rating -------------------------------------------------------------

const pts = (c) => (c === "G" ? 1 : c === "M" ? 0.5 : 0);
const token = (x) => `${Math.floor(x)}${x % 1 ? "z" : "y"}`;

// Rating letter (A atyuttamam, U uttamam, S sadharanam, M madhyamam, P poor) from the count of 8:
// with no dosham: < 3 P, 3..3.5 M, 4..4.5 S, 5..5.5 U, 6+ A. With madhyama rajju (and no vedha)
// the bar is raised by two: < 5 P, 5..5.5 M, 6..6.5 S, 7+ U. Any vedha makes the match poor.
function rating(c8, rajjuBad, vedhaBad) {
  if (vedhaBad) return "P";
  if (rajjuBad) return c8 < 5 ? "P" : c8 < 6 ? "M" : c8 < 7 ? "S" : "U";
  return c8 < 3 ? "P" : c8 < 4 ? "M" : c8 < 5 ? "S" : c8 < 6 ? "U" : "A";
}

/** Grades string etc. for female index fIdx and male index mIdx (both 1..36). */
export function matchValue(fIdx, mIdx) {
  const fs = IDX_STAR[fIdx - 1], ms = IDX_STAR[mIdx - 1];
  const fr = IDX_RASI[fIdx - 1], mr = IDX_RASI[mIdx - 1];
  const k = ((ms - fs + 27) % 27) + 1; // star count from the woman's
  const rc = ((mr - fr + 12) % 12) + 1; // rasi count from the woman's
  const g = [
    rasiP(rc), rasyadhipam(fr, mr), vasyam(fr, mr), mahendram(k), ganam(fs, ms),
    yoni(fs, ms), dinam(k), sthreeDeergham(k, fIdx, mIdx), rajju(fs, ms), vedham(fs, ms),
  ];
  const c8 = g.slice(0, 8).reduce((s, c) => s + pts(c), 0);
  const c10 = c8 + pts(g[8]) + pts(g[9]);
  const rajjuBad = g[8] !== "G", vedhaBad = g[9] !== "G";
  const code = rating(c8, rajjuBad, vedhaBad) + (rajjuBad ? "R" : "N") + (vedhaBad ? "V" : "N");
  return `${g.join("")}-${token(c8)}-${token(c10)}-${code}`;
}

/** All 1296 pairs as rows { _id, Nakshatra }, _id = (fIdx - 1) * 36 + mIdx. */
export function matchTable() {
  const rows = [];
  for (let f = 1; f <= 36; f++) for (let m = 1; m <= 36; m++) rows.push({ _id: (f - 1) * 36 + m, Nakshatra: matchValue(f, m) });
  return rows;
}
