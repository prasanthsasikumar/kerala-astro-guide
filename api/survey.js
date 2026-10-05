// Study answers: the multiple-choice questions plus the blind-test pick. Anonymous: no name or birth
// details, only birth year and gender for analysis, plus approximate location and device type.
// POST { answers: { q1..q9 }, blind: { ticket, choice: "a" | "b" | "both" | "neither" }, lang, birthYear, gender }
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { unseal } from "./_lib/seal.js";
import { json } from "./_lib/session.js";

const OPTION = /^[a-z0-9_-]{1,24}$/;

function geo(hd) {
  const g = (k) => { const v = hd.get(k); try { return v ? decodeURIComponent(v) : ""; } catch { return v || ""; } };
  return { city: g("x-vercel-ip-city"), region: g("x-vercel-ip-country-region"), country: g("x-vercel-ip-country") };
}

export async function handle(request, env = process.env) {
  if (request.method !== "POST") return json(405, { error: "POST only" });
  let b;
  try {
    b = JSON.parse((await request.text()).slice(0, 20000));
  } catch {
    return json(400, { error: "bad request" });
  }
  const answers = {};
  for (const [k, v] of Object.entries(b.answers || {})) if (/^q\d{1,2}$/.test(k) && OPTION.test(String(v))) answers[k] = String(v);
  let blind = null;
  const t = b.blind?.ticket ? unseal(b.blind.ticket, env.LOG_SECRET) : null;
  if (t && Date.now() - t.t < 6 * 3600e3 && ["a", "b", "both", "neither"].includes(b.blind.choice)) {
    blind = { choice: b.blind.choice, realIs: t.realIs, pickedReal: b.blind.choice === t.realIs, ticketId: t.id };
  }
  const now = new Date();
  const id = now.toISOString().slice(0, 10) + "_" + randomUUID();
  const record = {
    id, savedAt: now.toISOString(),
    lang: ["ml", "en", "hi", "ta", "te", "kn"].includes(b.lang) ? b.lang : "ml",
    birthYear: Number.isInteger(+b.birthYear) && +b.birthYear > 1900 && +b.birthYear < 2030 ? +b.birthYear : null,
    gender: b.gender === "Female" ? "F" : b.gender === "Male" ? "M" : null,
    answers, blind,
    location: geo(request.headers),
    device: String(request.headers.get("user-agent") || "").slice(0, 200),
  };
  if (env.BLOB_READ_WRITE_TOKEN) {
    await put(`survey/${id.slice(0, 10)}/${id}.json`, JSON.stringify(record), { access: "private", addRandomSuffix: false, contentType: "application/json", token: env.BLOB_READ_WRITE_TOKEN });
  }
  return json(200, { ok: true, realIs: blind?.realIs || null });
}

export function POST(request) {
  return handle(request);
}
