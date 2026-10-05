// Private call log viewer + usage dashboard. Not linked anywhere; needs the ADMIN_KEY.
import "../styles/ask.css";
import { h } from "../lib/dom.js";

const KEY = "ag.admin";
const getKey = () => { try { return sessionStorage.getItem(KEY) || ""; } catch { return ""; } };
const setKey = (k) => { try { sessionStorage.setItem(KEY, k); } catch { /* memory only */ } };
const mins = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0) + "%";
const LANGS = { ml: "Malayalam", en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu", kn: "Kannada" };
const DAYS = 14;
// minutes with one decimal while small, so a few short calls don't read as 0
const fmtMin = (sec) => { const m = sec / 60; return m && m < 100 ? m.toFixed(1) : String(Math.round(m)); };

// India date (YYYY-MM-DD) for an instant
const istDay = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
function callDay(c) {
  const t = new Date(c.startedAt || c.savedAt);
  return Number.isNaN(t.getTime()) ? String(c.id || "").slice(0, 10) : istDay(t);
}

export function render(el) {
  el.classList.add("ask", "ask-page", "admin");
  const out = h("div");
  el.append(h("header.ask-top", h("strong", "Call log"), h("a", { href: "#/ask" }, "App")), out);
  if (!getKey()) return login(out);
  start(out);
}

function login(out) {
  const pw = h("input.input", { type: "password", placeholder: "Admin key", autocomplete: "current-password" });
  out.replaceChildren(h("form.ask-form", { onsubmit: (e) => { e.preventDefault(); setKey(pw.value.trim()); start(out); } },
    pw, h("button.ask-primary", { type: "submit" }, "Open")));
}

// One page from the API. Returns { calls, cursor } or throws { status }.
async function fetchPage(cursor, limit) {
  const q = new URLSearchParams({ limit: String(limit) });
  if (cursor) q.set("cursor", cursor);
  const r = await fetch("/api/admin?" + q, { headers: { "x-admin-key": getKey() } });
  if (!r.ok) throw { status: r.status };
  return r.json();
}

function start(out) {
  const st = { calls: [], cursor: null, busy: false, progress: "", error: "" };
  const dash = h("section.admin-dash");
  const studyBox = h("section.admin-study", h("p.muted", "Loading study answers…"));
  const list = h("div.admin-list");
  const foot = h("div.admin-foot");
  out.replaceChildren(h("p.muted", "Loading…"));

  const fail = (e) => {
    if (e?.status === 401) { setKey(""); out.replaceChildren(h("p.ask-error", "Wrong key."), h("div")); login(out.lastChild); return true; }
    st.error = `Error ${e?.status || e?.message || e}`;
    return false;
  };

  const paint = () => {
    dash.replaceChildren(...dashboard(st.calls, !st.cursor));
    list.replaceChildren(h("h2.admin-h", "Calls"), ...st.calls.map(card));
    foot.replaceChildren(...[
      st.error ? h("p.ask-error", st.error) : null,
      st.busy ? h("p.admin-progress", { role: "status" }, st.progress) : null,
      st.cursor && !st.busy
        ? h("div.admin-actions",
          h("button.ask-lang", { type: "button", onclick: () => more(50, false) }, "Load 50 more"),
          h("button.ask-lang.is-strong", { type: "button", onclick: () => more(200, true) }, "Load all"))
        : null,
      !st.cursor && !st.busy ? h("p.muted", "That's everything.") : null].filter(Boolean));
    // keep the load-all control near the stats too
    const top = dash.querySelector(".admin-scope-actions");
    if (top && st.cursor && !st.busy) top.append(h("button.ask-lang.is-strong", { type: "button", onclick: () => more(200, true) }, "Load all"));
    if (top && st.busy) top.append(h("span.admin-progress", st.progress));
  };

  const more = async (limit, all) => {
    if (st.busy) return;
    st.busy = true; st.error = "";
    do {
      st.progress = `Loading… ${st.calls.length} calls so far`;
      paint();
      try {
        const d = await fetchPage(st.cursor, limit);
        st.calls.push(...d.calls);
        st.cursor = d.cursor;
      } catch (e) {
        if (fail(e)) return;
        break;
      }
    } while (all && st.cursor);
    st.busy = false;
    paint();
  };

  (async () => {
    try {
      const d = await fetchPage(null, 50);
      st.calls = d.calls; st.cursor = d.cursor;
    } catch (e) {
      if (fail(e)) return;
    }
    out.replaceChildren(studyBox, dash, list, foot);
    paint();
    loadStudy(studyBox);
  })();
}

/* ---------- study (blind test + questionnaire) ---------- */

async function loadStudy(box) {
  const rows = [];
  let cursor = null;
  try {
    do {
      const q = new URLSearchParams({ kind: "survey", limit: "200" });
      if (cursor) q.set("cursor", cursor);
      const r = await fetch("/api/admin?" + q, { headers: { "x-admin-key": getKey() } });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      rows.push(...d.calls);
      cursor = d.cursor;
    } while (cursor);
  } catch (e) {
    box.replaceChildren(h("p.ask-error", "Study answers: " + (e.message || e)));
    return;
  }
  box.replaceChildren(...studyPanel(rows));
}

// log of the binomial coefficient and an exact two-sided binomial test against p = 0.5
const lfact = (n) => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; };
function binomTwoSided(k, n) {
  if (!n) return 1;
  const pk = (i) => Math.exp(lfact(n) - lfact(i) - lfact(n - i) - n * Math.LN2);
  const obs = pk(k);
  let p = 0;
  for (let i = 0; i <= n; i++) { const q = pk(i); if (q <= obs * (1 + 1e-9)) p += q; }
  return Math.min(1, p);
}
function wilson(k, n, z = 1.96) {
  if (!n) return [0, 0];
  const ph = k / n, d = 1 + (z * z) / n, c = ph + (z * z) / (2 * n), m = z * Math.sqrt((ph * (1 - ph)) / n + (z * z) / (4 * n * n));
  return [(c - m) / d, (c + m) / d];
}

const Q_LABELS = {
  q1: "Whose horoscope", q2: "Age of that person", q3: "Belief before", q4: "What they used", q5: "Horoscope describes them",
  q6: "Past dasas matched life events", q7: "Astrologer call accuracy", q8: "Voice call usability", q9: "Use again / recommend",
};

function studyPanel(rows) {
  const n = rows.length;
  const blind = rows.filter((r) => r.blind);
  const picked = blind.filter((r) => r.blind.choice === "a" || r.blind.choice === "b");
  const hits = picked.filter((r) => r.blind.pickedReal).length;
  const [lo, hi] = wilson(hits, picked.length);
  const p = binomTwoSided(hits, picked.length);
  const pc = (x) => `${Math.round(x * 100)}%`;
  const verdict = picked.length < 30
    ? `Too few blind-test picks for a conclusion yet (${picked.length}; aim for 100+).`
    : p < 0.05
      ? `People picked their own reading ${pc(hits / picked.length)} of the time, which differs from chance (p = ${p.toFixed(3)}).`
      : `People picked their own reading ${pc(hits / picked.length)} of the time: not distinguishable from chance (p = ${p.toFixed(3)}).`;
  const tiles = [
    ["Studies started", n],
    ["Completed", rows.filter((r) => r.complete || r.blind || Object.keys(r.answers || {}).length === 9).length],
    ["Blind-test picks", picked.length],
    ["Picked own reading", picked.length ? `${hits} · ${pc(hits / picked.length)}` : "0"],
    ["95% CI", picked.length ? `${pc(lo)} to ${pc(hi)}` : "n/a"],
    ["p vs chance (50%)", picked.length ? p.toFixed(3) : "n/a"],
    ["Both / neither", `${blind.length - picked.length}`],
  ];
  const qs = Object.keys(Q_LABELS).map((k) => [Q_LABELS[k], count(rows.map((r) => r.answers?.[k]).filter(Boolean))]);
  return [
    h("h2.admin-h", "Study: is it accurate?"),
    h("p.admin-verdict", verdict),
    h("div.admin-tiles", tiles.map(([k, v]) => h("div.admin-tile", h("span.admin-tile-v", String(v)), h("span.admin-tile-k", k)))),
    h("p.muted", "Blind test: each person sees a reading from their real chart and one from a random chart (same gender and place, birth date within 10 years), in random order. If astrology carries real information, people should pick their own more than 50% of the time."),
    h("div.admin-breakdowns", qs.map(([title, r]) => breakdown(title, r, n))),
  ];
}

/* ---------- dashboard ---------- */

function count(items) {
  const n = new Map();
  for (const k of items) if (k) n.set(k, (n.get(k) || 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1]);
}

function deviceKind(ua = "") {
  if (!ua) return "unknown";
  if (/iPad/.test(ua)) return "iPad";
  if (/iPhone|iPod/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Android";
  return /Windows|Macintosh|Mac OS|X11|Linux|CrOS/.test(ua) ? "Desktop" : "Other";
}

function dashboard(calls, complete) {
  const n = calls.length;
  const people = new Set(calls.map((c) => {
    const p = c.person || {};
    return `${String(p.name || "").trim().toLowerCase()}|${p.date}|${p.timeUnknown ? "?" : p.time}`;
  }));
  const phones = new Set(calls.map((c) => c.caller?.phone).filter(Boolean));
  const totalSec = calls.reduce((s, c) => s + (c.durationSec || 0), 0);
  const withSummary = calls.filter((c) => String(c.summary || "").trim()).length;
  const optIns = new Set(calls.filter((c) => c.caller?.whatsappOptIn && c.caller?.phone).map((c) => c.caller.phone)).size;
  const today = istDay(new Date());
  const todayCalls = calls.filter((c) => callDay(c) === today).length;

  const tiles = [
    ["Calls", n],
    ["Unique people", people.size],
    ["Phone numbers", phones.size],
    ["Total minutes", fmtMin(totalSec)],
    ["Avg call", n ? mins(Math.round(totalSec / n)) : "0:00"],
    ["With summary", pct(withSummary, n)],
    ["WhatsApp opt-ins", optIns],
    ["Today (IST)", todayCalls],
  ];

  const wa = calls.filter((c) => c.whatsapp?.status);
  const breakdowns = [
    ["Languages", count(calls.map((c) => LANGS[c.lang] || c.lang || "unknown"))],
    ["Top places", count(calls.map((c) => (c.location ? [c.location.city, c.location.country].filter(Boolean).join(", ") : "") || "unknown")).slice(0, 8)],
    ["Devices", count(calls.map((c) => deviceKind(c.device)))],
    wa.length ? ["WhatsApp summaries", count(wa.map((c) => c.whatsapp.status))] : null,
  ].filter(Boolean);

  return [
    h("div.admin-scope",
      h("p", h("strong", `${n} call${n === 1 ? "" : "s"} included`), complete ? " · all calls loaded" : " · newest only, more on the server"),
      h("div.admin-scope-actions")),
    h("div.admin-tiles", tiles.map(([k, v]) => h("div.admin-tile", h("span.admin-tile-v", String(v)), h("span.admin-tile-k", k)))),
    chart(calls),
    h("div.admin-breakdowns", breakdowns.map(([title, rows]) => breakdown(title, rows, n))),
  ];
}

function breakdown(title, rows, total) {
  const max = rows[0]?.[1] || 1;
  return h("div.admin-card",
    h("h3", title),
    rows.length
      ? h("ul.admin-bars", rows.map(([k, v]) => h("li",
        h("span.admin-bar-k", k),
        h("span.admin-bar-v", `${v} · ${pct(v, total)}`),
        h("span.admin-bar-track", h("span.admin-bar-fill", { style: { width: `${(v / max) * 100}%` } })))))
      : h("p.muted", "No data."));
}

function chart(calls) {
  // last 14 India days, oldest first
  const days = [];
  const now = Date.now();
  for (let i = DAYS - 1; i >= 0; i--) days.push(istDay(new Date(now - i * 86400000)));
  const by = new Map(days.map((d) => [d, { calls: 0, sec: 0 }]));
  for (const c of calls) {
    const b = by.get(callDay(c));
    if (b) { b.calls++; b.sec += c.durationSec || 0; }
  }
  const rows = days.map((d) => ({ d, ...by.get(d) }));
  const maxC = Math.max(1, ...rows.map((r) => r.calls));
  const maxM = Math.max(1, ...rows.map((r) => r.sec / 60));
  // narrower viewBox on phones so labels stay readable once scaled to the screen
  const narrow = typeof window !== "undefined" && window.innerWidth < 640;
  const W = narrow ? 340 : 820, H = narrow ? 170 : 200, top = 20, bottom = 28, left = 4, right = 4;
  const slot = (W - left - right) / DAYS, bw = Math.min(26, slot * 0.62), ph = H - top - bottom;
  const label = (d) => `${+d.slice(8)}/${+d.slice(5, 7)}`;
  const bars = rows.map((r, i) => {
    const x = left + i * slot + (slot - bw) / 2;
    const hC = (r.calls / maxC) * ph;
    const yM = top + ph - ((r.sec / 60) / maxM) * ph;
    const tip = `${r.d}: ${r.calls} call${r.calls === 1 ? "" : "s"}, ${fmtMin(r.sec)} min`;
    return `<g class="cbar" data-tip="${tip}" tabindex="0"><title>${tip}</title>`
      + `<rect class="hit" x="${left + i * slot}" y="0" width="${slot}" height="${H}"/>`
      + `<rect class="c" x="${x}" y="${top + ph - hC}" width="${bw}" height="${Math.max(hC, r.calls ? 2 : 0)}" rx="3"/>`
      + (r.sec ? `<circle class="m" cx="${x + bw / 2}" cy="${yM}" r="3.5"/>` : "")
      + (r.calls ? `<text class="n" x="${x + bw / 2}" y="${top + ph - hC - 5}">${r.calls}</text>` : "")
      + (i % 2 === (DAYS - 1) % 2 ? `<text class="d" x="${x + bw / 2}" y="${H - 8}">${label(r.d)}</text>` : "")
      + `</g>`;
  }).join("");
  const minsLine = rows.map((r, i) => `${left + i * slot + slot / 2},${top + ph - ((r.sec / 60) / maxM) * ph}`).join(" ");
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Calls per day, last ${DAYS} days">`
    + `<line class="base" x1="0" x2="${W}" y1="${top + ph + 0.5}" y2="${top + ph + 0.5}"/>`
    + `<polyline class="mline" points="${minsLine}"/>${bars}</svg>`;
  const sumC = rows.reduce((s, r) => s + r.calls, 0), sumM = fmtMin(rows.reduce((s, r) => s + r.sec, 0));
  const cap = h("p.admin-chart-cap", `Last ${DAYS} days: ${sumC} call${sumC === 1 ? "" : "s"}, ${sumM} min. Tap a day for details.`);
  const box = h("div.admin-chart", { html: svg });
  const pick = (e) => {
    const g = e.target.closest?.(".cbar");
    if (!g) return;
    box.querySelectorAll(".cbar.is-on").forEach((x) => x.classList.remove("is-on"));
    g.classList.add("is-on");
    cap.textContent = g.dataset.tip;
  };
  box.addEventListener("click", pick);
  box.addEventListener("focusin", pick);
  return h("div.admin-card.admin-chart-card",
    h("div.admin-chart-head", h("h3", "Calls per day (IST)"),
      h("span.admin-legend", h("i.k-c"), "calls ", h("i.k-m"), "minutes (own scale)")),
    box, cap);
}

/* ---------- call list ---------- */

function deviceName(ua = "") {
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac OS/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "other";
  const br = /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Edg\//.test(ua) ? "Edge" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : /Firefox/.test(ua) ? "Firefox" : "browser";
  return `${os} · ${br}`;
}

function waLine(w) {
  if (!w?.status) return null;
  const at = w.at ? new Date(w.at) : null;
  return h("small", { class: `admin-wa is-${w.status}` }, `WhatsApp summary: ${w.status}`,
    at && !Number.isNaN(at.getTime()) ? ` · ${at.toLocaleString()}` : "", w.error ? ` · ${w.error}` : "");
}

function card(c) {
  const p = c.person || {};
  const when = new Date(c.startedAt || c.savedAt);
  return h("details.admin-call",
    h("summary",
      h("strong", p.name || "—"),
      h("span", ` ${p.gender === "Female" ? "F" : p.gender === "Male" ? "M" : ""} · ${p.date} ${p.timeUnknown ? "(time unknown)" : p.time} · ${(p.place?.name || "").split(",").slice(0, 2).join(",")}`),
      h("small", `${when.toLocaleString()} · ${mins(c.durationSec || 0)} · ${c.lang} · ${c.star || ""}${c.ended ? "" : " · (in progress or cut off)"}`),
      c.caller?.phone ? h("small", "📞 ", h("a", { href: `tel:${c.caller.phone}` }, c.caller.phone), c.caller.whatsappOptIn ? " · WhatsApp opt-in ✓" : "") : null,
      waLine(c.whatsapp),
      h("small", "📍 " + (c.location ? [c.location.city, c.location.region, c.location.country].filter(Boolean).join(", ") || "unknown" : "not recorded") + " · " + deviceName(c.device))),
    c.summary ? h("p.admin-summary", c.summary) : null,
    h("div.admin-transcript", (c.transcript || []).length
      ? c.transcript.map((t) => h("p", { class: t.r === "u" ? "is-user" : "is-astro" }, h("b", t.r === "u" ? "Caller " : "Astrologer "), h("span.muted", mins(t.at || 0) + " "), t.t))
      : h("p.muted", "No transcript.")),
    h("p.muted", c.device || ""));
}
