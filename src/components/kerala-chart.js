// Kerala (South Indian) square chart: 4x4 grid, signs fixed, Meenam top-left, running clockwise.
import { h } from "../lib/dom.js";

// grid [row, col] for sign index 0 = Medam .. 11 = Meenam
const CELL = [
  [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3],
  [3, 2], [3, 1], [3, 0], [2, 0], [1, 0], [0, 0],
];

/**
 * @param {Array<string[]>} cells - 12 arrays of short labels (one per sign, 0 = Medam)
 * @param {object} opts - { title, center, mark: Set<number> of sign indexes to highlight (e.g. lagna) }
 */
export function keralaChart(cells, { title = "", center = null, mark = new Set(), size = 360 } = {}) {
  const grid = h("div.kchart", { role: "img", "aria-label": title, style: { "--kchart-size": `${size}px` } });
  for (let s = 0; s < 12; s++) {
    const [r, c] = CELL[s];
    grid.append(h("div.kchart-cell", {
      style: { gridRow: r + 1, gridColumn: c + 1 },
      class: mark.has(s) ? "is-marked" : "",
    }, (cells[s] || []).map((x) => (x instanceof Node ? x : h("span", x)))));
  }
  grid.append(h("div.kchart-center", { style: { gridRow: "2 / 4", gridColumn: "2 / 4" } }, center ?? title));
  return grid;
}
