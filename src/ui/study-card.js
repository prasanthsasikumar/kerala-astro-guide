// The research-study invitation: a full-width card with one main button, shown after a call and on the
// horoscope screen so nobody misses the 10 questions.
import { h } from "../lib/dom.js";
import { tx } from "../lib/i18n.js";
import { track } from "../lib/analytics.js";

export function studyCard(href, where) {
  return h("section.study-card",
    h("h2", where === "after_call" ? tx("ഇത് എത്ര ശരിയായിരുന്നു?", "Was it accurate?") : tx("ഈ ജാതകം എത്ര ശരിയാണ്?", "How accurate is this horoscope?")),
    h("p", tx("10 ചെറിയ ചോദ്യങ്ങൾ, 2 മിനിറ്റ്. ജ്യോതിഷം ശരിക്കും പ്രവർത്തിക്കുന്നുണ്ടോ എന്ന് കണ്ടെത്താനുള്ള ഒരു പഠനത്തിന് സഹായിക്കും.",
      "10 quick questions, about 2 minutes. Your answers help a study on whether astrology really works.")),
    h("a.btn-primary-xl", { href, onclick: () => track("study_open", { from: where }) }, tx("ചോദ്യങ്ങൾ തുടങ്ങാം", "Answer 10 questions")));
}
