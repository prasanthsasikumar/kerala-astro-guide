// Study: "Is astrology accurate?" Consent → choose a person → (explore the horoscope / call) →
// 9 multiple-choice questions → a blind test (own reading vs a random chart's reading) → reveal.
// Answers are anonymous: api/survey.js keeps no name or birth details, only birth year and gender.
import { h, clear } from "../lib/dom.js";
import { tx, lang } from "../lib/i18n.js";
import { getCtx, queryToInput } from "../lib/ctx.js";
import { people, initialOf, hrefFor } from "../lib/people.js";
import { blindFacts, decoyInput } from "../engine/chart-summary.js";
import { track } from "../lib/analytics.js";
import { bi, biStack } from "../ui/bi.js";
import { screenHeader } from "../ui/screen.js";

const Q = [
  ["q1", "ആർക്കുവേണ്ടിയാണ് ഇത് നോക്കിയത്?", "Whose horoscope did you look at?",
    [["self", "എനിക്ക്", "My own"], ["parent", "അച്ഛൻ / അമ്മ", "My parent"], ["grandparent", "മുത്തച്ഛൻ / മുത്തശ്ശി", "My grandparent"], ["other", "മറ്റൊരാൾ", "Someone else"]]],
  ["q2", "ആ ആളുടെ പ്രായം?", "How old is that person?",
    [["u30", "30-ൽ താഴെ", "Under 30"], ["30-49", "30 മുതൽ 49 വരെ", "30 to 49"], ["50-64", "50 മുതൽ 64 വരെ", "50 to 64"], ["65p", "65-ഉം അതിനുമുകളിലും", "65 or older"]]],
  ["q3", "ഇതിനുമുമ്പ് ജ്യോതിഷത്തിൽ എത്രത്തോളം വിശ്വാസമുണ്ടായിരുന്നു?", "Before this, how much did they believe in astrology?",
    [["strong", "നല്ല വിശ്വാസം", "Strongly believe"], ["some", "കുറച്ച് വിശ്വാസം", "Somewhat believe"], ["unsure", "ഉറപ്പില്ല", "Not sure"], ["none", "വിശ്വാസമില്ല", "Don't believe"]]],
  ["q4", "എന്തെല്ലാം ഉപയോഗിച്ചു?", "What did you use?",
    [["call", "ജ്യോതിഷിയുമായി സംസാരിച്ചു", "Talked to the astrologer"], ["chart", "ജാതകം നോക്കി", "Looked at the horoscope"], ["both", "രണ്ടും", "Both"], ["neither", "ഇതുവരെ ഒന്നുമില്ല", "Neither yet"]]],
  ["q5", "ജാതകത്തിലെ വിവരണം ആ ആളെ എത്ര ശരിയായി വിവരിക്കുന്നു?", "How well does the horoscope describe that person?",
    [["very", "വളരെ ശരി", "Very well"], ["somewhat", "കുറച്ചൊക്കെ", "Somewhat"], ["little", "അധികമില്ല", "Not really"], ["none", "ഒട്ടും ഇല്ല", "Not at all"]]],
  ["q6", "കഴിഞ്ഞുപോയ ദശാകാലങ്ങൾ ജീവിതത്തിലെ വലിയ മാറ്റങ്ങളുമായി (ജോലി, വിവാഹം, താമസം, ആരോഗ്യം) ഒത്തുപോകുന്നുണ്ടോ?", "Did past dasa periods line up with big life changes (job, marriage, moves, health)?",
    [["most", "മിക്കതും ഒത്തു", "Most did"], ["some", "ചിലത് ഒത്തു", "Some did"], ["none", "ഒന്നും ഒത്തില്ല", "None did"], ["unchecked", "നോക്കിയില്ല", "Didn't check"]]],
  ["q7", "ജ്യോതിഷിയുമായി സംസാരിച്ചെങ്കിൽ, പറഞ്ഞത് എത്ര ശരിയായിരുന്നു?", "If you talked to the astrologer, how accurate did it feel?",
    [["very", "വളരെ ശരി", "Very accurate"], ["somewhat", "കുറച്ചൊക്കെ", "Somewhat"], ["little", "അധികമില്ല", "Not really"], ["nocall", "സംസാരിച്ചില്ല", "Didn't talk"]]],
  ["q8", "ഫോൺ വിളി പോലെയുള്ള സംസാരം എങ്ങനെയുണ്ടായിരുന്നു?", "How was the voice call to use?",
    [["easy", "എളുപ്പം, സ്വാഭാവികം", "Easy and natural"], ["ok", "കുഴപ്പമില്ല", "OK"], ["hard", "ബുദ്ധിമുട്ട്", "Hard to use"], ["nocall", "സംസാരിച്ചില്ല", "Didn't talk"]]],
  ["q9", "ഇനിയും ഉപയോഗിക്കുമോ, മറ്റുള്ളവരോട് പറയുമോ?", "Would they use it again or recommend it?",
    [["yes", "ഉവ്വ്", "Yes"], ["maybe", "ചിലപ്പോൾ", "Maybe"], ["no", "ഇല്ല", "No"]]],
];

export async function render(el, params) {
  const input = queryToInput(params);
  if (input) input.timeUnknown = params.tu === "1";
  const state = { step: input ? (params.ready ? "q" : "explore") : "intro", qi: 0, answers: {}, consent: !!params.ready, blind: null, choice: null };
  const root = h("div.study");
  el.append(root);
  // native append prints null as the text "null"; skip empty parts
  const put = (...parts) => root.append(...parts.filter((x) => x != null && x !== false));

  // The study id comes first, then every answer is saved as soon as it is given (a half-finished study still counts).
  let studyP = null;
  const ensureStudy = () => (studyP ||= fetch("/api/survey", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "start" }) })
    .then((r) => (r.ok ? r.json() : null)).then((d) => d?.study || null).catch(() => null)
    .then((v) => { if (!v) studyP = null; return v; }));
  let saving = Promise.resolve(null);
  const save = (extra = {}) => (saving = saving.then(async () => {
    const study = await ensureStudy();
    if (!study) return null;
    const res = await fetch("/api/survey", {
      method: "POST", headers: { "content-type": "application/json" }, keepalive: true,
      body: JSON.stringify({ study, answers: state.answers, lang: lang(), birthYear: +input.date.slice(0, 4), gender: input.gender, ...extra }),
    });
    return res.json().catch(() => null);
  }).catch(() => null));

  // The two blind-test readings take a while to write, so they are prepared in the background from the start;
  // by question 10 they are ready. Two quiet tries here, one more at question 10 if both failed.
  let blindP = null;
  const fetchBlind = async () => {
    const ctx = await getCtx();
    const res = await fetch("/api/blindtest", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: lang(), real: blindFacts(ctx, input), decoy: blindFacts(ctx, decoyInput(input)) }),
    });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  };
  const prepareBlind = () => (blindP = (async () => {
    for (let i = 0; i < 2; i++) {
      try { return await fetchBlind(); } catch { await new Promise((r) => setTimeout(r, 2000)); }
    }
    return null;
  })());
  if (input) prepareBlind();

  const draw = () => {
    clear(root);
    if (state.step === "intro") return intro();
    if (state.step === "explore") return explore();
    if (state.step === "q") return question();
    if (state.step === "blind") return blindTest();
    if (state.step === "done") return done();
  };

  function intro() {
    const list = people();
    const consent = h("input", { type: "checkbox", checked: state.consent, onchange: () => { state.consent = consent.checked; } });
    const err = h("p.form-error", { hidden: true }, tx("തുടരാൻ സമ്മതം അടയാളപ്പെടുത്തുക", "Please tick the consent box to continue"));
    const go = (href) => (e) => { if (!state.consent) { e.preventDefault(); err.hidden = false; return; } track("study_start", {}); location.hash = href; e.preventDefault(); };
    put(
      screenHeader({ back: "#/" }),
      h("h1.title", tx("ജ്യോതിഷം ശരിയാണോ? ഒരു ചെറിയ പഠനം", "Is astrology accurate? A small study")),
      h("p.lead", tx("ജാതകമോ ജ്യോതിഷിയുമായുള്ള സംസാരമോ നോക്കിയശേഷം 10 ചെറിയ ചോദ്യങ്ങൾ. ഏകദേശം 3 മിനിറ്റ്. അവസാന ചോദ്യം ഒരു 'blind test' ആണ്: രണ്ട് വിവരണങ്ങളിൽ ഏതാണ് ശരിയായ ആളുടേതെന്ന് കണ്ടെത്തുക.",
        "Look at a horoscope or talk to the astrologer, then answer 10 short questions. About 3 minutes. The last one is a blind test: two readings, only one from the real chart. Can you tell which?")),
      h("div.study-consent",
        h("label.check-row", consent, h("span", tx("ഈ ഉത്തരങ്ങൾ ഒരു ഗവേഷണ പഠനത്തിനായി (പേരില്ലാതെ) സൂക്ഷിക്കുന്നതിനും, മൊത്തം ഫലങ്ങൾ പ്രസിദ്ധീകരിക്കുന്നതിനും ഞാൻ സമ്മതിക്കുന്നു. ജനനവർഷം, ലിംഗം, ഏകദേശ നഗരം (ഇന്റർനെറ്റ് കണക്ഷനിൽ നിന്ന്) എന്നിവ മാത്രം; പേരോ ജനനതീയതിയോ ജനനസ്ഥലമോ ഇല്ല.",
          "I agree that these answers are saved anonymously for a research study and may be published as overall results. Only birth year, gender and your rough city (from your internet connection) are kept: no name, birth date or birthplace."))),
        h("p.note", h("a", { href: "#/privacy" }, tx("സ്വകാര്യത", "Privacy")))),
      err,
      h("h2.ask-sub.mt-lg", tx("ആരുടെ ജാതകം?", "Whose horoscope?")),
      h("div.rows", list.map((p) => h("a.row.row-person", { href: "#", onclick: go(hrefFor(p, "study")) },
        h("span.left", h("span.avatar.avatar-lg", initialOf(p.name)), h("strong", p.name || "—")), h("span.chev", "›")))),
      h("div.bottom-bar", h("a.btn-primary-xl", { href: "#", onclick: go("#/person?for=study") }, "+ ", tx("പുതിയ ആളെ ചേർക്കുക", "Add a person"))));
  }

  function explore() {
    put(
      screenHeader({ back: "#/study" }),
      h("h1.title", tx("ആദ്യം ഒന്ന് നോക്കൂ", "First, have a look")),
      h("p.lead", tx(`${input.name || ""} എന്ന ആളുടെ ജാതകം നോക്കുകയോ ജ്യോതിഷിയുമായി സംസാരിക്കുകയോ ചെയ്യുക. തിരികെ വന്ന് ചോദ്യങ്ങൾക്ക് ഉത്തരം നൽകാം.`,
        `Look at ${input.name || "this person"}'s horoscope or talk to the astrologer, then come back here for the questions.`)),
      h("div.rows",
        h("a.row", { href: hrefFor(input, "horoscope") }, biStack("ജാതകം കാണുക", "See the horoscope"), h("span.chev", "›")),
        h("a.row", { href: hrefFor(input, "ask") }, biStack("ജ്യോതിഷിയോട് സംസാരിക്കുക", "Talk to the astrologer (up to 5 minutes)"), h("span.chev", "›"))),
      h("div.bottom-bar", h("button.btn-primary-xl", { type: "button", onclick: () => { state.step = "q"; draw(); } }, tx("ചോദ്യങ്ങൾ തുടങ്ങാം", "Start the questions"))));
  }

  function progress(n) {
    return h("div.steps", Array.from({ length: 10 }, (_, i) => h("span", { class: i < n ? "is-done" : "" })));
  }

  function question() {
    const [id, ml, en, opts] = Q[state.qi];
    put(
      h("header.screen-head",
        h("a.back-link", { href: "#", onclick: (e) => { e.preventDefault(); if (state.qi > 0) { state.qi -= 1; draw(); } else { state.step = "explore"; draw(); } } }, "‹ ", tx("തിരികെ", "Back")),
        h("span.step-count", `${state.qi + 1} / 10`)),
      progress(state.qi + 1),
      h("div.q", h("h1", tx(ml, en)), lang() !== "en" ? h("p", en) : null),
      state.qi === 0 ? h("p.note.study-note", tx("ഉത്തരം നൽകുന്നതിലൂടെ, ഈ ഉത്തരങ്ങൾ ഗവേഷണത്തിനായി പേരില്ലാതെ സൂക്ഷിക്കാൻ നിങ്ങൾ സമ്മതിക്കുന്നു (ജനനവർഷം, ലിംഗം, ഏകദേശ നഗരം മാത്രം). ", "By answering, you agree that your answers are saved anonymously for research (only birth year, gender and rough city). "),
        h("a", { href: "#/privacy" }, tx("സ്വകാര്യത", "Privacy"))) : null,
      h("div.study-options", opts.map(([v, oml, oen]) =>
        h("button.big-choice.study-choice", { type: "button", "aria-pressed": String(state.answers[id] === v), onclick: () => {
          state.answers[id] = v;
          save();
          if (state.qi < Q.length - 1) state.qi += 1;
          else state.step = "blind";
          draw();
          window.scrollTo(0, 0);
        } }, bi(oml, oen)))));
  }

  async function blindTest() {
    put(
      h("header.screen-head",
        h("a.back-link", { href: "#", onclick: (e) => { e.preventDefault(); state.step = "q"; state.qi = Q.length - 1; draw(); } }, "‹ ", tx("തിരികെ", "Back")),
        h("span.step-count", "10 / 10")),
      progress(10),
      h("div.q", h("h1", tx("ഇതിൽ ഏതാണ് ആ ആളെ കൂടുതൽ ശരിയായി വിവരിക്കുന്നത്?", "Which reading describes that person better?")),
        h("p", tx("ഒന്ന് യഥാർത്ഥ ജാതകത്തിൽ നിന്നാണ്, മറ്റേത് ക്രമരഹിതമായി തിരഞ്ഞെടുത്ത മറ്റൊരാളുടെ ജാതകത്തിൽ നിന്നും. ആലോചിച്ച് തിരഞ്ഞെടുക്കുക.",
          "One comes from their real chart, the other from a random person's chart. Read both, then choose."))));
    const box = h("div.blind-box", h("p.muted", tx("രണ്ട് വിവരണങ്ങൾ തയ്യാറാക്കുന്നു…", "Preparing two readings…")));
    put(box);
    try {
      if (!state.blind) state.blind = (await (blindP || prepareBlind())) || (await prepareBlind());
      if (!state.blind) throw new Error("no readings");
      const card = (k, text) => h("section.blind-card", h("strong", tx(`വിവരണം ${k.toUpperCase()}`, `Reading ${k.toUpperCase()}`)), h("p", text));
      const pick = (v) => () => { state.choice = v; submit(); };
      box.replaceChildren(
        card("a", state.blind.a), card("b", state.blind.b),
        h("div.study-options",
          h("button.big-choice", { type: "button", onclick: pick("a") }, tx("A ആണ് ശരി", "A fits better")),
          h("button.big-choice", { type: "button", onclick: pick("b") }, tx("B ആണ് ശരി", "B fits better")),
          h("button.big-choice", { type: "button", onclick: pick("both") }, tx("രണ്ടും ഒരുപോലെ", "Both equally")),
          h("button.big-choice", { type: "button", onclick: pick("neither") }, tx("രണ്ടും അല്ല", "Neither"))));
    } catch {
      box.replaceChildren(h("p.form-error", tx("ഇപ്പോൾ വിവരണങ്ങൾ ഉണ്ടാക്കാനായില്ല. ബാക്കി ഉത്തരങ്ങൾ മാത്രം അയയ്ക്കാം.", "Couldn't prepare the readings right now. You can send the other answers.")),
        h("button.btn-primary-xl", { type: "button", onclick: () => submit() }, tx("ഉത്തരങ്ങൾ അയയ്ക്കുക", "Send my answers")));
    }
  }

  async function submit() {
    state.step = "done";
    const d = await save({ blind: state.blind && state.choice ? { ticket: state.blind.ticket, choice: state.choice } : null, done: true });
    state.realIs = d?.realIs || null;
    track("study_done", { blind: state.choice || "none", picked_real: state.realIs ? state.choice === state.realIs : null });
    draw();
  }


  function done() {
    let verdict = null;
    if (state.realIs && state.choice) {
      const r = state.realIs.toUpperCase();
      verdict = state.choice === state.realIs
        ? tx(`ശരിയായ ജാതകത്തിൽ നിന്നുള്ളത് ${r} ആയിരുന്നു. നിങ്ങൾ അത് തന്നെ തിരഞ്ഞെടുത്തു.`, `The real chart's reading was ${r}, and that is the one you picked.`)
        : ["both", "neither"].includes(state.choice)
          ? tx(`ശരിയായ ജാതകത്തിൽ നിന്നുള്ളത് ${r} ആയിരുന്നു.`, `The real chart's reading was ${r}.`)
          : tx(`ശരിയായ ജാതകത്തിൽ നിന്നുള്ളത് ${r} ആയിരുന്നു. നിങ്ങൾ മറ്റേതാണ് തിരഞ്ഞെടുത്തത്.`, `The real chart's reading was ${r}; you picked the other one.`);
    }
    put(
      screenHeader({ back: "#/" }),
      h("h1.title", tx("നന്ദി!", "Thank you!")),
      verdict && h("p.study-verdict", verdict),
      h("p.lead", tx("ജ്യോതിഷം ശരിക്കും പ്രവർത്തിക്കുന്നുണ്ടെങ്കിൽ, കൂടുതൽ ആളുകളും സ്വന്തം വിവരണം പകുതിയിലേറെ തവണ തിരിച്ചറിയണം. ഒരാളുടെ ഉത്തരം കൊണ്ട് ഒന്നും പറയാനാവില്ല; ധാരാളം ഉത്തരങ്ങൾ ചേരുമ്പോഴാണ് ഉത്തരം കിട്ടുക.",
        "If astrology really works, people should recognise their own reading much more than half the time. One answer says nothing on its own; the result comes from many answers together.")),
      h("div.form-stack.mt-lg",
        h("a.btn-secondary-xl", { href: "#/" }, tx("ഹോം", "Home"))));
  }

  draw();
}
