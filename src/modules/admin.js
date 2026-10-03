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

function topPlaces(calls) {
  const n = new Map();
  for (const c of calls) {
    const k = c.location ? [c.location.city, c.location.country].filter(Boolean).join(", ") : "";
    if (k) n.set(k, (n.get(k) || 0) + 1);
  }
  return [...n].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} (${v})`).join(" · ") || "no location data yet";
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
  const phones = new Set(calls.map((c) => c.caller?.phone).filter(Boolean));
  const total = calls.reduce((s, c) => s + (c.durationSec || 0), 0);
  out.replaceChildren(
    h("p.admin-stats", `${calls.length} calls · ${people.size} people · ${mins(total)} talked · avg ${calls.length ? mins(Math.round(total / calls.length)) : "0:00"} · ${phones.size} phone numbers`),
    h("p.muted", "From: " + topPlaces(calls)),
    ...calls.map(card),
    d.cursor ? h("button.ask-lang", { type: "button", onclick: () => load(out, d.cursor, calls) }, "Load more") : h("p.muted", "That's everything."));
}

function deviceName(ua = "") {
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac OS/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "other";
  const br = /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Edg\//.test(ua) ? "Edge" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : /Firefox/.test(ua) ? "Firefox" : "browser";
  return `${os} · ${br}`;
}

function card(c) {
  const p = c.person || {};
  const when = new Date(c.startedAt || c.savedAt);
  return h("details.admin-call",
    h("summary",
      h("strong", p.name || "—"),
      h("span", ` ${p.gender === "Female" ? "F" : p.gender === "Male" ? "M" : ""} · ${p.date} ${p.timeUnknown ? "(time unknown)" : p.time} · ${(p.place?.name || "").split(",").slice(0, 2).join(",")}`),
      h("small", `${when.toLocaleString()} · ${mins(c.durationSec || 0)} · ${c.lang} · ${c.star || ""}${c.ended ? "" : " · (in progress or cut off)"}`),
      c.caller?.phone ? h("small", "📞 ", h("a", { href: `tel:${c.caller.phone}` }, c.caller.phone)) : null,
      h("small", "📍 " + (c.location ? [c.location.city, c.location.region, c.location.country].filter(Boolean).join(", ") || "unknown" : "not recorded") + " · " + deviceName(c.device))),
    h("div.admin-transcript", (c.transcript || []).length
      ? c.transcript.map((t) => h("p", { class: t.r === "u" ? "is-user" : "is-astro" }, h("b", t.r === "u" ? "Caller " : "Astrologer "), h("span.muted", mins(t.at || 0) + " "), t.t))
      : h("p.muted", "No transcript.")),
    h("p.muted", c.device || ""));
}
