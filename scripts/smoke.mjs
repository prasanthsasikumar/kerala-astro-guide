// Visit routes in headless Chrome and report uncaught errors / error boxes. usage: node scripts/smoke.mjs [base]
import { spawn } from "node:child_process";
import { TABS } from "../src/modules/horoscope/tabs.js";
const base = process.argv[2] || "http://127.0.0.1:5180/";
const B = "n=Test&g=M&d=2018-01-01&t=14:30&p=Calicut&la=11.25&lo=75.77&tz=5.5";
const routes = [
  ...TABS.map((x) => `#/horoscope?${B}&tab=${x.id}`),
  `#/horoscope?${B.replace("g=M", "g=F")}&tab=yoga`,
  "#/horoscope", "#/porutham",
  "#/porutham?fn=A&fd=1995-03-10&ft=06:20&fp=Calicut&fla=11.25&flo=75.77&ftz=5.5&mn=B&md=1992-08-21&mt=22:05&mp=Calicut&mla=11.25&mlo=75.77&mtz=5.5",
  "#/prashnam", "#/prashnam?d=2018-01-01&t=10:15&p=Calicut&la=11.25&lo=75.77&tz=5.5&ar=3&nk=5&tn=37&an=336&sr=2",
  "#/gocharam", "#/gocharam?tab=phalam", "#/panchanga-shuddhi", "#/divasa-panchangam", "#/date-converter", "#/nak-porutham", "#/rasi-pramanam", "#/saved", "#/settings", "#/about",
  ...["tamboolam", "ashtamangalam", "sutrams"].map((tab) => `#/prashnam?d=2018-01-01&t=10:15&p=Calicut&la=11.25&lo=75.77&tz=5.5&ar=3&nk=5&tn=37&an=336&sr=2&tab=${tab}`),
  ...["muhurtham", "mrityudosham", "panchanga-phalam"].map((tab) => `#/divasa-panchangam?d=2018-01-01&t=10:15&p=Calicut&la=11.25&lo=75.77&tz=5.5&nk=4&tab=${tab}`),
  ...["nakshatra", "papa", "dasa", "kuja", "opinion"].map((tab) => `#/porutham?fn=A&fd=1995-03-10&ft=06:20&fp=Calicut&fla=11.25&flo=75.77&ftz=5.5&mn=B&md=1992-08-21&mt=22:05&mp=Calicut&mla=11.25&mlo=75.77&mtz=5.5&tab=${tab}`),
  "#/gocharam?tab=phalam&r=3&d=2026-01-01&tm=12:00&p=Calicut&la=11.25&lo=75.77&tz=5.5",
];
const p = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--disable-gpu", "--remote-debugging-port=0", "--user-data-dir=" + (process.env.TMPDIR || "/tmp") + "/ag-smoke-" + process.pid, "about:blank"]);
const ws = new WebSocket(await new Promise((ok) => p.stderr.on("data", (d) => { const m = String(d).match(/ws:\/\/\S+/); if (m) ok(m[0]); })));
await new Promise((ok) => (ws.onopen = ok));
let id = 0; const pend = new Map(); const errors = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value ?? a.description).join(" ")); };
const send = (method, params = {}, sessionId) => new Promise((ok) => { const i = ++id; pend.set(i, ok); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Runtime.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 800, deviceScaleFactor: 1, mobile: true }, sessionId);
let bad = 0;
for (const r of routes) {
  errors.length = 0;
  await send("Page.navigate", { url: base + "?" + Math.random() + r }, sessionId);
  await new Promise((x) => setTimeout(x, 3500));
  const { result } = await send("Runtime.evaluate", { expression: `JSON.stringify({err:[...document.querySelectorAll('.error')].filter(e=>e.offsetParent!==null && e.textContent.trim()).map(e=>e.textContent), overflow: document.documentElement.scrollWidth > innerWidth + 1, sw: document.documentElement.scrollWidth, loading: !!document.querySelector('main p.muted') && document.querySelector('main').textContent.length < 60})`, returnByValue: true }, sessionId);
  const st = JSON.parse(result.result.value);
  const probs = [...errors, ...st.err, st.overflow ? `horizontal overflow (${st.sw}px)` : null, st.loading ? "stuck loading" : null].filter(Boolean);
  if (probs.length) { bad++; console.log("FAIL", r, "\n   ", probs.join("\n    ").slice(0, 600)); } else console.log("ok  ", r.slice(0, 90));
}
console.log(bad ? `${bad} routes with problems` : "all routes clean");
ws.close(); p.kill();
