// Talk to the astrologer: a simple, large-type screen for elders. Pick or enter a person,
// then have a live voice call with an AI astrologer who has studied that horoscope.
// The chart is computed here; api/live-token.js turns it into a locked, single-use call token.
import "../../styles/ask.css";
import { h } from "../../lib/dom.js";
import { tx, lang } from "../../lib/i18n.js";
import { setUI, listCharts, saveChart } from "../../lib/store.js";
import { getCtx, inputToQuery, queryToInput } from "../../lib/ctx.js";
import { birthForm } from "../../components/birth-form.js";
import { chartSummary } from "../../engine/chart-summary.js";
import { NAK_EN, RASI_ML, RASI_EN } from "../../engine/names.js";
import { APP_NAME_ML, APP_NAME } from "../../lib/edition.js";
import { LiveCall } from "./call.js";

const FAMILY_KEY = "ag.family";
function familyCode(value) {
  try {
    if (value !== undefined) localStorage.setItem(FAMILY_KEY, value);
    return localStorage.getItem(FAMILY_KEY) || "";
  } catch {
    return value || "";
  }
}

const ICON = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z"/></svg>',
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z"/></svg>',
  micOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 11h-2a5 5 0 0 1-.4 1.97l1.5 1.5A6.9 6.9 0 0 0 19 11zm-4 .17V5a3 3 0 0 0-5.94-.6L15 10.35zM4.27 3 3 4.27l6 6V11a3 3 0 0 0 4.5 2.6l1.65 1.65A5 5 0 0 1 7 11H5a7 7 0 0 0 6 6.92V21h2v-3.08a6.9 6.9 0 0 0 3.6-1.5L19.73 21 21 19.73z"/></svg>',
};
const icon = (name) => {
  const s = h("span.ask-icon");
  s.innerHTML = ICON[name];
  return s;
};

export function render(el, params) {
  // family link: remember the code, then drop it from the address bar
  if (params.k) {
    familyCode(params.k);
    const rest = { ...params };
    delete rest.k;
    const q = new URLSearchParams(rest).toString();
    history.replaceState(null, "", "#/ask" + (q ? "?" + q : ""));
  }
  el.classList.add("ask");
  const input = queryToInput(params);
  el.append(header(input));
  if (!input) pickPerson(el);
  else callScreen(el, input);
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
    h("h1.ask-title", tx("ജ്യോതിഷനുമായി സംസാരിക്കാം", "Talk to the astrologer")),
    h("p.ask-lead", tx("ആരുടെ ജാതകമാണ് നോക്കേണ്ടത്?", "Whose horoscope shall we look at?")),
    people.length > 0 && h("div.ask-people", people.map((c) =>
      h("a.ask-person", { href: "#/ask?" + inputToQuery(c) },
        h("strong", c.name || "—"),
        h("span", `${c.date.split("-").reverse().join("-")} · ${c.time} · ${(c.place?.name || "").split(",")[0]}`)))),
    h("h2.ask-sub", people.length ? tx("പുതിയ ആൾ", "Someone new") : tx("ജനന വിവരങ്ങൾ", "Birth details")),
    birthForm({}, {
      submitLabel: tx("തുടരുക", "Continue"),
      emptyPlace: true,
      onSubmit: (i) => {
        const exists = listCharts().find((c) => c.name === i.name && c.date === i.date && c.time === i.time);
        const saved = exists || saveChart({ ...i, name: i.name || tx("പേരില്ല", "No name"), kind: "birth" });
        location.hash = "#/ask?" + inputToQuery(saved);
      },
    }),
    h("p.ask-small", h("a", { href: "#/horoscope" }, tx("എല്ലാ ജ്യോതിഷ ഉപകരണങ്ങളും →", "All astrology tools →"))),
  ].filter(Boolean));
}

async function callScreen(el, input) {
  const ctx = await getCtx();
  const { text: facts, chart } = chartSummary(ctx, input);
  const T = chart.time;
  const nakMl = ctx.db.tblMalayalamNakshatra[T.nakIdx - 1].Name;

  const status = h("p.call-status", { role: "status" }, tx("വിളിക്കാൻ പച്ച ബട്ടൺ അമർത്തുക", "Press the green button to call"));
  const timer = h("p.call-timer", { hidden: true }, "0:00");
  const avatar = h("div.call-avatar", h("img", { src: "/logo-mark.png", alt: "" }));
  const callBtn = h("button.call-btn.call-start", { type: "button", "aria-label": tx("വിളിക്കുക", "Call") }, icon("phone"), h("span", tx("വിളിക്കുക", "Call")));
  const muteBtn = h("button.call-btn.call-mute", { type: "button", hidden: true, "aria-pressed": "false" }, icon("mic"), h("span", tx("മ്യൂട്ട്", "Mute")));
  const endBtn = h("button.call-btn.call-end", { type: "button", hidden: true, "aria-label": tx("കോൾ അവസാനിപ്പിക്കുക", "End call") }, icon("phone"), h("span", tx("അവസാനിപ്പിക്കുക", "End")));
  const stage = h("section.call-stage", { "data-state": "idle" },
    avatar,
    h("h2.call-name", tx("ജ്യോതിഷി", "Astrologer")),
    h("p.call-about", tx(`${input.name || ""} · ${nakMl} നക്ഷത്രം · ${RASI_ML[chart.planets.Moon.rasi]} കൂറ്`,
      `${input.name || ""} · ${NAK_EN[T.nakIdx - 1]} star · Moon in ${RASI_EN[chart.planets.Moon.rasi]}`)),
    status, timer,
    h("div.call-controls", muteBtn, callBtn, endBtn));
  el.append(stage,
    h("p.ask-small.call-note", tx("ജ്യോതിഷി സംസാരിക്കുമ്പോൾ ഇടയ്ക്ക് കയറി സംസാരിക്കാം. ജ്യോതിഷം ഒരു വഴികാട്ടി മാത്രമാണ്; ആരോഗ്യം, പണം, നിയമം എന്നിവയിൽ വിദഗ്ധരുടെ ഉപദേശം തേടുക.",
      "You can interrupt the astrologer at any time. Astrology is guidance only; for health, money or legal matters, consult a professional.")),
    h("p.ask-small", h("a", { href: "#/horoscope?" + inputToQuery(input) }, tx("ഗ്രഹനില കാണുക", "See the chart"))));

  let call = null;
  let started = 0;
  let clock = 0;
  const setStatus = (s) => {
    stage.dataset.state = s;
    status.textContent = {
      connecting: tx("ബന്ധിപ്പിക്കുന്നു…", "Connecting…"),
      listening: tx("കേൾക്കുന്നു…", "Listening…"),
      speaking: tx("ജ്യോതിഷി സംസാരിക്കുന്നു", "The astrologer is speaking"),
      ended: tx("കോൾ അവസാനിച്ചു", "Call ended"),
      error: tx("കോൾ മുറിഞ്ഞു. വീണ്ടും വിളിക്കാം.", "The call dropped. You can call again."),
    }[s] || "";
    const live = s === "connecting" || s === "listening" || s === "speaking";
    callBtn.hidden = live;
    endBtn.hidden = !live;
    muteBtn.hidden = !live || s === "connecting";
    timer.hidden = !live || s === "connecting";
    if (!live) {
      clearInterval(clock);
      call = null;
      muteBtn.setAttribute("aria-pressed", "false");
      muteBtn.replaceChildren(icon("mic"), h("span", tx("മ്യൂട്ട്", "Mute")));
    }
  };

  callBtn.addEventListener("click", async () => {
    setStatus("connecting");
    try {
      const res = await fetch("/api/live-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: familyCode(), lang: lang(), chart: facts }),
      });
      if (res.status === 401) throw new Error(tx("ഈ സൗകര്യം കുടുംബ ലിങ്ക് വഴി തുറന്നാൽ മാത്രമേ പ്രവർത്തിക്കൂ. ലിങ്ക് അയച്ചുതന്ന ആളോട് ചോദിക്കുക.", "This only works when opened from the family link. Ask the person who shared it."));
      if (res.status === 429) throw new Error(tx("ഒരുപാട് കോളുകൾ ആയി. കുറച്ചു കഴിഞ്ഞ് വിളിക്കുക.", "Too many calls. Please try again later."));
      if (!res.ok) throw new Error(tx("ഇപ്പോൾ ബന്ധിപ്പിക്കാൻ കഴിയുന്നില്ല. കുറച്ചു കഴിഞ്ഞ് ശ്രമിക്കുക.", "Can't connect right now. Please try again shortly."));
      const { token, model } = await res.json();
      call = new LiveCall({
        token, model,
        greeting: tx("(ഫോൺ കോൾ ബന്ധിപ്പിച്ചു. ദയവായി അഭിവാദ്യം ചെയ്ത് തുടങ്ങുക.)", "(The phone call has connected. Please greet and begin.)"),
        onState: (s) => {
          if (s === "listening" && !started) {
            started = Date.now();
            clock = setInterval(() => {
              const sec = Math.floor((Date.now() - started) / 1000);
              timer.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
            }, 500);
          }
          if (stage.dataset.state !== "ended") setStatus(s);
        },
        onLevel: ({ me, them }) => {
          stage.style.setProperty("--them", them.toFixed(3));
          stage.style.setProperty("--me", me.toFixed(3));
        },
        onError: (err) => console.warn("call", err),
      });
      started = 0;
      await call.start();
    } catch (err) {
      call?.hangup();
      setStatus("error");
      const denied = err?.name === "NotAllowedError" || err?.name === "SecurityError";
      status.textContent = denied
        ? tx("മൈക്രോഫോൺ അനുവദിക്കണം. ബ്രൗസറിലെ ക്രമീകരണങ്ങളിൽ മൈക്രോഫോൺ അനുമതി നൽകുക.", "Please allow the microphone in your browser settings.")
        : err.message || String(err);
    }
  });
  endBtn.addEventListener("click", () => {
    call?.hangup();
    setStatus("ended");
  });
  muteBtn.addEventListener("click", () => {
    if (!call) return;
    const m = muteBtn.getAttribute("aria-pressed") !== "true";
    call.setMuted(m);
    muteBtn.setAttribute("aria-pressed", String(m));
    muteBtn.replaceChildren(icon(m ? "micOff" : "mic"), h("span", m ? tx("മ്യൂട്ട് മാറ്റുക", "Unmute") : tx("മ്യൂട്ട്", "Mute")));
  });
  // leaving the page ends the call
  const leave = () => {
    call?.hangup();
    window.removeEventListener("hashchange", leave);
  };
  window.addEventListener("hashchange", leave);
}
