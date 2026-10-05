// Capture phone screenshots of the LIVE site for the walkthrough + post image.
// usage: node capture.mjs <en|ml> [outdir]   (default outdir: ../../../media/shots-<lang>)
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { openChrome } from "./cdp.mjs";

const lang = process.argv[2] || "en";
const here = fileURLToPath(new URL(".", import.meta.url));
const out = process.argv[3] || `${here}../../../media/shots-${lang}`;
mkdirSync(out, { recursive: true });
const BASE = "https://astro.flowsxr.com/";
const name = lang === "ml" ? "ലക്ഷ്മി" : "Lakshmi";
const PEOPLE = [{ id: "demo1", name, gender: "Female", date: "1958-07-21", time: "05:40", place: { name: "Tiruvalla, Kerala, India", lat: 9.3816, lon: 76.5749, tz: 5.5 } }];
const Q = `n=${encodeURIComponent(name)}&g=F&d=1958-07-21&t=05:40&p=Tiruvalla&la=9.3816&lo=76.5749&tz=5.5&id=demo1`;
const DSF = 3;

const c = await openChrome();
const { ev, send, shot, sleep } = c;
await c.size(390, 844, DSF, true);
const go = (route, wait = 4000) => c.nav(BASE + "?r=" + Math.random().toString(36).slice(2) + route, wait);
const seed = (extra = {}) => ev(`localStorage.clear(); localStorage.setItem('ag.ui', ${JSON.stringify(JSON.stringify({ lang, theme: "light", expert: false, ...extra }))}); localStorage.setItem('ag.charts', ${JSON.stringify(JSON.stringify(PEOPLE))}); true`);
const top = () => ev(`window.scrollTo(0,0); true`);

await go("#/", 2500); await seed();
await go("#/", 5000); await top(); await shot(`${out}/01-home.png`);

// form step 1 (who): type a name, pick Female
await go("#/person?for=horoscope", 4000);
await ev(`(() => { const i = document.querySelector('.big-input'); i.focus(); return true })()`);
await send("Input.insertText", { text: name });
await ev(`document.querySelectorAll('.big-choice')[1]?.click(); document.activeElement.blur(); true`);
await sleep(500); await shot(`${out}/02-step1.png`);

// step 2 (when)
await ev(`document.querySelector('.btn-primary-xl').click(); true`); await sleep(700);
await ev(`(() => { const [d,t] = document.querySelectorAll('.big-input'); const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }; set(d,'1958-07-21'); set(t,'05:40'); return true })()`);
await sleep(600); await shot(`${out}/03-step2.png`);

// step 3 (where): place search
await ev(`document.querySelector('.btn-primary-xl').click(); true`); await sleep(800);
await ev(`document.querySelector('.combo input').focus(); true`);
await send("Input.insertText", { text: "Tiruvalla" });
for (let i = 0; i < 30; i++) { await sleep(500); if (await ev(`/Kerala|കേരള/.test(document.querySelector('.combo')?.innerText || '')`)) break; }
await sleep(1500);
await shot(`${out}/04-place.png`);

// horoscope summary + chart
await go(`#/horoscope?${Q}`, 6000); await top(); await sleep(400); await shot(`${out}/05-horoscope.png`);
// chart sheet with the plain-language explanation
await ev(`document.querySelector('.chart-tap').click(); true`); await sleep(1500);
await ev(`document.activeElement?.blur(); document.querySelectorAll(':focus, :focus-visible').forEach((e) => e.blur?.()); true`); await sleep(300);
await shot(`${out}/06-chart.png`);

// call screen, faked "in progress" state (never place a real call)
await go(`#/ask?${Q}`, 6000); await top();
const speaking = lang === "ml" ? "ജ്യോതിഷി സംസാരിക്കുന്നു" : "The astrologer is speaking";
await ev(`(() => {
  const s = document.querySelector('.call-stage'); if (s) { s.dataset.state = 'speaking'; s.style.setProperty('--them', '0.6'); }
  const st = document.querySelector('.call-status'); if (st) st.textContent = ${JSON.stringify(speaking)};
  const tm = document.querySelector('.call-timer'); if (tm) { tm.hidden = false; tm.style.display = ''; tm.textContent = '1:42'; }
  for (const sel of ['.call-start', '.phone-field']) document.querySelectorAll(sel).forEach((e) => { e.hidden = true; e.style.display = 'none'; });
  for (const sel of ['.call-end', '.call-mute']) document.querySelectorAll(sel).forEach((e) => { e.hidden = false; if (e.style.display === 'none') e.style.display = ''; });
  return true })()`);
await sleep(600); await shot(`${out}/07-call.png`);

console.log("errors:", c.errs.length ? c.errs : "none");
c.close(); process.exit(0);
