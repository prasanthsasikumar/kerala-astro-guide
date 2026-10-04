// Saves one call (who was asked about, birth details, transcript) as a private blob.
// POST { id, sig, person, lang, startedAt, durationSec, transcript: [{ r: "u" | "a", t, at }], end }
// The same id can be written again as the call goes on; the latest write wins.
import { put } from "@vercel/blob";
import { verify, json } from "./_lib/session.js";

const MAX_BYTES = 300_000;

function geo(hd) {
  const g = (k) => {
    const v = hd.get(k);
    try { return v ? decodeURIComponent(v) : ""; } catch { return v || ""; }
  };
  const lat = parseFloat(g("x-vercel-ip-latitude"));
  const lon = parseFloat(g("x-vercel-ip-longitude"));
  return {
    city: g("x-vercel-ip-city"), region: g("x-vercel-ip-country-region"), country: g("x-vercel-ip-country"),
    timezone: g("x-vercel-ip-timezone"),
    // rounded to about 10 km so it stays area-level
    lat: Number.isFinite(lat) ? Math.round(lat * 10) / 10 : null, lon: Number.isFinite(lon) ? Math.round(lon * 10) / 10 : null,
  };
}

export async function handle(request, env = process.env) {
  if (request.method !== "POST") return json(405, { error: "POST only" });
  const raw = await request.text();
  if (raw.length > MAX_BYTES) return json(413, { error: "too large" });
  let b;
  try {
    b = JSON.parse(raw);
  } catch {
    return json(400, { error: "bad request" });
  }
  if (!verify(b.id, b.sig, env.LOG_SECRET)) return json(403, { error: "bad session" });
  if (!env.BLOB_READ_WRITE_TOKEN) return json(503, { error: "storage not configured" });
  const str = (v, n = 200) => String(v ?? "").slice(0, n);
  const p = b.person || {};
  const record = {
    id: b.id,
    savedAt: new Date().toISOString(),
    startedAt: str(b.startedAt, 40),
    durationSec: Math.max(0, Math.min(24 * 3600, +b.durationSec || 0)),
    ended: !!b.end,
    lang: b.lang === "en" ? "en" : "ml",
    person: {
      name: str(p.name), gender: str(p.gender, 10), date: str(p.date, 10), time: str(p.time, 5), timeUnknown: !!p.timeUnknown,
      place: { name: str(p.place?.name), lat: +p.place?.lat || null, lon: +p.place?.lon || null, tz: +p.place?.tz },
    },
    star: str(b.star, 60),
    // optional: the caller's own number, for an SMS summary (and later sign-in)
    caller: { phone: /^\+?\d{7,15}$/.test(String(b.caller?.phone || "")) ? String(b.caller.phone) : "", whatsappOptIn: !!b.caller?.whatsappOptIn },
    summary: str(b.summary, 2000),
    transcript: (Array.isArray(b.transcript) ? b.transcript : []).slice(0, 2000).map((x) => ({ r: x.r === "u" ? "u" : "a", t: str(x.t, 4000), at: +x.at || 0 })),
    device: str(request.headers.get("user-agent"), 200),
    // approximate location from Vercel's edge (city level); the IP address itself is not stored
    location: geo(request.headers),
  };
  await put(`calls/${b.id.slice(0, 10)}/${b.id}.json`, JSON.stringify(record), {
    access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", token: env.BLOB_READ_WRITE_TOKEN,
  });
  return json(200, { ok: true });
}

export function POST(request) {
  return handle(request);
}
