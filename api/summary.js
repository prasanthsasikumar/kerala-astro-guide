// Short summary of a finished call, in the caller's language, for them to keep or share on WhatsApp.
// POST { id, sig, lang, name, phone?, optIn?, transcript: [{ r: "u" | "a", t }] } -> { summary, whatsapp }
// Only signed call sessions, one summary each (a marker blob records that it was made).
import { put, head } from "@vercel/blob";
import { verify, json } from "./_lib/session.js";
import { whatsappEnabled, sendSummary } from "./_lib/whatsapp.js";

const MODEL = process.env.SUMMARY_MODEL || "gemini-flash-latest";
const LANG_NAME = { ml: "Malayalam", en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu", kn: "Kannada" };

export async function handle(request, env = process.env) {
  if (request.method !== "POST") return json(405, { error: "POST only" });
  let b;
  try {
    b = JSON.parse((await request.text()).slice(0, 200_000));
  } catch {
    return json(400, { error: "bad request" });
  }
  if (!verify(b.id, b.sig, env.LOG_SECRET)) return json(403, { error: "bad session" });
  if (!env.GEMINI_API_KEY) return json(503, { error: "not configured" });
  const turns = (Array.isArray(b.transcript) ? b.transcript : []).filter((x) => x && x.t).slice(0, 400);
  if (!turns.some((x) => x.r === "u")) return json(422, { error: "nothing to summarise" });

  const marker = `summaries/${b.id.slice(0, 10)}/${b.id}`;
  if (env.BLOB_READ_WRITE_TOKEN) {
    const done = await head(marker, { token: env.BLOB_READ_WRITE_TOKEN }).catch(() => null);
    if (done) return json(409, { error: "already summarised" });
  }

  const lang = LANG_NAME[b.lang] ? b.lang : "ml";
  const name = String(b.name || "").slice(0, 80);
  const text = turns.map((x) => `${x.r === "u" ? "Caller" : "Astrologer"}: ${String(x.t).slice(0, 2000)}`).join("\n");
  const prompt = `Summarise this phone consultation with a Kerala astrologer for the caller to keep, in ${LANG_NAME[lang]} (use the ${LANG_NAME[lang]} script).
Format, plain text only (no markdown, no headings with #):
- First line: "Kerala Astro Guide · ${name || "horoscope"}" (translate "horoscope" if no name).
- Then 3 to 6 short lines starting with "• ": what they asked, what the astrologer said (keep periods and dates exactly as said), and any simple remedy suggested.
- Last line: "astro.flowsxr.com"
Keep it under 700 characters, warm and simple. Do not add predictions that were not in the conversation.

Conversation:
${text}`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 4096 } }), // the model thinks first; leave room
  });
  const d = await res.json().catch(() => ({}));
  const cand = d.candidates?.[0];
  const summary = cand?.content?.parts?.filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
  if (!res.ok || !summary || cand?.finishReason === "MAX_TOKENS") {
    console.error("summary", res.status, JSON.stringify(d).slice(0, 300));
    return json(502, { error: "unavailable" });
  }
  if (env.BLOB_READ_WRITE_TOKEN) {
    await put(marker, "1", { access: "private", addRandomSuffix: false, contentType: "text/plain", token: env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
  }
  // automatic WhatsApp copy for callers who gave a number and ticked the opt-in
  let whatsapp = { status: "skipped" };
  if (b.optIn && b.phone && whatsappEnabled(env)) {
    whatsapp = await sendSummary(env, { phone: b.phone, lang, summary }).catch((e) => ({ status: "failed", error: String(e?.message || e).slice(0, 200) }));
  }
  whatsapp.at = new Date().toISOString();
  return json(200, { summary, whatsapp });
}

export function POST(request) {
  return handle(request);
}
