// Blind test (Carlson-style): two short readings, one from the person's real chart and one from a
// random decoy chart, written the same way. Returned in random order with a sealed ticket that says
// which one is real; api/survey.js opens it when the answer comes in.
// POST { lang, real: "<chart facts>", decoy: "<chart facts>" } -> { a, b, ticket }
import { randomInt, randomUUID } from "node:crypto";
import { seal } from "./_lib/seal.js";
import { json } from "./_lib/session.js";

const MODEL = process.env.SUMMARY_MODEL || "gemini-flash-latest";
const LANG_NAME = { ml: "Malayalam", en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu", kn: "Kannada" };
const hits = new Map();

async function reading(env, facts, lang) {
  const prompt = `You are an experienced Kerala astrologer. From the birth chart facts below, describe this person's character and the main themes of their life in 70 to 90 words of simple ${LANG_NAME[lang]} (${LANG_NAME[lang]} script), speaking to them as "you".
Rules: no names, no numbers, no dates, no ages, and do not mention signs, stars, planets, houses or any astrology words. Be specific to this chart rather than generic, and include one or two mild challenges as well as strengths. Plain text, one paragraph.

Chart facts:
${facts}`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 512 } } }),
  });
  const d = await res.json().catch(() => ({}));
  const cand = d.candidates?.[0];
  const text = cand?.content?.parts?.filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
  if (!res.ok || !text || cand?.finishReason === "MAX_TOKENS") throw new Error("generation failed");
  return text;
}

export async function handle(request, env = process.env) {
  if (request.method !== "POST") return json(405, { error: "POST only" });
  if (!env.GEMINI_API_KEY) return json(503, { error: "not configured" });
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (recent.length >= 10) return json(429, { error: "too many" });
  hits.set(ip, [...recent, now]);
  let b;
  try {
    b = JSON.parse((await request.text()).slice(0, 20000));
  } catch {
    return json(400, { error: "bad request" });
  }
  const lang = LANG_NAME[b.lang] ? b.lang : "en";
  const real = String(b.real || "").slice(0, 5000);
  const decoy = String(b.decoy || "").slice(0, 5000);
  if (!real || !decoy) return json(400, { error: "bad request" });
  try {
    const [r, d] = await Promise.all([reading(env, real, lang), reading(env, decoy, lang)]);
    const realIs = randomInt(2) === 0 ? "a" : "b";
    const ticket = seal({ id: randomUUID(), realIs, t: now }, env.LOG_SECRET);
    return json(200, realIs === "a" ? { a: r, b: d, ticket } : { a: d, b: r, ticket });
  } catch (e) {
    console.error("blindtest", e?.message);
    return json(502, { error: "unavailable" });
  }
}

export function POST(request) {
  return handle(request);
}
