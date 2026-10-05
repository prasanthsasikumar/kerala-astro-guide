// Minimal headless Chrome over the DevTools protocol (same pattern as ../review-shots.mjs).
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

export async function openChrome() {
  const p = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--hide-scrollbars", "--allow-file-access-from-files", "--remote-debugging-port=0", "--user-data-dir=" + (process.env.TMPDIR || "/tmp") + "/ag-media-" + process.pid + "-" + Math.random().toString(36).slice(2), "about:blank"]);
  const ws = new WebSocket(await new Promise((ok) => p.stderr.on("data", (d) => { const m = String(d).match(/ws:\/\/\S+/); if (m) ok(m[0]); })));
  await new Promise((ok) => (ws.onopen = ok));
  let id = 0; const pend = new Map(); const errs = [];
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } if (m.method === "Runtime.exceptionThrown") errs.push(m.params.exceptionDetails.exception?.description?.slice(0, 200)); };
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
  return { send, ev, size, shot, nav, sleep, close, errs };
}
