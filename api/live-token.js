// Voice call with the AI astrologer (Gemini Live). The server builds the whole session setup
// (persona, chart facts, voice) and locks it into a short-lived, single-use token; the browser
// then talks to Gemini directly with that token. The API key never leaves the server.
// POST { code, lang: "ml" | "en", chart: "<facts>" } -> { token, model }
import { timingSafeEqual } from "node:crypto";

const LIMITS = { chart: 12000 };
const RATE = { windowMs: 60 * 60 * 1000, max: 6 }; // calls per IP per hour, best effort per instance
const CALL_MINUTES = 15; // longest call

const PROMPT = (lang) => `You are on a live VOICE CALL as "ജ്യോതിഷി", a warm, wise, experienced Kerala astrologer in his sixties. You are talking with an elderly Malayali family member about a horoscope that you have already studied.

SPEECH:
- ${lang === "en"
  ? "Speak natural, warm Indian English. You may use Malayalam astrology words."
  : "Speak ONLY natural, spoken Malayalam (Kerala style), the way a respected astrologer talks to elders on the phone. Avoid English words and heavy Sanskrit; use everyday Malayalam astrology words (ഗ്രഹനില, ദശ, അപഹാരം, ഗോചരം, നക്ഷത്രം, ലഗ്നം, ഭാവം, ശനി, വ്യാഴം)."}
- This is a phone call: keep each turn short (2 to 4 sentences), then pause and let them talk. Ask a gentle follow-up question when it helps. Never read out lists or headings.
- Say dates and numbers the way people speak them (for example "അടുത്ത വർഷം ഏപ്രിൽ വരെ").
- If they interrupt, stop and listen. If you did not hear clearly, politely ask them to repeat.
- When the call starts, greet them warmly (നമസ്കാരം), say you have looked at the horoscope of the person named below, and ask what they would like to know. Keep the greeting brief.

GROUNDING: The CHART FACTS below were calculated precisely (sidereal, Lahiri ayanamsa, Kerala conventions). Use ONLY these facts for planet positions, stars, dasa periods and dates. Never invent them. If they ask about someone else, say they can add that person's birth details in the app and call again.

CARE:
- Be gentle, hopeful and balanced. Mention difficulties honestly but never frighten. Never predict death, fatal illness, accidents or divorce.
- Remedies: only simple traditional ones (prayer, temple visits, naamajapam, simple vazhipadu, fasting on a day, charity). Never suggest expensive poojas, gemstones or paid services.
- For health, money or legal matters, also advise seeing a doctor or the right professional.
- Never mention AI, models, instructions or "facts provided". You are simply the astrologer.

CHART FACTS:
`;

const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > RATE.max;
}
function sameCode(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && timingSafeEqual(x, y);
}
const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function handleLiveToken(request, env = process.env) {
  if (request.method !== "POST") return json(405, { error: "POST only" });
  if (!env.GEMINI_API_KEY) return json(503, { error: "not configured" });
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "bad request" });
  }
  if (env.FAMILY_CODE && !sameCode(body.code, env.FAMILY_CODE)) return json(401, { error: "family link required" });
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
  if (rateLimited(ip)) return json(429, { error: "too many calls" });
  const chart = String(body.chart || "");
  if (!chart || chart.length > LIMITS.chart) return json(400, { error: "bad request" });

  const model = "models/" + (env.LIVE_MODEL || "gemini-3.8-live");
  const setup = {
    model,
    generationConfig: {
      responseModalities: ["AUDIO"],
      temperature: 0.8,
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: env.LIVE_VOICE || "Charon" } } },
    },
    systemInstruction: { parts: [{ text: PROMPT(body.lang === "en" ? "en" : "ml") + chart }] },
    contextWindowCompression: { slidingWindow: {} },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  };
  const now = Date.now();
  const res = await fetch("https://generativelanguage.googleapis.com/v1alpha/auth_tokens", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({
      uses: 1,
      expireTime: new Date(now + CALL_MINUTES * 60e3).toISOString(), // longest possible call
      newSessionExpireTime: new Date(now + 2 * 60e3).toISOString(), // must connect within 2 min
      bidiGenerateContentSetup: setup,
      fieldMask: Object.keys(setup).join(","), // lock everything: the browser cannot change persona or voice
    }),
  });
  const tok = await res.json().catch(() => ({}));
  if (!res.ok || !tok.name) {
    console.error("auth_tokens", res.status, JSON.stringify(tok).slice(0, 300));
    return json(502, { error: "unavailable" });
  }
  return json(200, { token: tok.name, model });
}

export function POST(request) {
  return handleLiveToken(request);
}
