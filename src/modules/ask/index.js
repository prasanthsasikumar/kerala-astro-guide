// The main screen: talk to the astrologer. Mobile-first and deliberately simple:
// home (saved people) -> birth details -> voice call. The chart is computed in the browser;
// api/live-token.js turns it into a locked, single-use call token.
import "../../styles/ask.css";
import { h } from "../../lib/dom.js";
import { tx, lang } from "../../lib/i18n.js";
import { setUI, listCharts, saveChart, deleteChart } from "../../lib/store.js";
import { getCtx, inputToQuery, queryToInput } from "../../lib/ctx.js";
import { placePicker } from "../../components/place-picker.js";
import { tzOffsetAt } from "../../lib/edition.js";
import { chartSummary } from "../../engine/chart-summary.js";
import { NAK_EN, RASI_ML, RASI_EN } from "../../engine/names.js";
import { APP_NAME_ML, APP_NAME } from "../../lib/edition.js";
import { track } from "../../lib/analytics.js";
import { LiveCall } from "./call.js";
import { setNavGuard, clearNavGuard } from "../../lib/nav-guard.js";

// 5 minutes; a shorter limit can be set for testing on the local dev server only (?limit=40)
const CALL_LIMIT_SEC = (location.hostname === "127.0.0.1" && +new URLSearchParams(location.hash.split("?")[1]).get("limit")) || 5 * 60;

const ICON = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z"/></svg>',
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z"/></svg>',
  micOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 11h-2a5 5 0 0 1-.4 1.97l1.5 1.5A6.9 6.9 0 0 0 19 11zm-4 .17V5a3 3 0 0 0-5.94-.6L15 10.35zM4.27 3 3 4.27l6 6V11a3 3 0 0 0 4.5 2.6l1.65 1.65A5 5 0 0 1 7 11H5a7 7 0 0 0 6 6.92V21h2v-3.08a6.9 6.9 0 0 0 3.6-1.5L19.73 21 21 19.73z"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.6 16.6 13.2 12 8.6 7.4 10 6l6 6-6 6z"/></svg>',
};
const icon = (name, cls = "ask-icon") => {
  const s = h("span", { class: cls });
  s.innerHTML = ICON[name];
  return s;
};

const personQuery = (c) => inputToQuery(c) + (c.timeUnknown ? "&tu=1" : "");
const initial = (name) => (name || "?").trim().charAt(0).toUpperCase();
const shortPlace = (c) => (c.place?.name || "").split(",")[0];
const fmtDate = (d) => d.split("-").reverse().join("-");

export function render(el, params) {
  el.classList.add("ask");
  const people = listCharts();
  const input = queryToInput(params);
  if (input) {
    input.timeUnknown = params.tu === "1";
    return callScreen(el, input);
  }
  if (params.edit) {
    const c = people.find((p) => p.id === params.edit);
    if (c) return formScreen(el, c, people.length > 0);
  }
  if (params.new === "1" || people.length === 0) return formScreen(el, null, people.length > 0);
  homeScreen(el, people);
}

function topBar({ back } = {}) {
  return h("header.ask-top",
    back
      ? h("a.ask-back", { href: back, "aria-label": tx("തിരികെ", "Back") }, icon("back", "ask-icon-sm"))
      : h("div.ask-brand", h("img.brand-logo", { src: "/logo-mark.png", alt: "", width: 30, height: 30 }), h("span", lang() === "en" ? APP_NAME : APP_NAME_ML)),
    h("button.ask-lang", {
      type: "button",
      onclick: () => {
        const next = lang() === "en" ? "ml" : "en";
        track("language_switch", { to: next });
        setUI({ lang: next });
      },
    }, lang() === "en" ? "മലയാളം" : "English"));
}

function footer() {
  return h("footer.ask-foot",
    h("a", { href: "#/horoscope" }, tx("എല്ലാ ജ്യോതിഷ ഉപകരണങ്ങളും", "All astrology tools")),
    h("span", "·"),
    h("a", { href: "#/privacy" }, tx("സ്വകാര്യത", "Privacy")));
}

// ---------- 1. home ----------
function homeScreen(el, people) {
  el.append(
    topBar(),
    h("section.ask-hero",
      h("div.ask-hero-avatar", h("img", { src: "/logo-mark.png", alt: "" })),
      h("h1", tx("ജ്യോതിഷനോട് സംസാരിക്കാം", "Talk to the astrologer")),
      h("p", tx("ഫോണിൽ സംസാരിക്കുന്നതുപോലെ, മലയാളത്തിൽ.", "Just like a phone call."))),
    h("h2.ask-label", tx("ആരുടെ ജാതകം?", "Whose horoscope?")),
    h("div.ask-people", people.map((c) =>
      h("a.ask-person", { href: "#/ask?" + personQuery(c) },
        h("span.ask-person-initial", initial(c.name)),
        h("span.ask-person-text", h("strong", c.name || "—"), h("span", `${fmtDate(c.date)} · ${shortPlace(c)}`)),
        icon("chevron", "ask-icon-sm")))),
    h("a.ask-add", { href: "#/ask?new=1" }, icon("plus", "ask-icon-sm"), tx("പുതിയ ആളെ ചേർക്കുക", "Add a person")),
    footer());
}

// ---------- 2. birth details ----------
function formScreen(el, existing, hasPeople) {
  const v = existing || { name: "", gender: "", date: "", time: "", place: null, timeUnknown: false };
  let gender = v.gender;
  let place = v.place;
  const name = h("input.input", { type: "text", value: v.name, autocomplete: "off", enterkeyhint: "next", required: true });
  const gBtns = [["Male", "പുരുഷൻ", "Male"], ["Female", "സ്ത്രീ", "Female"]].map(([val, ml, en]) =>
    h("button.ask-choice", { type: "button", "aria-pressed": String(gender === val), onclick: () => { gender = val; gBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(i === (val === "Male" ? 0 : 1)))); } }, tx(ml, en)));
  const date = h("input.input", { type: "date", value: v.date, min: "1800-01-01", max: "2399-12-31", required: true });
  const time = h("input.input", { type: "time", value: v.timeUnknown ? "" : v.time });
  const unknown = h("input", { type: "checkbox", checked: !!v.timeUnknown });
  const syncTime = () => { time.disabled = unknown.checked; if (unknown.checked) time.value = ""; };
  unknown.addEventListener("change", syncTime);
  syncTime();
  const error = h("p.ask-error", { role: "alert", hidden: true });

  const form = h("form.ask-form", {
    novalidate: true,
    onsubmit: (e) => {
      e.preventDefault();
      const miss = !name.value.trim() ? tx("പേര് എഴുതുക", "Enter a name")
        : !gender ? tx("പുരുഷനോ സ്ത്രീയോ എന്ന് തിരഞ്ഞെടുക്കുക", "Choose male or female")
        : !date.value ? tx("ജനന തീയതി നൽകുക", "Enter the date of birth")
        : !unknown.checked && !time.value ? tx("ജനന സമയം നൽകുക, അല്ലെങ്കിൽ 'സമയം അറിയില്ല' തിരഞ്ഞെടുക്കുക", "Enter the birth time, or tick 'time not known'")
        : !Number.isFinite(place?.lat) ? tx("ജനിച്ച സ്ഥലം ലിസ്റ്റിൽ നിന്ന് തിരഞ്ഞെടുക്കുക", "Pick the birth place from the list")
        : "";
      if (miss) {
        error.textContent = miss;
        error.hidden = false;
        return;
      }
      const t = unknown.checked ? "12:00" : time.value;
      const p = place.tzName ? { ...place, tz: tzOffsetAt(place.tzName, date.value, t) } : place;
      const saved = saveChart({ ...(existing || {}), name: name.value.trim(), gender, date: date.value, time: t, timeUnknown: unknown.checked, place: p, kind: "birth" });
      if (!existing) track("person_added", { time_unknown: unknown.checked });
      location.hash = "#/ask?" + personQuery(saved);
    },
  },
    h("label.ask-field", h("span", tx("പേര്", "Name")), name),
    h("div.ask-field", h("span", tx("ആൺ / പെൺ", "Male / female")), h("div.ask-choices", gBtns)),
    h("label.ask-field", h("span", tx("ജനന തീയതി", "Date of birth")), date),
    h("div.ask-field",
      h("label", { for: "ask-time" }, tx("ജനന സമയം", "Time of birth")),
      Object.assign(time, { id: "ask-time" }),
      h("label.ask-check", unknown, h("span", tx("സമയം കൃത്യമായി അറിയില്ല", "I don't know the exact time")))),
    h("div.ask-field.ask-place", h("span", tx("ജനിച്ച സ്ഥലം", "Place of birth")), placePicker(place, (p) => { place = p; })),
    error,
    h("div.ask-sticky", h("button.ask-primary", { type: "submit" }, tx("തുടരുക", "Continue"))));

  el.append(...[
    topBar({ back: hasPeople ? "#/ask" : null }),
    h("h1.ask-title", existing ? tx("വിവരങ്ങൾ മാറ്റുക", "Edit details") : tx("ആരുടെ ജാതകമാണ് നോക്കേണ്ടത്?", "Whose horoscope shall we look at?")),
    form,
    existing && h("button.ask-link-danger", {
      type: "button",
      onclick: () => {
        if (!confirm(tx("ഈ ആളെ നീക്കം ചെയ്യട്ടെ?", "Remove this person?"))) return;
        deleteChart(existing.id);
        location.hash = "#/ask";
      },
    }, tx("ഈ ആളെ നീക്കം ചെയ്യുക", "Remove this person")),
    footer(),
  ].filter(Boolean));
}

// ---------- 3. the call ----------
async function callScreen(el, input) {
  el.append(topBar({ back: "#/ask" }));
  const ctx = await getCtx();
  const { text: facts, chart } = chartSummary(ctx, input);
  const T = chart.time;
  const nakMl = ctx.db.tblMalayalamNakshatra[T.nakIdx - 1].Name;
  const star = `${NAK_EN[T.nakIdx - 1]} / ${RASI_EN[chart.planets.Moon.rasi]}`;

  const status = h("p.call-status", { role: "status" }, tx("വിളിക്കാൻ പച്ച ബട്ടൺ അമർത്തുക", "Press the green button to call"));
  const timer = h("p.call-timer", { hidden: true }, "0:00");
  const callBtn = h("button.call-btn.call-start", { type: "button" }, icon("phone"), h("span", tx("വിളിക്കുക", "Call")));
  const muteBtn = h("button.call-btn.call-mute", { type: "button", hidden: true, "aria-pressed": "false" }, icon("mic"), h("span", tx("മ്യൂട്ട്", "Mute")));
  const endBtn = h("button.call-btn.call-end", { type: "button", hidden: true }, icon("phone"), h("span", tx("അവസാനിപ്പിക്കുക", "End")));
  const notice = h("p.call-consent",
    tx("വിളിക്കുമ്പോൾ, പേരും ജനന വിവരങ്ങളും സംഭാഷണവും സേവനം മെച്ചപ്പെടുത്താനായി സൂക്ഷിക്കും. ", "By calling, you agree that the name, birth details and conversation are saved to improve the service. "),
    h("a", { href: "#/privacy" }, tx("സ്വകാര്യത", "Privacy")));
  const stage = h("section.call-stage", { "data-state": "idle" },
    h("div.call-avatar", h("img", { src: "/logo-mark.png", alt: "" })),
    h("h1.call-name", tx("ജ്യോതിഷി", "Astrologer")),
    h("p.call-about", input.name || "", " · ", tx(`${nakMl} നക്ഷത്രം`, `${NAK_EN[T.nakIdx - 1]} star`),
      input.timeUnknown ? h("span.call-flag", tx(" · സമയം അറിയില്ല", " · time unknown")) : null),
    status, timer);
  const dock = h("div.call-dock",
    h("div.call-controls", muteBtn, callBtn, endBtn),
    notice);
  // the chart opens over the call screen, so a call in progress is never interrupted
  const editLink = input.id ? h("a", { href: `#/ask?edit=${input.id}` }, tx("വിവരങ്ങൾ മാറ്റുക", "Edit details")) : null;
  const sep = editLink ? h("span", "·") : null;
  const chartBtn = h("button.ask-textbtn", { type: "button", onclick: () => { track("chart_opened", { in_call: !!call }); openChartSheet(chart, ctx, !!call); } }, tx("ഗ്രഹനില കാണുക", "See the chart"));
  el.append(stage, dock, h("p.ask-under", editLink, sep, chartBtn));
  const myHash = location.hash;

  let call = null;
  let started = 0;
  let clock = 0;
  let session = null;
  let saveTimer = 0;
  let limitTimer = 0;
  // while a call is live, leaving the screen asks first (the call ends only if they agree)
  const guard = () => {
    if (!call) return true;
    const ok = confirm(tx("കോൾ അവസാനിപ്പിക്കട്ടെ?", "End the call?"));
    if (ok) {
      const c = call;
      finish("left_page");
      c.hangup();
    }
    return ok;
  };
  const onBeforeUnload = (e) => {
    if (!call) return;
    e.preventDefault();
    e.returnValue = "";
  };
  const person = () => ({ name: input.name, gender: input.gender, date: input.date, time: input.time, timeUnknown: !!input.timeUnknown, place: input.place });
  const payload = (end) => ({
    ...session, person: person(), star, lang: lang(), startedAt: new Date(started || Date.now()).toISOString(),
    durationSec: started ? Math.round((Date.now() - started) / 1000) : 0, transcript: call?.transcript || [], end,
  });
  const saveLog = (end = false, beacon = false) => {
    if (!session) return;
    const body = JSON.stringify(payload(end));
    if (beacon && navigator.sendBeacon) navigator.sendBeacon("/api/log", new Blob([body], { type: "application/json" }));
    else fetch("/api/log", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
  };

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
    notice.hidden = live;
    if (editLink) { editLink.hidden = live; sep.hidden = live; }
    if (live) {
      setNavGuard(guard);
      window.addEventListener("beforeunload", onBeforeUnload);
    } else {
      clearNavGuard(guard);
      window.removeEventListener("beforeunload", onBeforeUnload);
      timer.classList.remove("is-ending");
      clearInterval(clock);
      clearInterval(saveTimer);
      clearInterval(limitTimer);
      muteBtn.setAttribute("aria-pressed", "false");
      muteBtn.replaceChildren(icon("mic"), h("span", tx("മ്യൂട്ട്", "Mute")));
    }
  };
  const finish = (reason) => {
    if (!call && !session) return;
    const dur = started ? Math.round((Date.now() - started) / 1000) : 0;
    if (started) track("call_end", { duration_sec: dur, reason, turns: call?.transcript?.length || 0 });
    saveLog(true);
    call = null;
    session = null;
  };

  callBtn.addEventListener("click", async () => {
    setStatus("connecting");
    track("call_start", { lang: lang(), time_unknown: !!input.timeUnknown });
    const t0 = Date.now();
    started = 0;
    try {
      const res = await fetch("/api/live-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang: lang(), chart: facts }),
      });
      if (res.status === 429) throw Object.assign(new Error(tx("ഒരുപാട് കോളുകൾ ആയി. കുറച്ചു കഴിഞ്ഞ് വിളിക്കുക.", "Too many calls. Please try again later.")), { code: "rate_limited" });
      if (!res.ok) throw Object.assign(new Error(tx("ഇപ്പോൾ ബന്ധിപ്പിക്കാൻ കഴിയുന്നില്ല. കുറച്ചു കഴിഞ്ഞ് ശ്രമിക്കുക.", "Can't connect right now. Please try again shortly.")), { code: "token_" + res.status });
      const { token, model, session: s } = await res.json();
      session = s;
      call = new LiveCall({
        token, model,
        greeting: tx("(ഫോൺ കോൾ ബന്ധിപ്പിച്ചു. ദയവായി അഭിവാദ്യം ചെയ്ത് തുടങ്ങുക.)", "(The phone call has connected. Please greet and begin.)"),
        onState: (st) => {
          if (st === "listening" && !started) {
            started = Date.now();
            track("call_connected", { connect_ms: started - t0 });
            const mmss = (x) => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, "0")}`;
            clock = setInterval(() => {
              const sec = Math.floor((Date.now() - started) / 1000);
              const left = Math.max(0, CALL_LIMIT_SEC - sec);
              // the last minute shows the time remaining
              timer.classList.toggle("is-ending", left <= 60);
              timer.textContent = left <= 60 ? tx(`ബാക്കി ${mmss(left)}`, `${mmss(left)} left`) : mmss(sec);
            }, 500);
            let warned = false;
            limitTimer = setInterval(() => {
              const sec = (Date.now() - started) / 1000;
              if (!warned && sec >= CALL_LIMIT_SEC - 30) {
                warned = true;
                call?.say("(This call ends in 30 seconds. Please conclude warmly in one or two sentences and say goodbye.)");
              }
              if (sec >= CALL_LIMIT_SEC) {
                const c = call;
                finish("time_limit");
                c?.hangup();
                setStatus("ended");
                status.textContent = tx("5 മിനിറ്റ് കഴിഞ്ഞതിനാൽ കോൾ അവസാനിച്ചു. വീണ്ടും വിളിക്കാം.", "The 5-minute call has ended. You can call again.");
              }
            }, 1000);
            saveLog(false);
            saveTimer = setInterval(() => saveLog(false), 20000);
          }
          if (st === "ended" || st === "error") {
            finish(st === "error" ? "dropped" : "ended");
            setStatus(st);
            return;
          }
          if (stage.dataset.state !== "ended") setStatus(st);
        },
        onLevel: ({ me, them }) => {
          stage.style.setProperty("--them", them.toFixed(3));
          stage.style.setProperty("--me", me.toFixed(3));
        },
        onError: (err) => console.warn("call", err),
      });
      await call.start();
    } catch (err) {
      const denied = err?.name === "NotAllowedError" || err?.name === "SecurityError";
      track("call_error", { reason: denied ? "mic_denied" : err?.code || "connect_failed" });
      call?.hangup();
      finish("error");
      setStatus("error");
      status.textContent = denied
        ? tx("മൈക്രോഫോൺ അനുവദിക്കണം. ബ്രൗസറിലെ ക്രമീകരണങ്ങളിൽ മൈക്രോഫോൺ അനുമതി നൽകുക.", "Please allow the microphone in your browser settings.")
        : err.message || String(err);
    }
  });
  endBtn.addEventListener("click", () => {
    const c = call;
    finish("hangup");
    c?.hangup();
    setStatus("ended");
  });
  muteBtn.addEventListener("click", () => {
    if (!call) return;
    const m = muteBtn.getAttribute("aria-pressed") !== "true";
    call.setMuted(m);
    track("call_mute", { muted: m });
    muteBtn.setAttribute("aria-pressed", String(m));
    muteBtn.replaceChildren(icon(m ? "micOff" : "mic"), h("span", m ? tx("മ്യൂട്ട് മാറ്റുക", "Unmute") : tx("മ്യൂട്ട്", "Mute")));
  });
  // leaving the page or closing the tab ends the call and saves the log
  const onHide = () => { if (call) { saveLog(true, true); } };
  window.addEventListener("pagehide", onHide);
  const leave = () => {
    if (location.hash === myHash) return; // navigation was cancelled, the call goes on
    if (call) {
      const c = call;
      finish("left_page");
      c.hangup();
    }
    window.removeEventListener("hashchange", leave);
    window.removeEventListener("pagehide", onHide);
  };
  window.addEventListener("hashchange", leave);
}

// Chart panel over the call screen (a modal sheet; the call keeps running behind it).
async function openChartSheet(chart, ctx, inCall) {
  const { render: renderCharts } = await import("../horoscope/tabs/charts.js");
  const close = h("button.ask-primary.sheet-close", { type: "button" }, tx("അടയ്ക്കുക", "Close"));
  const dlg = h("dialog.ask-sheet", { "aria-label": tx("ഗ്രഹനില", "Chart") },
    h("div.sheet-head", h("strong", tx("ഗ്രഹനില", "Chart")), inCall ? h("span.sheet-live", tx("● കോൾ തുടരുന്നു", "● Call continues")) : null),
    h("div.sheet-body", renderCharts(chart, ctx)),
    h("div.sheet-foot", close));
  close.addEventListener("click", () => dlg.close());
  dlg.addEventListener("close", () => dlg.remove());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  document.body.append(dlg);
  dlg.showModal();
}
