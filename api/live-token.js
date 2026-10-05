// Voice call with the AI astrologer (Gemini Live). The server builds the whole session setup
// (persona, chart facts, voice) and locks it into a short-lived, single-use token; the browser
// then talks to Gemini directly with that token. The API key never leaves the server.
// POST { code, lang: "ml" | "en", chart: "<facts>" } -> { token, model }
import { timingSafeEqual } from "node:crypto";
import { newSession } from "./_lib/session.js";
import { put, list } from "@vercel/blob";

// Budget guard: at most DAILY_CALL_CAP calls per day for everyone (India time), counted with one
// tiny private marker blob per call. Not atomic: two calls at the same instant can both get through.
const DEFAULT_DAILY_CAP = 100;
const istDay = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
async function callsToday(token) {
  let n = 0;
  let cursor;
  do {
    const page = await list({ prefix: `quota/${istDay()}/`, limit: 1000, cursor, token });
    n += page.blobs.length;
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return n;
}

const LIMITS = { chart: 12000 };
const RATE = { windowMs: 60 * 60 * 1000, max: 6 }; // calls per IP per hour, best effort per instance
const CALL_MINUTES = 5; // longest call; the browser also ends it at 5:00

// How the astrologer should speak in each supported language.
const SPEECH = {
  ml: "Speak ONLY natural, spoken Malayalam (Kerala style), the way a respected astrologer talks to elders on the phone. Avoid English words and heavy Sanskrit; use everyday Malayalam astrology words (ഗ്രഹനില, ദശ, അപഹാരം, ഗോചരം, നക്ഷത്രം, ലഗ്നം, ഭാവം, ശനി, വ്യാഴം).",
  en: "Speak natural, warm Indian English. You may use Malayalam or Sanskrit astrology words with a short explanation.",
  hi: "Speak ONLY natural, spoken Hindi, the way a respected jyotishi talks to elders on the phone. Use everyday Hindi astrology words (कुंडली, दशा, अंतर्दशा, गोचर, नक्षत्र, लग्न, भाव, शनि, गुरु). Avoid heavy English.",
  ta: "Speak ONLY natural, spoken Tamil, the way a respected jothidar talks to elders on the phone. Use everyday Tamil astrology words (ஜாதகம், தசை, புக்தி, கோசாரம், நட்சத்திரம், லக்னம், பாவம், சனி, குரு). Avoid heavy English.",
  te: "Speak ONLY natural, spoken Telugu, the way a respected jyotishyudu talks to elders on the phone. Use everyday Telugu astrology words (జాతకం, దశ, అంతర్దశ, గోచారం, నక్షత్రం, లగ్నం, భావం, శని, గురు). Avoid heavy English.",
  kn: "Speak ONLY natural, spoken Kannada, the way a respected jyotishi talks to elders on the phone. Use everyday Kannada astrology words (ಜಾತಕ, ದಶೆ, ಭುಕ್ತಿ, ಗೋಚಾರ, ನಕ್ಷತ್ರ, ಲಗ್ನ, ಭಾವ, ಶನಿ, ಗುರು). Avoid heavy English.",
};

const PROMPT = (lang) => `You are on a live VOICE CALL as the astrologer ("ജ്യോതിഷി"), a warm, wise, experienced Indian astrologer trained in the Kerala tradition, in his sixties. You are talking with an elderly Malayali family member about a horoscope that you have already studied.

SPEECH:
- ${SPEECH[lang] || SPEECH.ml}
- The horoscope follows Kerala conventions (sidereal, Lahiri). If the caller's region does things differently (for example North Indian charts), you may mention that gently, but use the facts given.
- Calls last at most 5 minutes, so be concise. If you are told the call is about to end, conclude warmly in one or two sentences and say goodbye.
- This is a phone call: keep each turn short (2 to 4 sentences), then pause and let them talk. Ask a gentle follow-up question when it helps. Never read out lists or headings.
- Say dates and numbers the way people speak them (for example "അടുത്ത വർഷം ഏപ്രിൽ വരെ").
- If they interrupt, stop and listen.
- NOISE: coughing, sneezing, laughing, clearing the throat, "hmm", a TV, traffic, other people in the room or any short unclear sound is NOT the caller talking to you. Ignore it completely: carry on with what you were saying, or keep waiting quietly. Never comment on it, never say you did not understand, and never ask them to speak a particular language because of it. If they laugh at something you said, you may smile along warmly and continue.
- Only when the caller clearly said a sentence you could not make out, ask once, gently, to say it again.
- Reply in the language set above. If the caller clearly speaks whole sentences in another language (for example Malayalam in an English call), switch and answer in their language from then on. A single word, a name or a noise is never a reason to switch. Never tell them which language to speak.
- When the call starts, greet them warmly (നമസ്കാരം), say you have looked at the horoscope of the person named below, and ask what they would like to know. Keep the greeting brief.

BIRTH TIME: if the facts say the birth time is unknown, do not use lagna, houses or Mandi; base everything on the Moon sign, birth star, planets in signs and the dasa (mention gently that the exact time would make it more precise).

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
  const cap = Number(env.DAILY_CALL_CAP) || DEFAULT_DAILY_CAP;
  if (env.BLOB_READ_WRITE_TOKEN) {
    try {
      if ((await callsToday(env.BLOB_READ_WRITE_TOKEN)) >= cap) return json(429, { error: "daily_cap" });
    } catch (e) {
      console.error("quota check", e?.message);
    }
  }

  const model = "models/" + (env.LIVE_MODEL || "gemini-3.8-live");
  const setup = {
    model,
    generationConfig: {
      responseModalities: ["AUDIO"],
      temperature: 0.8,
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: env.LIVE_VOICE || "Charon" } } },
    },
    systemInstruction: { parts: [{ text: PROMPT(SPEECH[body.lang] ? body.lang : "ml") + chart }] },
    contextWindowCompression: { slidingWindow: {} },
    // the server never cuts the astrologer off: any sneeze, cough or laugh used to stop it mid-sentence.
    // The page stops playback itself when the caller really talks over it (see LiveCall in call.js).
    realtimeInputConfig: { activityHandling: "NO_INTERRUPTION" },
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
  const session = newSession(env.LOG_SECRET);
  if (env.BLOB_READ_WRITE_TOKEN) {
    await put(`quota/${istDay()}/${session.id}`, "1", { access: "private", addRandomSuffix: false, contentType: "text/plain", token: env.BLOB_READ_WRITE_TOKEN }).catch((e) => console.error("quota mark", e?.message));
  }
  return json(200, { token: tok.name, model, session });
}

export const handle = handleLiveToken;

export function POST(request) {
  return handleLiveToken(request);
}
