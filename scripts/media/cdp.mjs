// Minimal headless Chrome over the DevTools protocol (same pattern as ../review-shots.mjs).
// Always muted. openChrome({ guard }) adds the network guard used for the live site (see below).
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

export async function openChrome({ guard = null, args = [] } = {}) {
  const p = spawn(process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--mute-audio", "--hide-scrollbars", "--allow-file-access-from-files", "--deny-permission-prompts", "--remote-debugging-port=0", ...args, "--user-data-dir=" + (process.env.TMPDIR || "/tmp") + "/ag-media-" + process.pid + "-" + Math.random().toString(36).slice(2), "about:blank"]);
  const ws = new WebSocket(await new Promise((ok) => p.stderr.on("data", (d) => { const m = String(d).match(/ws:\/\/\S+/); if (m) ok(m[0]); })));
  await new Promise((ok) => (ws.onopen = ok));
  let id = 0; const pend = new Map(); const errs = []; const handlers = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") errs.push(m.params.exceptionDetails.exception?.description?.slice(0, 200));
    if (m.method && handlers.has(m.method)) for (const fn of handlers.get(m.method)) fn(m.params);
  };
  const on = (method, fn) => { if (!handlers.has(method)) handlers.set(method, []); handlers.get(method).push(fn); };
  const rawSend = (method, params = {}, sessionId) => new Promise((ok) => { const i = ++id; pend.set(i, ok); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  const { result: { targetId } } = await rawSend("Target.createTarget", { url: "about:blank" });
  const { result: { sessionId } } = await rawSend("Target.attachToTarget", { targetId, flatten: true });
  const send = (m, params = {}) => rawSend(m, params, sessionId);
  await send("Runtime.enable"); await send("Page.enable");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ev = async (x) => { const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) console.warn("eval error:", r.result.exceptionDetails.exception?.description?.slice(0, 200)); return r.result?.result?.value; };
  const size = (width, height, deviceScaleFactor = 1, mobile = false) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor, mobile });
  const shot = async (file) => { const { result } = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(file, Buffer.from(result.data, "base64")); };
  const nav = async (url, wait = 3000) => { await send("Page.navigate", { url }); await sleep(wait); };
  const close = () => { ws.close(); p.kill(); };
  const log = { staged: [], blocked: [] };
  if (guard) await installGuard({ send, on, guard, log });
  return { send, ev, size, shot, nav, sleep, close, errs, log };
}

// ---- network guard for capturing the LIVE site ----
// The site has a private research database and a paid voice API. While capturing, nothing may reach:
//   /api/live-token, /api/log, /api/survey, /api/blindtest (or any other /api/ route on the site),
//   the Gemini Live websocket, or Google Analytics.
// Two independent layers:
//   1. In the page, before any site code runs: fetch, sendBeacon and WebSocket are wrapped. Same-origin /api/
//      calls get canned JSON (guard.canned(path, body)), sendBeacon to /api/ is dropped, sockets to Google are refused.
//   2. At the network level (CDP Fetch domain, which also sees beacons and keepalive requests): every request to the
//      site's /api/ and to Google Analytics is answered locally or failed, so it never leaves the machine.
//      Layer 2 should stay silent; anything it sees is logged in log.blocked as a leak through layer 1.
async function installGuard({ send, on, guard, log }) {
  const host = guard.host;
  const canned = guard.canned; // (path, bodyText) => object
  const cannedSrc = `(${canned.toString()})`;
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
    const canned = ${cannedSrc};
    const isApi = (u) => { try { const x = new URL(u, location.href); return x.host === location.host && x.pathname.startsWith('/api/'); } catch { return false; } };
    const real = window.fetch.bind(window);
    window.__staged = [];
    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input?.url || String(input);
      if (isApi(url)) {
        const path = new URL(url, location.href).pathname;
        const body = typeof init.body === 'string' ? init.body : '';
        window.__staged.push(path);
        const out = canned(path, body);
        await new Promise((r) => setTimeout(r, 120));
        if (!out) return new Response(JSON.stringify({ error: 'staged' }), { status: 503, headers: { 'content-type': 'application/json' } });
        return new Response(JSON.stringify(out), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return real(input, init);
    };
    const beacon = navigator.sendBeacon?.bind(navigator);
    if (beacon) navigator.sendBeacon = (u, d) => (isApi(u) ? (window.__staged.push('beacon ' + u), true) : beacon(u, d));
    const RealWS = window.WebSocket;
    window.WebSocket = function (u, p) { if (/googleapis|google/.test(String(u))) throw new Error('staged: no sockets'); return new RealWS(u, p); };
    window.WebSocket.prototype = RealWS.prototype;
    navigator.mediaDevices && (navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('staged'), { name: 'NotAllowedError' })));
  })();` });
  on("Fetch.requestPaused", async ({ requestId, request }) => {
    const u = new URL(request.url);
    if (u.host === host && u.pathname.startsWith("/api/")) {
      log.blocked.push(request.method + " " + u.pathname);
      const out = canned(u.pathname, request.postData || "");
      await send("Fetch.fulfillRequest", { requestId, responseCode: out ? 200 : 503, responseHeaders: [{ name: "content-type", value: "application/json" }], body: Buffer.from(JSON.stringify(out || { error: "staged" })).toString("base64") });
    } else if (/(^|\.)google-analytics\.com$|(^|\.)googletagmanager\.com$|(^|\.)analytics\.google\.com$/.test(u.host)) {
      await send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
    } else {
      await send("Fetch.continueRequest", { requestId });
    }
  });
  await send("Fetch.enable", { patterns: [{ urlPattern: `*://${host}/api/*` }, { urlPattern: "*google-analytics.com*" }, { urlPattern: "*googletagmanager.com*" }, { urlPattern: "*analytics.google.com*" }] });
}
