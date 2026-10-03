// "Support this" card: UPI (deep link on phones, QR on desktop) and an optional Ko-fi link.
import qrcode from "qrcode-generator";
import { h } from "../lib/dom.js";
import { tx } from "../lib/i18n.js";
import { track } from "../lib/analytics.js";
import { SUPPORT } from "../lib/support-config.js";
import { bi } from "./bi.js";

export const supportEnabled = () => !!(SUPPORT.upiId || SUPPORT.koFiUrl);

export function supportCard(where) {
  if (!supportEnabled()) return null;
  const upi = SUPPORT.upiId
    ? `upi://pay?pa=${encodeURIComponent(SUPPORT.upiId)}&pn=${encodeURIComponent(SUPPORT.upiName)}&cu=INR&tn=${encodeURIComponent("Kerala Astro Guide")}`
    : null;
  let qr = null;
  if (upi) {
    const q = qrcode(0, "M");
    q.addData(upi);
    q.make();
    qr = h("div.support-qr", { html: q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }) });
  }
  return h("section.support-card",
    h("strong.support-title", bi("ഈ സേവനം സൗജന്യമായി തുടരാൻ സഹായിക്കാം", "Help keep this free")),
    h("p", tx("ഓരോ കോളിനും ഞങ്ങൾക്ക് ചെറിയൊരു ചെലവുണ്ട്. ഇഷ്ടമുള്ള തുക നൽകി സഹായിക്കാം.", "Each call costs us a little. Any amount you choose helps.")),
    upi && h("a.btn-primary-xl.support-upi", { href: upi, onclick: () => track("support_click", { method: "upi", where }) }, bi("UPI വഴി നൽകുക", "Pay with UPI")),
    qr && h("div.support-qr-wrap", qr, h("span.note", tx("കമ്പ്യൂട്ടറിലാണെങ്കിൽ ഫോണിലെ UPI ആപ്പിൽ സ്കാൻ ചെയ്യുക", "On a computer? Scan with any UPI app"), h("br"), h("span.num", SUPPORT.upiId))),
    SUPPORT.koFiUrl && h("a.btn-secondary-xl", { href: SUPPORT.koFiUrl, target: "_blank", rel: "noopener", onclick: () => track("support_click", { method: "kofi", where }) }, bi("കാർഡ് വഴി (Ko-fi)", "By card (Ko-fi)")));
}
