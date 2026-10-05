// Study answers: the multiple-choice questions plus the blind-test pick. Anonymous: no name or birth
// details, only birth year and gender for analysis, plus approximate location and device type.
// POST { answers: { q1..q9 }, blind: { ticket, choice: "a" | "b" | "both" | "neither" }, lang, birthYear, gender }
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { unseal } from "./_lib/seal.js";
import { json } from "./_lib/session.js";

// Must match the option ids in src/modules/study.js (Q). Every question is required.
const OPTIONS = {
  q1: ["self", "parent", "grandparent", "other"], q2: ["u30", "30-49", "50-64", "65p"], q3: ["strong", "some", "unsure", "none"],
  q4: ["call", "chart", "both", "neither"], q5: ["very", "somewhat", "little", "none"], q6: ["most", "some", "none", "unchecked"],
  q7: ["very", "somewhat", "little", "nocall"], q8: ["easy", "ok", "hard", "nocall"], q9: ["yes", "maybe", "no"],
};
const hits = new Map(); // per-instance rate limit, like live-token.js

function geo(hd) {
  const g = (k) => { const v = hd.get(k); try { return v ? decodeURIComponent(v) : ""; } catch { return v || ""; } };
  return { city: g("x-vercel-ip-city"), region: g("x-vercel-ip-country-region"), country: g("x-vercel-ip-country") };
}

export async function handle(request, env = process.env) {
  if (request.method !== "POST") return json(405, { error: "POST only" });
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
  const now0 = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now0 - t < 3600e3);
  if (recent.length >= 5) return json(429, { error: "too many" });
  let b;
  try {
    b = JSON.parse((await request.text()).slice(0, 20000));
  } catch {
    return json(400, { error: "bad request" });
  }
  const answers = {};
  for (const [k, opts] of Object.entries(OPTIONS)) {
    const v = b.answers?.[k];
    if (!opts.includes(v)) return json(400, { error: "bad request" });
    answers[k] = v;
  }
  hits.set(ip, [...recent, now0]);
  let blind = null;
  const t = b.blind?.ticket ? unseal(b.blind.ticket, env.LOG_SECRET) : null;
  if (t && Date.now() - t.t < 6 * 3600e3 && ["a", "b", "both", "neither"].includes(b.blind.choice)) {
    blind = { choice: b.blind.choice, realIs: t.realIs, pickedReal: b.blind.choice === t.realIs, ticketId: t.id };
  }
  const now = new Date();
  // a blind-test ticket counts once: its id names the record, and a second save with it is refused
  const id = new Date(blind ? t.t : now).toISOString().slice(0, 10) + "_" + (blind?.ticketId || randomUUID());
  const record = {
    id, savedAt: now.toISOString(),
    lang: ["ml", "en", "hi", "ta", "te", "kn"].includes(b.lang) ? b.lang : "ml",
    birthYear: Number.isInteger(+b.birthYear) && +b.birthYear > 1900 && +b.birthYear < 2030 ? +b.birthYear : null,
    gender: ["Female", "F"].includes(b.gender) ? "F" : ["Male", "M"].includes(b.gender) ? "M" : null,
    answers, blind,
    location: geo(request.headers),
    device: String(request.headers.get("user-agent") || "").slice(0, 200),
  };
  if (env.BLOB_READ_WRITE_TOKEN) {
    try {
      await put(`survey/${id.slice(0, 10)}/${id}.json`, JSON.stringify(record), { access: "private", addRandomSuffix: false, allowOverwrite: false, contentType: "application/json", token: env.BLOB_READ_WRITE_TOKEN });
    } catch (e) {
      if (/exist/i.test(e?.message || "")) return json(409, { error: "already answered" });
      console.error("survey save failed", e?.message);
      return json(502, { error: "unavailable" });
    }
  }
  return json(200, { ok: true, realIs: blind?.realIs || null });
}

export function POST(request) {
  return handle(request);
}
