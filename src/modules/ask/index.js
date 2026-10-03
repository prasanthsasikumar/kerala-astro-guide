// Ask the astrologer: a simple, large-text screen for elders. Pick or enter a person, then chat.
// The chart is computed here; the AI astrologer (api/astrologer.js) only explains it.
import "../../styles/ask.css";
import { h, clear } from "../../lib/dom.js";
import { tx, lang } from "../../lib/i18n.js";
import { setUI, listCharts, saveChart } from "../../lib/store.js";
import { getCtx, inputToQuery, queryToInput } from "../../lib/ctx.js";
import { birthForm } from "../../components/birth-form.js";
import { chartSummary } from "../../engine/chart-summary.js";
import { NAK_EN, RASI_ML, RASI_EN } from "../../engine/names.js";
import { APP_NAME_ML, APP_NAME } from "../../lib/edition.js";

const FAMILY_KEY = "ag.family";
const convKey = (input) => "ag.chat." + [input.name, input.date, input.time, (+input.place.lat).toFixed(3), (+input.place.lon).toFixed(3)].join("|");

function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key) || "null");
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return null;
  }
  return value;
}

export function render(el, params) {
  // family link: remember the code, then drop it from the address bar
  if (params.k) {
    store(FAMILY_KEY, params.k);
    const rest = { ...params };
    delete rest.k;
    const q = new URLSearchParams(rest).toString();
    history.replaceState(null, "", "#/ask" + (q ? "?" + q : ""));
  }
  el.classList.add("ask");
  const input = queryToInput(params);
  el.append(header(input));
  if (!input) pickPerson(el, params);
  else chat(el, input);
}

function header(input) {
  return h("header.ask-head",
    h("div.ask-brand", h("img.brand-logo", { src: "/logo-mark.png", alt: "", width: 36, height: 36 }), h("span", lang() === "en" ? APP_NAME : APP_NAME_ML)),
    h("div.ask-head-actions",
      input && h("a.btn", { href: "#/ask" }, tx("മറ്റൊരാൾ", "Another person")),
      h("div.seg", { role: "group", "aria-label": "Language" },
        [["ml", "മലയാളം"], ["en", "English"]].map(([k, label]) =>
          h("button", { type: "button", "aria-pressed": String(lang() === k), onclick: () => setUI({ lang: k }) }, label)))));
}

function pickPerson(el) {
  const people = listCharts();
  el.append(...[
    h("h1.ask-title", tx("ജ്യോതിഷനോട് ചോദിക്കാം", "Ask the astrologer")),
    h("p.ask-lead", tx("ആരുടെ ജാതകമാണ് നോക്കേണ്ടത്?", "Whose horoscope shall we look at?")),
    people.length > 0 && h("div.ask-people", people.map((c) =>
      h("a.ask-person", { href: "#/ask?" + inputToQuery(c) },
        h("strong", c.name || "—"),
        h("span", `${c.date.split("-").reverse().join("-")} · ${c.time} · ${(c.place?.name || "").split(",")[0]}`)))),
    h("h2.ask-sub", people.length ? tx("പുതിയ ആൾ", "Someone new") : tx("ജനന വിവരങ്ങൾ", "Birth details")),
    birthForm({}, {
      submitLabel: tx("ജ്യോതിഷനോട് ചോദിക്കുക", "Ask the astrologer"),
      onSubmit: (i) => {
        const exists = listCharts().find((c) => c.name === i.name && c.date === i.date && c.time === i.time);
        const saved = exists || saveChart({ ...i, name: i.name || tx("പേരില്ല", "No name"), kind: "birth" });
        location.hash = "#/ask?" + inputToQuery(saved);
      },
    }),
    h("p.ask-small", h("a", { href: "#/horoscope" }, tx("എല്ലാ ജ്യോതിഷ ഉപകരണങ്ങളും →", "All astrology tools →"))),
  ].filter(Boolean));
}

const SUGGEST = [
  ["എന്റെ ജാതകം ചുരുക്കി പറയാമോ?", "Can you summarise this horoscope?"],
  ["ഇപ്പോഴത്തെ ദശാകാലം എങ്ങനെയാണ്?", "How is the current dasa period?"],
  ["ഈ വർഷം എങ്ങനെ?", "How will this year be?"],
  ["ജോലിയും സാമ്പത്തികവും", "Career and finances"],
  ["വിവാഹവും കുടുംബവും", "Marriage and family"],
  ["ആരോഗ്യം", "Health"],
  ["എന്തെങ്കിലും പരിഹാരങ്ങൾ വേണോ?", "Are any remedies needed?"],
];

async function chat(el, input) {
  const loading = h("p.ask-lead", tx("ജാതകം ഗണിക്കുന്നു…", "Calculating the horoscope…"));
  el.append(loading);
  const ctx = await getCtx();
  const { text: facts, chart } = chartSummary(ctx, input);
  loading.remove();
  const T = chart.time;
  const nakMl = ctx.db.tblMalayalamNakshatra[T.nakIdx - 1].Name;
  el.append(h("div.ask-person-card",
    h("strong", input.name || "—"),
    h("span", tx(`${nakMl} നക്ഷത്രം · ${RASI_ML[chart.planets.Moon.rasi]} കൂറ് · ${RASI_ML[chart.planets.Lagna.rasi]} ലഗ്നം`,
      `${NAK_EN[T.nakIdx - 1]} star · Moon in ${RASI_EN[chart.planets.Moon.rasi]} · ${RASI_EN[chart.planets.Lagna.rasi]} lagna`)),
    h("a", { href: "#/horoscope?" + inputToQuery(input) }, tx("ഗ്രഹനില കാണുക", "See the chart"))));

  const key = convKey(input);
  let messages = store(key) || [];
  const log = h("div.ask-log", { "aria-live": "polite" });
  const chips = h("div.ask-chips", SUGGEST.map(([ml, en]) => h("button.ask-chip", { type: "button", onclick: () => send(tx(ml, en)) }, tx(ml, en))));
  const box = h("textarea.input.ask-input", { rows: 2, placeholder: tx("ഇവിടെ ചോദ്യം എഴുതുക…", "Type your question…") });
  const sendBtn = h("button.btn.btn-primary.ask-send", { type: "submit" }, tx("ചോദിക്കുക", "Ask"));
  const form = h("form.ask-form", { onsubmit: (e) => { e.preventDefault(); send(box.value); } }, box, micButton(box), sendBtn);
  if (!form.querySelector(".ask-mic")) form.classList.add("no-mic");
  box.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(box.value); }
  });
  el.append(...[log, chips, form,
    h("p.ask-small", tx("ജ്യോതിഷം ഒരു വഴികാട്ടി മാത്രമാണ്. ആരോഗ്യം, പണം, നിയമം എന്നിവയിൽ വിദഗ്ധരുടെ ഉപദേശം തേടുക.",
      "Astrology is guidance only. For health, money or legal matters, consult a professional.")),
    messages.length ? h("p.ask-small", h("button.btn.btn-ghost.btn-sm", { type: "button", onclick: () => { messages = []; store(key, messages); log.replaceChildren(); chips.hidden = false; } }, tx("സംഭാഷണം മായ്ക്കുക", "Clear conversation"))) : null].filter(Boolean));

  for (const m of messages) log.append(bubble(m.role, m.text));
  chips.hidden = messages.length > 0;
  if (messages.length) log.lastElementChild?.scrollIntoView({ block: "end" });

  let busy = false;
  async function send(q) {
    q = q.trim();
    if (!q || busy) return;
    busy = true;
    sendBtn.disabled = true;
    sendBtn.dataset.state = "loading";
    chips.hidden = true;
    box.value = "";
    messages.push({ role: "user", text: q });
    log.append(bubble("user", q));
    const out = bubble("model", "");
    out.classList.add("is-thinking");
    out.querySelector(".ask-text").textContent = tx("ജ്യോതിഷി ആലോചിക്കുന്നു…", "The astrologer is thinking…");
    log.append(out);
    out.scrollIntoView({ block: "end", behavior: "smooth" });
    let answer = "";
    try {
      const res = await fetch("/api/astrologer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: store(FAMILY_KEY) || "", lang: lang(), chart: facts, messages }),
      });
      if (res.status === 401) throw new Error(tx("ഈ സൗകര്യം കുടുംബ ലിങ്ക് വഴി തുറന്നാൽ മാത്രമേ പ്രവർത്തിക്കൂ. ലിങ്ക് അയച്ചുതന്ന ആളോട് ചോദിക്കുക.", "This feature only works when opened from the family link. Ask the person who shared it."));
      if (!res.ok || !res.body) throw new Error((await res.text()) || "Error");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      out.classList.remove("is-thinking");
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += dec.decode(value, { stream: true });
        setRich(out.querySelector(".ask-text"), answer);
      }
      if (!answer.trim()) throw new Error(tx("മറുപടി ലഭിച്ചില്ല. വീണ്ടും ശ്രമിക്കുക.", "No answer came back. Please try again."));
      messages.push({ role: "model", text: answer });
      store(key, messages);
      addSpeak(out, answer);
    } catch (err) {
      messages.pop();
      out.classList.remove("is-thinking");
      out.classList.add("is-error");
      out.querySelector(".ask-text").textContent = err.message || String(err);
    } finally {
      busy = false;
      sendBtn.disabled = false;
      delete sendBtn.dataset.state;
    }
  }
}

function bubble(role, text) {
  const b = h("div", { class: `ask-msg ask-${role}` }, h("div.ask-text"));
  if (role === "model") {
    setRich(b.querySelector(".ask-text"), text);
    if (text) addSpeak(b, text);
  } else b.querySelector(".ask-text").textContent = text;
  return b;
}

// minimal, safe formatting for model text: paragraphs, bullet lines, **bold**
function setRich(node, text) {
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const html = esc(text).split(/\n{2,}/).map((para) => {
    const lines = para.split("\n");
    if (lines.every((l) => /^\s*([*-]|\d+\.)\s+/.test(l)))
      return "<ul>" + lines.map((l) => "<li>" + l.replace(/^\s*([*-]|\d+\.)\s+/, "") + "</li>").join("") + "</ul>";
    return "<p>" + lines.join("<br>") + "</p>";
  }).join("").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  node.innerHTML = html;
}

function addSpeak(b, text) {
  if (!("speechSynthesis" in window) || b.querySelector(".ask-speak")) return;
  const want = lang() === "en" ? "en" : "ml";
  const voice = () => speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith(want));
  const btn = h("button.btn.btn-sm.btn-ghost.ask-speak", { type: "button", hidden: true }, tx("🔊 കേൾക്കുക", "🔊 Listen"));
  btn.addEventListener("click", () => {
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
    const u = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ""));
    u.voice = voice();
    u.lang = u.voice?.lang || (want === "ml" ? "ml-IN" : "en-IN");
    u.rate = 0.95;
    speechSynthesis.speak(u);
  });
  const check = () => { btn.hidden = !voice(); };
  check();
  speechSynthesis.addEventListener?.("voiceschanged", check);
  b.append(btn);
}

function micButton(box) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const btn = h("button.btn.ask-mic", { type: "button", "aria-label": tx("സംസാരിക്കുക", "Speak") }, "🎤");
  let rec = null;
  btn.addEventListener("click", () => {
    if (rec) { rec.stop(); return; }
    rec = new SR();
    rec.lang = lang() === "en" ? "en-IN" : "ml-IN";
    rec.interimResults = true;
    const start = box.value ? box.value.trimEnd() + " " : "";
    rec.onresult = (e) => { box.value = start + [...e.results].map((r) => r[0].transcript).join(" "); };
    rec.onend = () => { rec = null; btn.removeAttribute("data-state"); };
    rec.onerror = () => { rec = null; btn.removeAttribute("data-state"); };
    btn.dataset.state = "loading";
    rec.start();
  });
  return btn;
}
