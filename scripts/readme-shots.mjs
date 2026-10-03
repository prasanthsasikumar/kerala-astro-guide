// Screenshots for the README (light theme, Malayalam). usage: node scripts/readme-shots.mjs [base]
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const base = process.argv[2] || "https://astro.flowsxr.com/";
const P = "n=%E0%B4%B2%E0%B4%95%E0%B5%8D%E0%B4%B7%E0%B5%8D%E0%B4%AE%E0%B4%BF&g=F&d=1958-07-21&t=05:40&p=Thiruvalla%2C%20Kerala%2C%20India&la=9.3816&lo=76.5749&tz=5.5";
const SHOTS = [
  { file: "ask-start-desktop.png", route: "#/ask", w: 1280, h: 1000, mobile: false, fill: true },
  { file: "ask-start-mobile.png", route: "#/ask", w: 390, h: 844, mobile: true, fill: true },
  { file: "ask-call-desktop.png", route: `#/ask?${P}`, w: 1280, h: 900, mobile: false, live: true },
  { file: "ask-call-mobile.png", route: `#/ask?${P}`, w: 390, h: 844, mobile: true, live: true },
  { file: "ask-idle-mobile.png", route: `#/ask?${P}`, w: 390, h: 844, mobile: true },
];
// simulate an active call (the astrologer speaking) without placing a real call
const LIVE = `(() => { const s = document.querySelector('.call-stage'); s.dataset.state = 'speaking';
  s.style.setProperty('--them', '0.65'); document.querySelector('.call-status').textContent = 'ജ്യോതിഷി സംസാരിക്കുന്നു';
  const t = document.querySelector('.call-timer'); t.hidden = false; t.textContent = '2:14';
  document.querySelector('.call-start').hidden = true; document.querySelector('.call-end').hidden = false; document.querySelector('.call-mute').hidden = false; })()`;
const p = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--hide-scrollbars", "--remote-debugging-port=0", "--user-data-dir=" + (process.env.TMPDIR || "/tmp") + "/ag-readme-" + process.pid, "about:blank"]);
const ws = new WebSocket(await new Promise((ok) => p.stderr.on("data", (d) => { const m = String(d).match(/ws:\/\/\S+/); if (m) ok(m[0]); })));
await new Promise((ok) => (ws.onopen = ok));
let id = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}, sessionId) => new Promise((ok) => { const i = ++id; pend.set(i, ok); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// light theme + Malayalam, no saved people
await send("Page.navigate", { url: base }, sessionId); await sleep(2500);
await send("Runtime.evaluate", { expression: `localStorage.clear(); localStorage.setItem('ag.ui', JSON.stringify({ lang: 'ml', theme: 'light' }))` }, sessionId);
for (const s of SHOTS) {
  await send("Emulation.setDeviceMetricsOverride", { width: s.w, height: s.h, deviceScaleFactor: 2, mobile: s.mobile }, sessionId);
  await send("Page.navigate", { url: base + "?r=" + Math.random() + s.route }, sessionId); await sleep(5000);
  if (s.live) { await send("Runtime.evaluate", { expression: LIVE }, sessionId); await sleep(300); }
  if (s.fill) {
    await send("Runtime.evaluate", { expression: `(() => { const f = document.querySelector('form'); const [name] = f.querySelectorAll('input[type=text]'); name.value = 'ലക്ഷ്മി';
      f.querySelector('select').value = 'Female'; f.querySelector('input[type=date]').value = '1958-07-21'; f.querySelector('input[type=time]').value = '05:40';
      const p = document.querySelector('.combo input'); p.focus(); })()` }, sessionId);
    await send("Input.insertText", { text: "Thiruvalla" }, sessionId); await sleep(3000);
    await send("Runtime.evaluate", { expression: `[...document.querySelectorAll('.combo-list li')].find(l => /Thiruvalla|Tiruvalla/.test(l.textContent)).dispatchEvent(new MouseEvent('mousedown', {bubbles:true}))` }, sessionId);
    await sleep(1200);
    await send("Runtime.evaluate", { expression: `document.activeElement.blur(); window.scrollTo(0, ${s.mobile ? 330 : 0})` }, sessionId); await sleep(400);
  }
  const { result } = await send("Page.captureScreenshot", { format: "png" }, sessionId);
  writeFileSync(`docs/screenshots/${s.file}`, Buffer.from(result.data, "base64")); console.log("wrote", s.file);
}
ws.close(); p.kill(); process.exit(0);
