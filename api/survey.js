// Study answers, saved as people go (a half-finished study still counts).
// POST { op: "start" } -> { study }: a sealed study id, rate-limited per IP.
// POST { study, answers: { q1..q9, any subset }, blind?: { ticket, choice: "a" | "b" | "both" | "neither" },
//        done?, lang, birthYear, gender } -> { ok, realIs } : (over)writes that study's record.
// Anonymous: no name or birth details, only birth year and gender, plus approximate location and device type.
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { seal, unseal } from "./_lib/seal.js";
import { json } from "./_lib/session.js";

// Must match the option ids in src/modules/study.js (Q).
const OPTIONS = {
  q1: ["self", "parent", "grandparent", "other"], q2: ["u30", "30-49", "50-64", "65p"], q3: ["strong", "some", "unsure", "none"],
  q4: ["call", "chart", "both", "neither"], q5: ["very", "somewhat", "little", "none"], q6: ["most", "some", "none", "unchecked"],
  q7: ["very", "somewhat", "little", "nocall"], q8: ["easy", "ok", "hard", "nocall"], q9: ["yes", "maybe", "no"],
};
const MAX_AGE = 6 * 3600e3;
// per-instance rate limits, like live-token.js
const starts = new Map();
const saves = new Map();
const limited = (map, ip, max) => {
  const now = Date.now();
  const recent = (map.get(ip) || []).filter((t) => now - t < 3600e3);
  if (recent.length >= max) return true;
  map.set(ip, [...recent, now]);
  return false;
};

function geo(hd) {
  const g = (k) => { const v = hd.get(k); try { return v ? decodeURIComponent(v) : ""; } catch { return v || ""; } };
  return { city: g("x-vercel-ip-city"), region: g("x-vercel-ip-country-region"), country: g("x-vercel-ip-country") };
}

export async function handle(request, env = process.env) {
  if (request.method !== "POST") return json(405, { error: "POST only" });
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
  let b;
  try {
    b = JSON.parse((await request.text()).slice(0, 20000));
  } catch {
    return json(400, { error: "bad request" });
  }

  if (b.op === "start") {
    if (limited(starts, ip, 10)) return json(429, { error: "too many" });
    return json(200, { study: seal({ k: "study", sid: randomUUID(), t: Date.now() }, env.LOG_SECRET) });
  }

  const s = b.study ? unseal(b.study, env.LOG_SECRET) : null;
  if (s?.k !== "study" || Date.now() - s.t > MAX_AGE) return json(400, { error: "bad request" });
  if (limited(saves, ip, 120)) return json(429, { error: "too many" });
  const answers = {};
  for (const [k, opts] of Object.entries(OPTIONS)) if (opts.includes(b.answers?.[k])) answers[k] = b.answers[k];
  let blind = null;
  const t = b.blind?.ticket ? unseal(b.blind.ticket, env.LOG_SECRET) : null;
  if (t?.realIs && Date.now() - t.t < MAX_AGE && ["a", "b", "both", "neither"].includes(b.blind.choice)) {
    blind = { choice: b.blind.choice, realIs: t.realIs, pickedReal: b.blind.choice === t.realIs, ticketId: t.id };
  }
  const id = new Date(s.t).toISOString().slice(0, 10) + "_" + s.sid;
  const record = {
    id, startedAt: new Date(s.t).toISOString(), savedAt: new Date().toISOString(),
    complete: !!b.done, answered: Object.keys(answers).length,
    lang: ["ml", "en", "hi", "ta", "te", "kn"].includes(b.lang) ? b.lang : "en",
    birthYear: Number.isInteger(+b.birthYear) && +b.birthYear > 1900 && +b.birthYear < 2030 ? +b.birthYear : null,
    gender: ["Female", "F"].includes(b.gender) ? "F" : ["Male", "M"].includes(b.gender) ? "M" : null,
    answers, blind,
    location: geo(request.headers),
    device: String(request.headers.get("user-agent") || "").slice(0, 200),
  };
  if (env.BLOB_READ_WRITE_TOKEN) {
    try {
      await put(`survey/${id.slice(0, 10)}/${id}.json`, JSON.stringify(record), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", token: env.BLOB_READ_WRITE_TOKEN });
    } catch (e) {
      console.error("survey save failed", e?.message);
      return json(502, { error: "unavailable" });
    }
  }
  return json(200, { ok: true, realIs: blind?.realIs || null });
}

export function POST(request) {
  return handle(request);
}
