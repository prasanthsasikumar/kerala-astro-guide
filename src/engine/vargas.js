// Varga / divisional calculations for the Horoscope tabs.
// Pure functions over a chart from core.computeChart; testable in Node.
import { ORDER, mod360, dayNum, fromDayNum } from "./core.js";

const int = Math.trunc;
const frac = (x) => x - Math.trunc(x);

// tblBavadhipan (sign -> lord as chart row id), _id 12 duplicates Aries
const BAVADHIPAN = [4, 7, 5, 3, 2, 5, 7, 4, 6, 8, 8, 6, 4];
const lordKey = (sign) => ORDER[BAVADHIPAN[sign] - 1];

// ---------- 1.4 KP sub-lord ----------
export const VIM_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const VIM_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17];
export const NAK_LORD_SHORT = ["ശി", "ശു", "ര", "ച", "കു", "സ", "ഗു", "മ", "ബു"];

/** index into VIM_ORDER of the KP sub-lord of longitude L */
export function subLordIndex(L) {
  if (L >= 360) L -= 360;
  const n = (L * 6) / 80;
  const ni = int(n);
  const arc = (n - ni) * 800;
  let k = ni % 9;
  let acc = 0;
  let cur = k;
  while (arc >= acc) {
    acc += VIM_YEARS[k] * 6.666666666666667;
    cur = k;
    k = (k + 1) % 9;
  }
  return cur;
}
/** { nak: 0..26, lord: VIM index, sub: VIM index } */
export function nakSub(L) {
  const x = L >= 360 ? L - 360 : L;
  const nak = int((x * 6) / 80);
  return { nak, lord: nak % 9, sub: subLordIndex(L) };
}

// ---------- 7. Shadvarga ----------
// Trimsamsa lords (astro.trisamsamodd / trisamsameven), matched Svalue <= x <= Evalue with x = int(deg)+1
const TRIM_ODD = [[0, 5, "Mars"], [6, 10, "Saturn"], [11, 18, "Jupiter"], [19, 25, "Mercury"], [26, 30, "Venus"]];
const TRIM_EVEN = [[0, 5, "Venus"], [6, 12, "Mercury"], [13, 20, "Jupiter"], [21, 25, "Saturn"], [26, 30, "Mars"]];
const trimsamsaLord = (s, x) => (s % 2 === 0 ? TRIM_ODD : TRIM_EVEN).find(([a, b]) => a <= x && x <= b)[2];
const wrap12 = (v) => (v > 12 ? v - 12 : v);

/** lords (planet keys) of the six vargas of one body: {D1, D2, D3, D9, D12, D30} */
export function shadvargaLords(p) {
  const s = p.rasi;
  const deg = p.lon % 30;
  const di = int(p.lon) % 30;
  return {
    D3: di < 10 ? lordKey(s) : di < 20 ? lordKey(wrap12(s + 4)) : lordKey(wrap12(s + 8)),
    D2: s % 2 === 0 ? (di < 15 ? "Sun" : "Moon") : (di >= 15 ? "Sun" : "Moon"),
    D9: lordKey(p.navamsa === 0 ? 12 : p.navamsa),
    D30: trimsamsaLord(s, int(deg) + 1),
    D12: lordKey(wrap12(int(deg / 2.5) + s)),
    D1: lordKey(s),
  };
}
const MALEFIC = new Set(["Sun", "Mars", "Saturn"]);
const BENEFIC = new Set(["Mercury", "Venus", "Jupiter", "Moon"]);
/** "bad" (red), "good" (green) or "mixed" (yellow) row tone.
 *  Each varga's own lord is tested. */
export function shadvargaTone(lords) {
  const L = Object.values(lords);
  const mal = L.filter((k) => MALEFIC.has(k)).length;
  const ben = L.filter((k) => BENEFIC.has(k)).length;
  return mal > 3 ? "bad" : mal < 3 && ben > 3 ? "good" : "mixed";
}
export const SHADVARGA_COLS = ["D3", "D2", "D9", "D30", "D12", "D1"];
export function shadvarga(chart) {
  return ORDER.map((k) => {
    const lords = shadvargaLords(chart.planets[k]);
    return { key: k, lords, tone: shadvargaTone(lords) };
  });
}

// ---------- 11. Parashari varga longitude ----------
export const PARASHARI_D = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60];
export function vargaLon(L, D) {
  L = mod360(L);
  const s = int(int(L) / 30);
  const d = L - s * 30;
  const odd = s % 2 === 0;
  const part = (n) => {
    const x = (d * n) / 30;
    const p = int(x);
    return [p, (x - p) * 30];
  };
  let v;
  switch (D) {
    case 1: v = L; break;
    case 2: { const a = d > 15 ? d - 15 : d; const leo = odd ? d <= 15 : d > 15; v = (leo ? 120 : 90) + a * 2; break; }
    case 3: v = d > 0 && d <= 10 ? s * 30 + d * 3 : d > 10 && d <= 20 ? s * 30 + 120 + (d - 10) * 3 : d > 20 ? s * 30 + 240 + (d - 20) * 3 : L; break;
    case 4: { const p = int(d / 7.5); const r = (d - p * 7.5) * 4; v = s * 30 + [0, 90, 180, 270][p] + r; break; }
    case 7: { const [p, r] = part(7); v = s * 30 + p * 30 + (odd ? 0 : 180) + r; break; }
    case 9: { const [p, r] = part(9); v = s * 30 + p * 30 + [120, 0, 240][(s + 1) % 3] + r; break; }
    case 10: { const [p, r] = part(10); v = s * 30 + p * 30 + (odd ? 0 : 240) + r; break; }
    case 12: { const [p, r] = part(12); v = s * 30 + p * 30 + r; break; }
    case 16: { const [p, r] = part(16); v = p * 30 + [240, 0, 120][(s + 1) % 3] + r; break; }
    case 20: { const [p, r] = part(20); v = p * 30 + [120, 0, 240][(s + 1) % 3] + r; break; }
    case 24: { const [p, r] = part(24); v = p * 30 + (odd ? 120 : 90) + r; break; }
    case 27: { const [p, r] = part(27); v = p * 30 + [270, 0, 90, 180][(s + 1) % 4] + r; break; }
    case 30: {
      const r = (d - int(d)) * 30; // fraction of the integer degree x 30 (kept convention)
      v = odd ? (d < 5 ? 0 : d < 10 ? 300 : d < 18 ? 240 : d < 25 ? 60 : 180) + r
        : (d < 5 ? 30 : d < 12 ? 150 : d < 20 ? 330 : d < 25 ? 270 : 210) + r;
      break;
    }
    case 40: { const [p, r] = part(40); v = p * 30 + (odd ? 0 : 180) + r; break; }
    case 45: { const [p, r] = part(45); v = p * 30 + [240, 0, 120][(s + 1) % 3] + r; break; }
    case 60: { const [p, r] = part(60); v = s * 30 + p * 30 + r; break; }
    default: throw new Error(`unknown varga D-${D}`);
  }
  // exactly 360 wraps to [0, 360)
  return mod360(v);
}

// ---------- 12. Harmonic (parivritti) varga + mrityubhaga ----------
export const harmonicLon = (L, N) => frac((L * N) / 360) * 360;
// MB[sign][body], body in chart row order (Lagna, Sun..Saturn, Rahu, Ketu, Mandi); = astro.tblMrituBag
export const MRITYUBHAGA = [
  [1, 20, 26, 19, 15, 19, 28, 10, 14, 8, 23],
  [9, 9, 12, 18, 14, 29, 15, 4, 13, 18, 24],
  [21, 12, 13, 25, 13, 12, 11, 7, 12, 20, 11],
  [22, 6, 25, 23, 12, 27, 17, 9, 11, 12, 12],
  [25, 8, 24, 29, 8, 6, 10, 12, 24, 21, 13],
  [2, 24, 11, 28, 18, 4, 23, 16, 23, 22, 14],
  [4, 16, 26, 14, 20, 23, 4, 3, 22, 23, 8],
  [23, 17, 14, 21, 10, 10, 6, 18, 21, 24, 18],
  [18, 22, 13, 2, 21, 17, 27, 28, 12, 11, 22],
  [20, 2, 25, 15, 22, 11, 12, 14, 20, 12, 12],
  [24, 3, 5, 11, 7, 15, 29, 13, 18, 13, 21],
  [10, 23, 12, 6, 5, 28, 19, 15, 8, 14, 22],
];
export const inMrityubhaga = (v, bodyIdx) => MRITYUBHAGA[int(v / 30) % 12][bodyIdx] === Math.ceil(frac(v / 30) * 30);

export const HARMONIC_NAME = {
  1: "രാശി (D-1)", 2: "ഹോര (D-2)", 3: "ദ്രേക്കാണം (D-3)", 4: "ചതുര്‍ത്ഥാംശം (D-4)", 5: "പഞ്ചമാംശം (D-5)",
  6: "ഷഷ്ഠാംശം (D-6)", 7: "സപ്താംശം (D-7)", 8: "അഷ്ടാംശം (D-8)", 9: "നവാംശം (D-9)", 10: "ദശാംശം (D-10)",
  11: "ഏകാദശാംശം (D-11)", 12: "ദ്വാദശാംശം (D-12)", 16: "ഷോഡശാംശം (D-16)", 20: "വിംശാംശം (D-20)",
  24: "സിദ്ധാംശം (D-24)", 27: "നക്ഷത്രാംശം (D-27)", 30: "ത്രിംശാംശം  (D-30)", 40: "ഖവേദാംശം  (D-40)",
  45: "അക്ഷവേദാംശം  (D-45)", 60: "ഷഷ്ട്യംശം  (D-60)", 81: "നവനവാംശം  (D-81)", 108: "അഷ്ടോത്തരാംശം (D-108)",
  144: "ദ്വാദശദ്വാദശാംശം  (D-144)",
};
export const harmonicName = (N) => HARMONIC_NAME[N] || `D-${N}`;

/** rows for the 11 bodies: { key, lon (varga longitude), sign, mb } */
export function harmonicChart(chart, N) {
  return ORDER.map((k, i) => {
    const v = harmonicLon(chart.planets[k].lon, N);
    return { key: k, lon: v, sign: int(v / 30) % 12, mb: inMrityubhaga(v, i) };
  });
}
export function parashariChart(chart, D) {
  return ORDER.map((k) => {
    const v = vargaLon(chart.planets[k].lon, D);
    return { key: k, lon: v, sign: int(v / 30) % 12 };
  });
}

// ---------- 10. Kalachakra dasa ----------
const ymd = (n) => fromDayNum(n);
function addYears(n, k) {
  const { y, m, d } = ymd(n);
  // adding whole years: Feb 29 -> Feb 28 in a common year
  const last = new Date(Date.UTC(y + k, m, 0)).getUTCDate();
  return dayNum(y + k, m, Math.min(d, last));
}
/**
 * yogam.tblKalachakra (parasari = true) or tblKalachakraresearch. Returns
 * { nak (1..27), pada (1..4), row, periods: [{sign 1..12, yrs "07", start, end (day numbers), ageY, ageM}], balance {y,m,d} }
 */
export function kalachakra(yogam, chart, parasari = true) {
  const table = parasari ? yogam.tblKalachakra : yogam.tblKalachakraresearch;
  const yearLen = chart.settings.yearLength;
  const d2 = (chart.planets.Moon.lon * 6) / 80;
  const nak = int(d2) + 1;
  const d3 = (d2 - int(d2)) * 4;
  const pada = int(d3) + 1;
  const remArc = (pada - d3) * 200;
  const row = table.find((r) => +r.Nak === nak && +r.Pada === pada);
  const birthN = dayNum(chart.date.y, chart.date.m, chart.date.d);
  const periods = [];
  let prev = birthN;
  let firstDays = 0;
  for (let k = 1; k <= 9; k++) {
    const [s, y] = String(row[String(k)]).split(":");
    let end;
    if (k === 1) {
      firstDays = int(yearLen * ((Number(y) / 200) * remArc));
      end = birthN + firstDays;
    } else end = addYears(prev, parseInt(y, 10));
    const x = (end - birthN) / yearLen;
    periods.push({ sign: parseInt(s, 10), yrs: y, start: prev, end, ageY: int(x), ageM: int(frac(x) * 12) });
    prev = end;
  }
  const x = firstDays / yearLen;
  const mf = frac(x) * 12;
  return {
    nak, pada, row, periods,
    balance: { y: int(x), m: int(mf), d: int(frac(mf) * 30) },
    deha: +row.Deha, jeeva: +row.Jeeva, amsa: +row.Amsa, longevity: row.Longevity, savya: +row.Chakra === 0,
  };
}

// ---------- 13. KP ruling planets ----------
// sign lord as planet key, KP tab wording (Sun = രവി)
export function kpRulingPlanets(chart) {
  const P = chart.planets;
  const L = nakSub(P.Lagna.lon);
  const M = nakSub(P.Moon.lon);
  return {
    lagnaNak: L.nak, lagnaNakLord: VIM_ORDER[L.lord], lagnaSignLord: lordKey(P.Lagna.rasi),
    moonNak: M.nak, moonNakLord: VIM_ORDER[M.lord], moonSignLord: lordKey(P.Moon.rasi),
    // uses the configured sunrise (chart.time)
    dayLord: chart.time.weekdayLord,
    lagnaSub: VIM_ORDER[L.sub], moonSub: VIM_ORDER[M.sub],
  };
}
