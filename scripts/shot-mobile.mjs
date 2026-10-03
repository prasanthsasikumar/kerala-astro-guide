// Mobile-width screenshot via Chrome DevTools device emulation (headless window can't go below ~500px).
// usage: [BASE=http://127.0.0.1:5181/] node scripts/shot-mobile.mjs out.png '#/route' [width=375] [height=1400]
import { spawn } from "node:child_process";
const [out, route, w = "375", hgt = "1400"] = process.argv.slice(2);
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const p = spawn(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--remote-debugging-port=0", "--user-data-dir=" + (process.env.TMPDIR || "/tmp") + "/ag-shot-" + process.pid, "about:blank"]);
const wsUrl = await new Promise((ok) => p.stderr.on("data", (d) => { const m = String(d).match(/ws:\/\/\S+/); if (m) ok(m[0]); }));
const browser = new WebSocket(wsUrl);
await new Promise((ok) => (browser.onopen = ok));
let id = 0; const pending = new Map();
browser.onmessage = (e) => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}, sessionId) => new Promise((ok) => { const i = ++id; pending.set(i, ok); browser.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Emulation.setDeviceMetricsOverride", { width: +w, height: +hgt, deviceScaleFactor: 1, mobile: true }, sessionId);
await send("Page.navigate", { url: (process.env.BASE || "http://127.0.0.1:5180/") + route }, sessionId);
await new Promise((r) => setTimeout(r, 6000));
const { result } = await send("Page.captureScreenshot", { format: "png" }, sessionId);
(await import("node:fs")).writeFileSync(out, Buffer.from(result.data, "base64"));
browser.close(); p.kill();
