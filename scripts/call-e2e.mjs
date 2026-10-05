// End-to-end voice call test: Chrome uses a WAV file as the microphone.
// usage: node scripts/call-e2e.mjs <base-url> '<hash route>' <question.wav> [seconds=45]
import { spawn } from "node:child_process";
const [base, route, wav, secs = "45"] = process.argv.slice(2);
const p = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--remote-debugging-port=0", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${wav}`, "--autoplay-policy=no-user-gesture-required", "--mute-audio", "--user-data-dir=" + (process.env.TMPDIR || "/tmp") + "/ag-call-" + process.pid, "about:blank"]);
const ws = new WebSocket(await new Promise((ok) => p.stderr.on("data", (d) => { const m = String(d).match(/ws:\/\/\S+/); if (m) ok(m[0]); })));
await new Promise((ok) => (ws.onopen = ok));
let id = 0; const pend = new Map(); const t0 = Date.now(); const log = [];
const stamp = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(5);
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  if (m.method === "Runtime.consoleAPICalled") log.push(`${stamp()} ${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description).join(" ")}`);
  if (m.method === "Runtime.exceptionThrown") log.push(`${stamp()} EXCEPTION ${m.params.exceptionDetails.exception?.description}`); };
const send = (method, params = {}, sessionId) => new Promise((ok) => { const i = ++id; pend.set(i, ok); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Runtime.enable", {}, sessionId);
await send("Page.navigate", { url: base + route }, sessionId);
await new Promise((r) => setTimeout(r, 5000));
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true }, sessionId)).result.result.value;
await ev("document.querySelector('.call-start').click()");
const states = [];
for (let i = 0; i < +secs * 2; i++) {
  await new Promise((r) => setTimeout(r, 500));
  const s = await ev("document.querySelector('.call-stage').dataset.state");
  if (states.at(-1)?.s !== s) states.push({ t: stamp(), s });
}
await ev("document.querySelector('.call-end').click()");
await new Promise((r) => setTimeout(r, 800));
const final = await ev("document.querySelector('.call-stage').dataset.state");
console.log("STATE CHANGES:"); for (const x of states) console.log(" ", x.t, x.s);
console.log("FINAL:", final);
console.log("CONSOLE:"); for (const l of log) console.log(" ", l.slice(0, 300));
ws.close(); p.kill(); process.exit(0);
