// One-time: submit the "call_summary" WhatsApp template (utility) in every app language for Meta's approval.
// Needs WHATSAPP_TOKEN and WHATSAPP_WABA_ID (WhatsApp Business Account ID) in web/.env.local.
// usage: node scripts/whatsapp-template.mjs            submit the template in all languages
//        node scripts/whatsapp-template.mjs --status   show approval status
//        node scripts/whatsapp-template.mjs --hello +919876543210   send Meta's hello_world test message
//          (needs WHATSAPP_PHONE_ID; with the test number, the recipient must be added in API Setup first)
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")
  .filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const { WHATSAPP_TOKEN: token, WHATSAPP_WABA_ID: waba } = env;
if (!token || !waba) {
  console.error("Set WHATSAPP_TOKEN and WHATSAPP_WABA_ID in web/.env.local first.");
  process.exit(1);
}
const GRAPH = "https://graph.facebook.com/v21.0";
const NAME = "call_summary";
const EXAMPLE = "Lakshmi | Asked about the current period | Saturn period, Mars sub-period until August 2027 | Light a sesame lamp on Saturdays";
const BODY = {
  ml: "ജ്യോതിഷിയുമായുള്ള നിങ്ങളുടെ കോളിന്റെ ചുരുക്കം: {{1}}",
  en: "Here is the summary of your call with the astrologer: {{1}}",
  hi: "ज्योतिषी के साथ आपकी कॉल का सार: {{1}}",
  ta: "ஜோதிடருடன் உங்கள் அழைப்பின் சுருக்கம்: {{1}}",
  te: "జ్యోతిష్యుడితో మీ కాల్ సారాంశం: {{1}}",
  kn: "ಜ್ಯೋತಿಷಿಯೊಂದಿಗಿನ ನಿಮ್ಮ ಕರೆಯ ಸಾರಾಂಶ: {{1}}",
};
const FOOTER = "Kerala Astro Guide · astro.flowsxr.com";

async function api(path, init = {}) {
  const res = await fetch(`${GRAPH}/${path}`, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) } });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

const helloAt = process.argv.indexOf("--hello");
if (helloAt > 0) {
  const to = String(process.argv[helloAt + 1] || "").replace(/[^\d]/g, "");
  if (!env.WHATSAPP_PHONE_ID || !to) { console.error("Need WHATSAPP_PHONE_ID in .env.local and a number: --hello +91..."); process.exit(1); }
  const { ok, data } = await api(`${env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: { name: "hello_world", language: { code: "en_US" } } }),
  });
  console.log(ok ? `sent to ${to}: check WhatsApp` : `error: ${data.error?.message || JSON.stringify(data).slice(0, 200)}`);
  process.exit(ok ? 0 : 1);
}

if (process.argv.includes("--status")) {
  const { data } = await api(`${waba}/message_templates?name=${NAME}&fields=name,language,status,category,rejected_reason`);
  for (const t of data.data || []) console.log(t.language.padEnd(4), t.status.padEnd(10), t.category, t.rejected_reason && t.rejected_reason !== "NONE" ? t.rejected_reason : "");
  process.exit(0);
}

for (const [language, text] of Object.entries(BODY)) {
  const { ok, data } = await api(`${waba}/message_templates`, {
    method: "POST",
    body: JSON.stringify({
      name: NAME, language, category: "UTILITY",
      components: [
        { type: "BODY", text, example: { body_text: [[EXAMPLE]] } },
        { type: "FOOTER", text: FOOTER },
      ],
    }),
  });
  console.log(language.padEnd(4), ok ? `submitted (${data.status || "PENDING"})` : `error: ${data.error?.message || JSON.stringify(data).slice(0, 200)}`);
}
console.log("\nCheck approval with: node scripts/whatsapp-template.mjs --status");
