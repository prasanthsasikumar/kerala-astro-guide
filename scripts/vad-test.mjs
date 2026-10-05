// Stream an audio file into a live astrologer call (no browser) and log what the model hears and does.
// Used to check that coughs, sneezes and laughs don't cut the astrologer off.
// usage: node scripts/vad-test.mjs <site-base-url> <audio-file> [lang=ml] [seconds=40]
import { execFileSync } from "node:child_process";
const [base, file, lang = "ml", secs = "40"] = process.argv.slice(2);
const WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";
const chart = "Name: VadTest. Male. Birth star: Uttara Phalguni. Moon in Leo. Current dasa: Venus, sub-period Moon until March 2027.";
const r = await fetch(new URL("/api/live-token", base), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lang, chart }) });
if (!r.ok) { console.error("token", r.status, await r.text()); process.exit(1); }
const { token, model } = await r.json();
const pcm = execFileSync("ffmpeg", ["-loglevel", "error", "-i", file, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], { maxBuffer: 1 << 26 });
const ws = new WebSocket(`${WS_URL}?access_token=${encodeURIComponent(token)}`);
let t0 = 0;
const t = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(5);
const lines = [];
let speaking = false;
const say = (s) => lines.push(`${t()}  ${s}`);
let cur = { u: "", a: "" };
const flush = (k) => { if (cur[k].trim()) say((k === "u" ? "HEARD   " : "ASTRO   ") + cur[k].trim()); cur[k] = ""; };
ws.onmessage = async (e) => {
  const m = JSON.parse(typeof e.data === "string" ? e.data : await e.data.text());
  if (m.setupComplete) {
    t0 = Date.now();
    ws.send(JSON.stringify({ realtimeInput: { text: "(The phone call has connected. Please greet and begin.)" } }));
    let off = 0;
    const step = 640; // 20 ms of 16 kHz 16-bit audio, sent in real time
    const timer = setInterval(() => {
      if (off >= pcm.length || ws.readyState !== 1) return clearInterval(timer);
      ws.send(JSON.stringify({ realtimeInput: { audio: { data: pcm.subarray(off, off + step).toString("base64"), mimeType: "audio/pcm;rate=16000" } } }));
      off += step;
    }, 20);
  }
  const sc = m.serverContent;
  if (!sc) return;
  if (sc.modelTurn?.parts?.some((p) => p.inlineData) && !speaking) { speaking = true; flush("u"); say("-- astrologer starts speaking"); }
  if (sc.inputTranscription?.text) cur.u += sc.inputTranscription.text;
  if (sc.outputTranscription?.text) cur.a += sc.outputTranscription.text;
  if (sc.interrupted) { flush("a"); say("!! INTERRUPTED (caller sound detected)"); speaking = false; }
  if (sc.turnComplete) { flush("u"); flush("a"); if (speaking) say("-- turn complete"); speaking = false; }
};
ws.onopen = () => ws.send(JSON.stringify({ setup: { model } }));
ws.onclose = (e) => say(`closed ${e.code} ${e.reason || ""}`);
setTimeout(() => { flush("u"); flush("a"); console.log(lines.join("\n")); ws.close(); process.exit(0); }, +secs * 1000 + 3000);
