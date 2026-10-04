// WhatsApp Business Cloud API: send the call summary as an approved template message.
// Off unless WHATSAPP_AUTOSEND=1 and WHATSAPP_TOKEN + WHATSAPP_PHONE_ID are set.
const GRAPH = "https://graph.facebook.com/v21.0";
// template "call_summary" is created per language by scripts/whatsapp-template.mjs
const LANG_CODE = { ml: "ml", en: "en", hi: "hi", ta: "ta", te: "te", kn: "kn" };

export const whatsappEnabled = (env) => env.WHATSAPP_AUTOSEND === "1" && !!env.WHATSAPP_TOKEN && !!env.WHATSAPP_PHONE_ID;

// E.164 digits without "+"; a bare 10-digit Indian mobile gets 91 in front
export function toWhatsAppNumber(phone) {
  const raw = String(phone || "").trim();
  const d = raw.replace(/[^\d]/g, "");
  if (raw.startsWith("+") || raw.startsWith("00")) return /^\d{8,15}$/.test(d.replace(/^00/, "")) ? d.replace(/^00/, "") : null;
  if (/^[6-9]\d{9}$/.test(d)) return "91" + d;
  if (/^0[6-9]\d{9}$/.test(d)) return "91" + d.slice(1);
  return /^\d{8,15}$/.test(d) ? d : null;
}

// Template parameters may not contain line breaks, tabs or long runs of spaces, and the body has a size limit.
export function templateText(summary) {
  return String(summary)
    .split(/\n+/).map((l) => l.replace(/^[•\-*]\s*/, "").trim()).filter(Boolean)
    .filter((l) => !/^astro\.flowsxr\.com$/i.test(l))
    .join(" | ").replace(/\s{2,}/g, " ").slice(0, 900);
}

export async function sendSummary(env, { phone, lang, summary }) {
  const to = toWhatsAppNumber(phone);
  if (!to) return { status: "skipped", error: "bad number" };
  const res = await fetch(`${GRAPH}/${env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp", to, type: "template",
      template: {
        name: env.WHATSAPP_TEMPLATE || "call_summary",
        language: { code: LANG_CODE[lang] || "en" },
        components: [{ type: "body", parameters: [{ type: "text", text: templateText(summary) }] }],
      },
    }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) return { status: "failed", error: String(d.error?.message || res.status).slice(0, 200) };
  return { status: "sent", id: d.messages?.[0]?.id || null };
}
