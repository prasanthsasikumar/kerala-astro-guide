// People = saved birth details. Choosing a person comes first; re-typing is the exception.
import { listCharts, saveChart, getUI, setUI } from "./store.js";
import { inputToQuery } from "./ctx.js";
import { computeChart } from "../engine/core.js";

export const people = () => listCharts();
export const initialOf = (name) => (name || "?").trim().charAt(0).toUpperCase();
export const personQuery = (p) => inputToQuery(p) + (p.timeUnknown ? "&tu=1" : "");
export const hrefFor = (p, target = "horoscope") => `#/${target}?` + personQuery(p);

export function rememberPerson(p) {
  if (p?.id) setUI({ lastPerson: p.id });
}
export function lastPerson() {
  const all = people();
  return all.find((p) => p.id === getUI().lastPerson) || all[0] || null;
}

// birth star (1..27) stored on the person so chips can show it without recomputing
export function starOf(ctx, p) {
  if (p.star) return p.star;
  try {
    const c = computeChart(ctx.swe, ctx.db, ctx.settings, p);
    const star = c.time.nakIdx;
    if (p.id) saveChart({ ...p, star });
    return star;
  } catch {
    return null;
  }
}
