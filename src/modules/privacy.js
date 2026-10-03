// Privacy notice for the astrologer call (simple layout, Malayalam first).
import "../styles/ask.css";
import { h } from "../lib/dom.js";
import { tx } from "../lib/i18n.js";

const CONTACT = "prasanth@flowsxr.com";

export function render(el) {
  el.classList.add("ask", "ask-page");
  const ml = [
    ["എന്താണ് സൂക്ഷിക്കുന്നത്", "ജ്യോതിഷനുമായി വിളിക്കുമ്പോൾ, നിങ്ങൾ നൽകിയ പേര്, ലിംഗം, ജനന തീയതി, സമയം, സ്ഥലം, കൂടാതെ സംഭാഷണത്തിന്റെ എഴുത്തുരൂപവും (ശബ്ദമല്ല) കോളിന്റെ സമയദൈർഘ്യവും സൂക്ഷിക്കും."],
    ["എന്തിന്", "സേവനം മെച്ചപ്പെടുത്താനും തെറ്റുകൾ കണ്ടെത്താനും മാത്രം. ഇത് വിൽക്കുകയോ പരസ്യത്തിന് ഉപയോഗിക്കുകയോ ചെയ്യില്ല."],
    ["എവിടെ", "Vercel-ന്റെ സ്വകാര്യ സംഭരണിയിൽ (മുംബൈ). സംഭാഷണം നടക്കുന്നത് Google Gemini വഴിയാണ്. Google Analytics-ൽ പേരോ ജനന വിവരങ്ങളോ ഇല്ലാതെ ഉപയോഗത്തിന്റെ കണക്കുകൾ മാത്രം. സ്ഥലം തിരയുമ്പോൾ ടൈപ്പ് ചെയ്യുന്ന പേര് OpenStreetMap-ലേക്ക് പോകും."],
    ["നിങ്ങളുടെ ഫോണിൽ", "ചേർത്ത ആളുകളുടെ വിവരങ്ങൾ ഈ ഫോണിൽ തന്നെയും സൂക്ഷിക്കും, പിന്നീട് എളുപ്പത്തിൽ വിളിക്കാൻ."],
    ["നീക്കം ചെയ്യാൻ", `നിങ്ങളുടെ വിവരങ്ങൾ നീക്കം ചെയ്യാനോ കാണാനോ ${CONTACT} എന്ന വിലാസത്തിൽ എഴുതുക.`],
  ];
  const en = [
    ["What is saved", "When you call the astrologer, we save the name, gender, date, time and place of birth you entered, a text transcript of the conversation (not the audio), and the call length."],
    ["Why", "Only to improve the service and find problems. It is never sold or used for advertising."],
    ["Where", "In private storage on Vercel (Mumbai region). The conversation itself runs through Google Gemini. Google Analytics receives anonymous usage counts only, never names or birth details. Place searches are sent to OpenStreetMap."],
    ["On your phone", "The people you add are also kept on this phone so you can call again easily."],
    ["Deletion", `To see or delete your data, write to ${CONTACT}.`],
  ];
  el.append(
    h("header.ask-top", h("a.ask-back", { href: "#/ask", "aria-label": tx("തിരികെ", "Back") }, "←"), h("span")),
    h("h1", tx("സ്വകാര്യത", "Privacy")),
    ...tx(ml, en).flatMap(([title, body]) => [h("h2", title), h("p", body)]),
    h("p.muted", tx("ജ്യോതിഷം ഒരു വഴികാട്ടി മാത്രമാണ്. ആരോഗ്യം, പണം, നിയമം എന്നിവയിൽ വിദഗ്ധരുടെ ഉപദേശം തേടുക.", "Astrology is guidance only. For health, money or legal matters, consult a professional.")));
}
