// Chart-tab derivations.
import { ORDER } from "./core.js";

// chart row ids 1..11 = ORDER; sign lords as chart row ids
export const LORD_ID = [4, 7, 5, 3, 2, 5, 7, 4, 6, 8, 8, 6];
export const lordName = (sign) => ORDER[LORD_ID[sign] - 1];

// 12 cells of planet keys, by sign
export function cellsBy(chart, signOf) {
  const cells = Array.from({ length: 12 }, () => []);
  for (const k of ORDER) cells[signOf(k)].push(k);
  return cells;
}

// house number (1..12) of each body by bhava sandhis
export function bhavaOf(chart) {
  const out = {};
  for (const h of chart.bhava) for (const p of h.planets) out[p] = h.k;
  return out;
}

// 4.3: Lagna stays in its rasi, others drawn at (bhava + lagnaSign - 1) % 12
export function bhavaChartSign(chart) {
  const b = bhavaOf(chart);
  const lagnaSign = chart.planets.Lagna.rasi;
  return (k) => (k === "Lagna" ? lagnaSign : (b[k] + lagnaSign - 1) % 12);
}

// 4.4 Bhavabala heuristic (per sign index, Kerala convention)
const DIGNITY = { 2: [0, 4], 3: [1, 3], 4: [0, 7, 9], 5: [2, 5], 6: [3, 8, 11], 7: [1, 6, 11], 8: [6, 9, 11] };
const OWN_ASPECT = [[0, 5, 6, 9], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11], [0, 6], [0, 1, 4, 7], [0, 2, 4, 8], [0, 3, 7, 9], [1, 4, 8, 10], [3, 5, 7, 11]];
export function bhavabala(chart) {
  const g = (id) => chart.planets[ORDER[id - 1]].rasi;
  const nav = (id) => chart.planets[ORDER[id - 1]].navamsa;
  const rel = (i, n) => {
    let v = i + n - 1;
    if (v > 12) v -= 12;
    return v;
  };
  return Array.from({ length: 12 }, (_, i) => {
    const lord = LORD_ID[i];
    let v = 0;
    if ([i, rel(i, 5), rel(i, 7), rel(i, 9)].includes(g(6))) v += 1;
    if ([i, rel(i, 7)].includes(g(5))) v += 1;
    if ([rel(i, 3), rel(i, 6), rel(i, 10), rel(i, 11)].includes(g(lord))) v += 1;
    v += [3, 6, 7, 9, 11].includes(i + 1) ? 1 : i + 1 === 8 ? 0.25 : 0.5;
    if (DIGNITY[lord].includes(g(lord))) v += 1;
    if (OWN_ASPECT[i].includes(g(lord))) v += 1;
    if (g(lord) === nav(lord)) v += 1;
    return v;
  });
}

// calendar difference (years, months, days) between two day numbers
export function period(fromN, toN) {
  const a = new Date(fromN * 864e5);
  const b = new Date(toN * 864e5);
  let y = b.getUTCFullYear() - a.getUTCFullYear();
  let m = b.getUTCMonth() - a.getUTCMonth();
  let d = b.getUTCDate() - a.getUTCDate();
  if (d < 0) {
    m -= 1;
    d += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate();
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  return { y, m, d };
}
