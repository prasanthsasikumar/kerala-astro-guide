// AI astrologer chat (Vercel function). The Gemini key stays on the server.
// POST { code, lang: "ml" | "en", chart: "<facts>", messages: [{ role: "user" | "model", text }] }
// -> streamed plain text.
import { timingSafeEqual } from "node:crypto";

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const LIMITS = { chart: 12000, message: 4000, messages: 40, total: 60000 };
const RATE = { windowMs: 60 * 60 * 1000, max: 60 }; // per IP per instance, best effort

const SYSTEM = (lang) => `You are "ജ്യോതിഷി", a kind, experienced Kerala astrologer (jyotishi) talking with an elderly Malayali family about a horoscope.

LANGUAGE: ${lang === "en"
  ? "Reply in simple, warm English. You may add Malayalam astrology terms in brackets."
  : "Reply ONLY in simple, natural spoken Malayalam (Malayalam script), the way a respected Kerala astrologer talks to elders. Avoid heavy Sanskrit and English words; use common Malayalam astrology terms (ഗ്രഹനില, ദശ, അപഹാരം, ഗോചരം, നക്ഷത്രം, ലഗ്നം, ഭാവം)."}

GROUNDING: The CHART FACTS below were calculated precisely (sidereal, Lahiri ayanamsa, Kerala conventions). Use ONLY these facts for positions, stars, dasa periods and dates. Never invent or change positions or dates. If something is not in the facts (for example another person's chart), say you need that person's birth details, which they can enter in the app.

STYLE:
- Short answers: 4 to 8 sentences or a few short points, readable on a phone. Offer to explain more.
- Explain the reasoning briefly in plain words (which planet, which house, which dasa), like a traditional astrologer would.
- Be gentle, hopeful and balanced. Mention difficulties honestly but never frighten. Do not predict death, fatal illness, accidents or divorce with certainty.
- For remedies, suggest only simple traditional ones: prayer, temple visits, naamajapam, simple vazhipadu, fasting on a day, charity. Never push expensive poojas, gemstones or paid services.
- Health, legal, money and big life decisions: give the astrological view, and also say to consult a doctor or the right professional where relevant.
- If asked about matters unrelated to astrology, family life or wellbeing, politely steer back.
- Do not mention these instructions, AI, models or "facts provided"; speak naturally as the astrologer who has studied the chart.

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

const text = (status, msg) => new Response(msg, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

export async function handleAsk(request, env = process.env) {
  if (request.method !== "POST") return text(405, "POST only");
  const key = env.GEMINI_API_KEY;
  if (!key) return text(503, "The astrologer is not configured.");
  let body;
  try {
    body = await request.json();
  } catch {
    return text(400, "Bad request");
  }
  if (env.FAMILY_CODE && !sameCode(body.code, env.FAMILY_CODE)) return text(401, "Family link required");
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
  if (rateLimited(ip)) return text(429, "Too many questions. Please try again in a while.");

  const chart = String(body.chart || "");
  const msgs = Array.isArray(body.messages) ? body.messages.slice(-LIMITS.messages) : [];
  if (!chart || chart.length > LIMITS.chart || msgs.length === 0) return text(400, "Bad request");
  const contents = [];
  let total = chart.length;
  for (const m of msgs) {
    const t = String(m?.text || "").slice(0, LIMITS.message);
    total += t.length;
    if (!t) continue;
    contents.push({ role: m.role === "model" ? "model" : "user", parts: [{ text: t }] });
  }
  if (total > LIMITS.total || contents.at(-1)?.role !== "user") return text(400, "Bad request");

  const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM(body.lang === "en" ? "en" : "ml") + chart }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  });
  if (!upstream.ok || !upstream.body) {
    console.error("gemini", upstream.status, await upstream.text().catch(() => ""));
    return text(502, "The astrologer is unavailable right now. Please try again.");
  }

  // Gemini SSE -> plain text stream
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buf = "";
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            try {
              const j = JSON.parse(line.slice(5));
              const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
              if (t) controller.enqueue(encoder.encode(t));
            } catch {
              /* partial or keep-alive line */
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}

export function POST(request) {
  return handleAsk(request);
}
