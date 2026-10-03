// Lazy loaders for the reference data.
// Full edition: /data/astro.json + /data/yogam.json. Public edition: /open/reference.json.
import { PUBLIC } from "./edition.js";
import { openData } from "./open-data.js";

const cache = new Map();
function load(name) {
  if (!cache.has(name)) {
    cache.set(name, fetch(`/data/${name}.json`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${name}: ${r.status}`);
      return r.json();
    }));
  }
  return cache.get(name);
}
let openCache;
const open = () => (openCache ??= fetch("/open/reference.json").then((r) => {
  if (!r.ok) throw new Error(`Failed to load reference data: ${r.status}`);
  return r.json();
}).then(openData));
export const astroDB = () => (PUBLIC ? open().then((o) => o.db) : load("astro"));
export const yogamDB = () => (PUBLIC ? open().then((o) => o.yogam) : load("yogam"));

// [country, state, city, lat, lon, tz, tzName?, aliases?][]
let placesCache;
export function placesDB() {
  if (!placesCache) {
    placesCache = PUBLIC
      ? fetch("/open/places.json").then((r) => r.json()).then((d) => d.places.map((p) => [p[2], p[1], p[0], p[3], p[4], null, d.tz[p[5]], p[6] || ""]))
      : load("places");
  }
  return placesCache;
}

export async function searchPlaces(q, limit = 30) {
  const places = await placesDB();
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const starts = [];
  const contains = [];
  for (const p of places) {
    const city = p[2].toLowerCase();
    const alias = p[7] ? p[7].toLowerCase() : "";
    if (city.startsWith(s) || (alias && ("|" + alias).includes("|" + s))) starts.push(p);
    else if (contains.length < limit && (city.includes(s) || p[1].toLowerCase().startsWith(s))) contains.push(p);
    if (starts.length >= limit) break;
  }
  // Kerala first, then the rest of India
  const rank = (p) => (p[1] === "Kerala" ? 0 : p[0] === "India" ? 1 : 2);
  return [...starts.sort((a, b) => rank(a) - rank(b)), ...contains].slice(0, limit);
}

export const placeLabel = (p) => [p[2], p[1], p[0]].filter(Boolean).join(", ");
