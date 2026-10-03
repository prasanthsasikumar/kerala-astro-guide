// Shared runtime context: Swiss Ephemeris + reference DBs, loaded once.
import { getSwe } from "./swe.js";
import { astroDB, yogamDB } from "./data.js";
import { getSettings } from "./store.js";

let ctx;
export function getCtx() {
  if (!ctx) ctx = Promise.all([getSwe(), astroDB(), yogamDB()]).then(([swe, db, yogam]) => ({ swe, db, yogam }));
  return ctx.then((c) => ({ ...c, settings: getSettings() }));
}

// Birth/query input <-> URL query (so a computed chart survives reload and can be bookmarked)
export function inputToQuery(i) {
  const q = new URLSearchParams({ n: i.name || "", g: i.gender === "Female" ? "F" : "M", d: i.date, t: i.time, p: i.place.name || "", la: i.place.lat, lo: i.place.lon, tz: i.place.tz });
  if (i.id) q.set("id", i.id);
  return q.toString();
}
export function queryToInput(p) {
  if (!p.d || !p.t || p.la == null) return null;
  return {
    id: p.id, name: p.n || "", gender: p.g === "F" ? "Female" : "Male", date: p.d, time: p.t,
    place: { name: p.p || "", lat: +p.la, lon: +p.lo, tz: +p.tz },
  };
}
