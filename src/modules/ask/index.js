// The main screen: talk to the astrologer. Mobile-first and deliberately simple:
// home (saved people) -> birth details -> voice call. The chart is computed in the browser;
// api/live-token.js turns it into a locked, single-use call token.
import "../../styles/ask.css";
import { h } from "../../lib/dom.js";
import { tx, tf, lang } from "../../lib/i18n.js";
import { getUI, setUI } from "../../lib/store.js";
import { getCtx, inputToQuery, queryToInput } from "../../lib/ctx.js";
import { chartSummary } from "../../engine/chart-summary.js";
import { NAK_EN, RASI_EN } from "../../engine/names.js";
import { nakName } from "../../engine/names-i18n.js";
import { track } from "../../lib/analytics.js";
import { LiveCall } from "./call.js";
import { people, initialOf, hrefFor, lastPerson, rememberPerson } from "../../lib/people.js";
import { bi, biStack } from "../../ui/bi.js";
import { openSheet } from "../../ui/sheet.js";
import { supportCard } from "../../ui/support.js";
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


export function render(el, params) {
  el.classList.add("ask");
  const input = queryToInput(params);
  if (input) {
    input.timeUnknown = params.tu === "1";
    rememberPerson(input);
    return callScreen(el, input);
  }
  if (params.edit) return location.replace(`#/person?for=ask&edit=${params.edit}`);
  const last = params.new === "1" ? null : lastPerson();
  location.replace(last ? hrefFor(last, "ask") : "#/person?for=ask");
}

function callHeader(input) {
  const pill = h("button.pill", { type: "button", "aria-haspopup": "dialog" }, input.name || "—", " ▾");
  pill.addEventListener("click", () => {
    const list = people();
    openSheet(tx("ആരുടെ ജാതകം?", "Whose horoscope?"), h("div.rows",
      list.map((p) => h("a.row.row-person", { href: hrefFor(p, "ask"), onclick: () => document.querySelector("dialog.ask-sheet")?.close() },
        h("span.left", h("span.avatar.avatar-lg", initialOf(p.name)), h("strong", p.name || "—")), h("span.chev", "›"))),
      h("a.row", { href: "#/person?for=ask", onclick: () => document.querySelector("dialog.ask-sheet")?.close() }, biStack("പുതിയ ആളെ ചേർക്കുക", "Add a person"), h("span.chev", "+"))));
  });
  return h("header.screen-head", h("a.back-link", { href: "#/" }, "‹ ", bi("ഹോം", "Home")), pill);
}

// ---------- the call ----------
async function callScreen(el, input) {
  el.append(callHeader(input));
  const ctx = await getCtx();
  const { text: facts, chart } = chartSummary(ctx, input);
  const T = chart.time;
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
    h("p.call-about", input.name || "", " · ", tf("{star} നക്ഷത്രം", "{star} star", { star: nakName(T.nakIdx - 1, ctx.db) }),
      input.timeUnknown ? h("span.call-flag", tx(" · സമയം അറിയില്ല", " · time unknown")) : null),
    status, timer);
  // optional: the caller's number, so a summary can be sent by SMS (kept on this phone too)
  const cleanPhone = (v) => v.replace(/[^\d+]/g, "");
  const validPhone = (v) => /^\+?\d{7,15}$/.test(cleanPhone(v));
  const phoneInput = h("input.big-input.phone-input", {
    type: "tel", inputmode: "tel", autocomplete: "tel", value: getUI().phone || "", placeholder: "+91 98765 43210",
    "aria-label": tx("നിങ്ങളുടെ ഫോൺ നമ്പർ", "Your phone number"),
  });
  const phoneHint = h("span.phone-hint", tx("കോളിന്റെ ചുരുക്കം WhatsApp-ൽ അയയ്ക്കാൻ. വേണമെങ്കിൽ മാത്രം.", "To send you a call summary on WhatsApp. Optional."));
  phoneInput.addEventListener("change", () => {
    const v = phoneInput.value.trim();
    if (v && !validPhone(v)) { phoneHint.textContent = tx("ശരിയായ നമ്പർ നൽകുക, ഉദാ: +91 98765 43210", "Enter a valid number, e.g. +91 98765 43210"); phoneHint.classList.add("is-bad"); return; }
    phoneHint.classList.remove("is-bad");
    phoneHint.textContent = v ? tx("✓ ഈ ഫോണിൽ ഓർത്തുവയ്ക്കും", "✓ Remembered on this phone") : tx("കോളിന്റെ ചുരുക്കം WhatsApp-ൽ അയയ്ക്കാൻ. വേണമെങ്കിൽ മാത്രം.", "To send you a call summary on WhatsApp. Optional.");
    setUI({ phone: v ? cleanPhone(v) : "" });
  });
  const optIn = h("input", { type: "checkbox", checked: !!getUI().waOptIn, onchange: () => setUI({ waOptIn: optIn.checked }) });
  const phoneField = h("div.phone-field",
    h("label", { for: "ask-phone" }, h("span.field-label", bi("നിങ്ങളുടെ ഫോൺ നമ്പർ", "Your phone number"), h("span.bi-gloss", tx(" (വേണമെങ്കിൽ)", " (optional)")))),
    Object.assign(phoneInput, { id: "ask-phone" }), phoneHint,
    h("label.check-row.optin", optIn, h("span", tx("കോളിന്റെ ചുരുക്കം WhatsApp-ൽ അയച്ചുതരിക (ലഭ്യമാകുമ്പോൾ)", "Send call summaries to my WhatsApp (when available)"))));
  const dock = h("div.call-dock",
    phoneField,
    h("div.call-controls", muteBtn, callBtn, endBtn),
    notice);
  // the chart opens over the call screen, so a call in progress is never interrupted
  const editLink = input.id ? h("a", { href: `#/ask?edit=${input.id}` }, tx("വിവരങ്ങൾ മാറ്റുക", "Edit details")) : null;
  const sep = editLink ? h("span", "·") : null;
  const chartBtn = h("button.ask-textbtn", { type: "button", onclick: () => { track("chart_opened", { in_call: !!call }); openChartSheet(chart, ctx, !!call); } }, tx("ഗ്രഹനില കാണുക", "See the chart"));
  const summarySlot = h("div.summary-slot");
  const support = h("div.support-slot");
  el.append(stage, dock, summarySlot, support, h("p.ask-under", editLink, sep, chartBtn));
  const showSupport = (where) => { if (!support.firstChild) { const c = supportCard(where); if (c) support.append(c); } };
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
    ...session, person: person(), star, caller: { phone: getUI().phone || "", whatsappOptIn: !!getUI().waOptIn }, lang: lang(), startedAt: new Date(started || Date.now()).toISOString(),
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
    phoneField.hidden = live;
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
    if (started) showSupport("after_call");
    const dur = started ? Math.round((Date.now() - started) / 1000) : 0;
    if (started) track("call_end", { duration_sec: dur, reason, turns: call?.transcript?.length || 0 });
    saveLog(true);
    // a short summary to keep or share, then saved with the call log
    const snap = { body: payload(true), turns: call?.transcript || [] };
    if (started && snap.turns.some((x) => x.r === "u")) makeSummary(snap);
    call = null;
    session = null;
  };
  async function makeSummary(snap) {
    const wait = h("div.summary-card", h("p.muted", tx("കോളിന്റെ ചുരുക്കം തയ്യാറാക്കുന്നു…", "Preparing a summary of the call…")));
    summarySlot.replaceChildren(wait);
    try {
      const res = await fetch("/api/summary", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: snap.body.id, sig: snap.body.sig, lang: lang(), name: input.name, transcript: snap.turns, phone: getUI().phone || "", optIn: !!getUI().waOptIn }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { summary, whatsapp } = await res.json();
      summarySlot.replaceChildren(summaryCard(summary));
      track("summary_shown", { lang: lang() });
      if (whatsapp?.status === "sent") track("summary_whatsapp_auto", {});
      fetch("/api/log", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...snap.body, summary, whatsapp }), keepalive: true }).catch(() => {});
    } catch {
      summarySlot.replaceChildren();
    }
  }

  callBtn.addEventListener("click", async () => {
    setStatus("connecting");
    if (phoneInput.value.trim() && validPhone(phoneInput.value)) setUI({ phone: cleanPhone(phoneInput.value) });
    track("call_start", { lang: lang(), time_unknown: !!input.timeUnknown, phone_given: !!getUI().phone });
    const t0 = Date.now();
    started = 0;
    try {
      const res = await fetch("/api/live-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang: lang(), chart: facts }),
      });
      if (res.status === 429) {
        const why = (await res.json().catch(() => ({}))).error;
        if (why === "daily_cap") {
          showSupport("daily_cap");
          throw Object.assign(new Error(tx("ഇന്നത്തെ സൗജന്യ കോളുകൾ കഴിഞ്ഞു. നാളെ വീണ്ടും വിളിക്കൂ.", "Today's free calls are used up. Please call again tomorrow.")), { code: "daily_cap" });
        }
        throw Object.assign(new Error(tx("ഒരുപാട് കോളുകൾ ആയി. കുറച്ചു കഴിഞ്ഞ് വിളിക്കുക.", "Too many calls. Please try again later.")), { code: "rate_limited" });
      }
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
              timer.textContent = left <= 60 ? tf("ബാക്കി {t}", "{t} left", { t: mmss(left) }) : mmss(sec);
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

// Chart panel over the call screen (the call keeps running behind it).
async function openChartSheet(chart, ctx, inCall) {
  const { render: renderCharts } = await import("../horoscope/tabs/charts.js");
  openSheet(tx("ഗ്രഹനില", "Chart"), renderCharts(chart, ctx), { extraHead: inCall ? h("span.sheet-live", tx("● കോൾ തുടരുന്നു", "● Call continues")) : null });
}

// The call summary with ways to keep it: WhatsApp (to yourself or family), the phone's share sheet, copy.
function summaryCard(text) {
  const copyBtn = h("button.btn-secondary-xl", { type: "button" }, tx("പകർത്തുക", "Copy"));
  copyBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(text); copyBtn.textContent = tx("✓ പകർത്തി", "✓ Copied"); } catch { /* ignore */ }
    track("summary_copy", {});
  });
  return h("section.summary-card",
    h("strong.summary-title", tx("കോളിന്റെ ചുരുക്കം", "Summary of the call")),
    h("p.summary-text", text),
    h("a.btn-primary-xl.wa-btn", { href: "https://wa.me/?text=" + encodeURIComponent(text), target: "_blank", rel: "noopener", onclick: () => track("summary_whatsapp", {}) },
      tx("WhatsApp-ൽ സൂക്ഷിക്കുക", "Save to WhatsApp")),
    "share" in navigator ? h("button.btn-secondary-xl", { type: "button", onclick: () => { track("summary_share", {}); navigator.share({ text }).catch(() => {}); } }, tx("പങ്കിടുക", "Share")) : null,
    copyBtn);
}
