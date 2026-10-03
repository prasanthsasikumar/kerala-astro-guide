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

// ---- OpenStreetMap search (Photon, komoot.io): villages and places missing from the built-in list ----
// Results use the same row shape as the built-in list: [country, state, city, lat, lon, tz, tzName, aliases, district].
const PLACE_TYPES = new Set(["city", "town", "village", "hamlet", "suburb", "neighbourhood", "locality", "quarter", "isolated_dwelling", "municipality", "county", "district"]);
function photonRow(f) {
  const p = f.properties || {};
  const [lon, lat] = f.geometry?.coordinates || [];
  return [p.country || "", p.state || "", p.name || "", lat, lon, null, null, "", p.county || p.city || ""];
}
export async function searchPlacesOnline(q, { limit = 8, signal } = {}) {
  const s = q.trim();
  if (s.length < 3) return [];
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", s);
  url.searchParams.set("limit", String(limit * 2));
  url.searchParams.set("lang", "en");
  url.searchParams.set("lat", "10.5"); // bias towards Kerala
  url.searchParams.set("lon", "76.3");
  url.searchParams.append("osm_tag", "place");
  try {
    const r = await fetch(url, { signal });
    if (!r.ok) return [];
    const d = await r.json();
    const rows = d.features.filter((f) => PLACE_TYPES.has(f.properties?.osm_value)).map(photonRow).filter((p) => Number.isFinite(p[3]));
    // keep real name matches; fall back to fuzzy hits (typos) only when nothing matches
    const norm = (x) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const want = norm(s).split(/[\s,]+/)[0];
    const exact = rows.filter((p) => norm(p[2]).includes(want));
    return (exact.length ? exact : rows.slice(0, 3)).slice(0, limit);
  } catch {
    return [];
  }
}
export async function reverseGeocode(lat, lon) {
  try {
    const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=en&limit=1`);
    const f = (await r.json()).features?.[0];
    return f ? photonRow(f) : null;
  } catch {
    return null;
  }
}

// Time zone for arbitrary coordinates: take it from the nearest place in the built-in list.
export async function nearestZone(lat, lon) {
  const places = await placesDB();
  let best = null;
  let bestD = Infinity;
  const cl = Math.cos((lat * Math.PI) / 180);
  for (const p of places) {
    const d = (p[3] - lat) ** 2 + ((p[4] - lon) * cl) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best ? { tz: best[5], tzName: best[6] || undefined } : { tz: Math.round(lon / 15 * 2) / 2 };
}
