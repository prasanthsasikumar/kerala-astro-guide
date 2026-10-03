// Private call log viewer. Not linked anywhere; needs the ADMIN_KEY.
import "../styles/ask.css";
import { h } from "../lib/dom.js";

const KEY = "ag.admin";
const getKey = () => { try { return sessionStorage.getItem(KEY) || ""; } catch { return ""; } };
const setKey = (k) => { try { sessionStorage.setItem(KEY, k); } catch { /* memory only */ } };
const mins = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function render(el) {
  el.classList.add("ask", "ask-page", "admin");
  const out = h("div");
  el.append(h("header.ask-top", h("strong", "Call log"), h("a", { href: "#/ask" }, "App")), out);
  if (!getKey()) return login(out);
  load(out);
}

function login(out) {
  const pw = h("input.input", { type: "password", placeholder: "Admin key", autocomplete: "current-password" });
  out.replaceChildren(h("form.ask-form", { onsubmit: (e) => { e.preventDefault(); setKey(pw.value.trim()); load(out); } },
    pw, h("button.ask-primary", { type: "submit" }, "Open")));
}

async function load(out, cursor = null, acc = []) {
  out.replaceChildren(h("p.muted", "Loading…"));
  const r = await fetch("/api/admin" + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""), { headers: { "x-admin-key": getKey() } });
  if (r.status === 401) { setKey(""); out.replaceChildren(h("p.ask-error", "Wrong key."), h("div")); return login(out.lastChild); }
  if (!r.ok) { out.replaceChildren(h("p.ask-error", `Error ${r.status}`)); return; }
  const d = await r.json();
  const calls = [...acc, ...d.calls];
  const people = new Set(calls.map((c) => `${c.person?.name}|${c.person?.date}|${c.person?.time}`));
  const total = calls.reduce((s, c) => s + (c.durationSec || 0), 0);
  out.replaceChildren(
    h("p.admin-stats", `${calls.length} calls · ${people.size} people · ${mins(total)} talked · avg ${calls.length ? mins(Math.round(total / calls.length)) : "0:00"}`),
    ...calls.map(card),
    d.cursor ? h("button.ask-lang", { type: "button", onclick: () => load(out, d.cursor, calls) }, "Load more") : h("p.muted", "That's everything."));
}

function card(c) {
  const p = c.person || {};
  const when = new Date(c.startedAt || c.savedAt);
  return h("details.admin-call",
    h("summary",
      h("strong", p.name || "—"),
      h("span", ` ${p.gender === "Female" ? "F" : p.gender === "Male" ? "M" : ""} · ${p.date} ${p.timeUnknown ? "(time unknown)" : p.time} · ${(p.place?.name || "").split(",").slice(0, 2).join(",")}`),
      h("small", `${when.toLocaleString()} · ${mins(c.durationSec || 0)} · ${c.lang} · ${c.star || ""}${c.ended ? "" : " · (in progress or cut off)"}`)),
    h("div.admin-transcript", (c.transcript || []).length
      ? c.transcript.map((t) => h("p", { class: t.r === "u" ? "is-user" : "is-astro" }, h("b", t.r === "u" ? "Caller " : "Astrologer "), h("span.muted", mins(t.at || 0) + " "), t.t))
      : h("p.muted", "No transcript.")),
    h("p.muted", c.device || ""));
}
