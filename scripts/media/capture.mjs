// Capture phone screenshots of the LIVE site for the walkthrough + post image.
// usage: node capture.mjs <en|ml> [outdir]   (default outdir: ../../../media/shots-<lang>)
//
// SAFETY: this runs against the live site, which has a private research database and a paid voice API.
// No call is ever placed: the details form's last button (which starts the call) is never pressed, and the call
// screens are staged by setting DOM state. The study screens do talk to /api/survey and /api/blindtest, so
// openChrome({ guard }) answers every /api/ request with canned JSON inside the browser (and again at the
// network level, as a second layer). The run fails if anything reached the network layer.
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { openChrome } from "./cdp.mjs";

const lang = process.argv[2] || "en";
const here = fileURLToPath(new URL(".", import.meta.url));
const out = process.argv[3] || `${here}../../../media/shots-${lang}`;
mkdirSync(out, { recursive: true });
const HOST = "astro.flowsxr.com";
const BASE = `https://${HOST}/`;
const name = lang === "ml" ? "ലക്ഷ്മി" : "Lakshmi";
const PEOPLE = [{ id: "demo1", name, gender: "Female", date: "1958-07-21", time: "05:40", place: { name: "Tiruvalla, Kerala, India", lat: 9.3816, lon: 76.5749, tz: 5.5 } }];
const Q = `n=${encodeURIComponent(name)}&g=F&d=1958-07-21&t=05:40&p=Tiruvalla&la=9.3816&lo=76.5749&tz=5.5&id=demo1`;
const DSF = 3;
const ml = lang === "ml";
const T = (m, e) => (ml ? m : e);

// Canned answers for the site's /api/ routes. Self-contained: it is also serialised into the page.
// The two blind-test readings are written for the video (same style, no astrology terms), not generated.
function canned(path, body) {
  let b = {};
  try { b = JSON.parse(body || "{}"); } catch { b = {}; }
  if (path === "/api/blindtest") {
    return b.lang === "ml"
      ? { ticket: "staged", a: "ഉറച്ച മനസ്സും പ്രായോഗിക ബുദ്ധിയും ഉള്ളയാൾ. കാര്യങ്ങൾ പാളുമ്പോൾ മറ്റുള്ളവർ ആശ്രയിക്കുന്നത് ഇവരെയാണ്. മധ്യവയസ്സിൽ വീട്ടുത്തരവാദിത്തങ്ങളും കഠിനാധ്വാനവും നിറഞ്ഞ കാലം; അമ്പതിനുശേഷം ജീവിതം എളുപ്പമായി.",
        b: "പുതിയ കാര്യങ്ങൾ വേഗം തുടങ്ങുന്ന, അടങ്ങിയിരിക്കാത്ത സ്വഭാവം. യാത്രകളിലും ആളുകളെ കാണുന്നതിലുമാണ് സന്തോഷം. ഇരുപതുകളിലെ ഒരു പെട്ടെന്നുള്ള സ്ഥലംമാറ്റം പിന്നീടുള്ള ജീവിതത്തെ ഏറെ സ്വാധീനിച്ചു." }
      : { ticket: "staged", a: "She is steady and practical, the one others lean on when plans fall apart. Her middle years were full of hard work and responsibility at home, and life eased after fifty. She worries more than she shows.",
        b: "She is restless and quick to start new things, happiest when travelling or meeting people. A sudden move in her twenties shaped much of what followed. She speaks her mind and dislikes routine." };
  }
  if (path === "/api/survey") return b.op === "start" ? { study: "staged" } : { ok: true, realIs: null };
  return null; // live-token, log and anything else: refused
}

const c = await openChrome({ guard: { host: HOST, canned } });
const { ev, send, shot, sleep } = c;
await c.size(390, 844, DSF, true);
const go = (route, wait = 4000) => c.nav(BASE + "?r=" + Math.random().toString(36).slice(2) + route, wait);
const seed = (charts) => ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('ag.ui', ${JSON.stringify(JSON.stringify({ lang, theme: "light", expert: false }))}); ${charts ? `localStorage.setItem('ag.charts', ${JSON.stringify(JSON.stringify(PEOPLE))});` : ""} true`);
const top = () => ev(`window.scrollTo(0,0); true`);
const blur = () => ev(`document.activeElement?.blur(); true`);
const waitFor = async (expr, tries = 40) => { for (let i = 0; i < tries; i++) { if (await ev(expr)) return true; await sleep(250); } console.warn("timed out:", expr); return false; };

// 1. first visit: no saved people, so the site opens on step 1 with the intro card
await go("#/", 2500); await seed(false);
await go("#/", 5000); await top();
await waitFor(`!!document.querySelector('.first-intro')`);
await ev(`document.querySelector('.big-input').focus(); true`);
await send("Input.insertText", { text: name });
await ev(`document.querySelectorAll('.big-choice')[1]?.click(); true`); await blur();
await sleep(500); await shot(`${out}/01-first.png`);

// 2. step 2 (when)
await ev(`document.querySelector('.btn-primary-xl').click(); true`); await sleep(700);
await ev(`(() => { const [d,t] = document.querySelectorAll('.big-input'); const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }; set(d,'1958-07-21'); set(t,'05:40'); return true })()`);
// headless Chrome on macOS always formats native date inputs as US mm/dd/yyyy; Indian phones show dd/mm/yyyy,
// so for the picture only, the two inputs show their (already set) values as text in that format
await ev(`(() => { const [d,t] = document.querySelectorAll('.big-input'); for (const [el, v] of [[d, '21/07/1958'], [t, '05:40 AM']]) { el.type = 'text'; el.value = v; } return true })()`);
await blur(); await sleep(600); await shot(`${out}/02-when.png`);

// 3. step 3 (where): place search results. The last button ("Call the astrologer") is NEVER pressed.
await ev(`document.querySelector('.btn-primary-xl').click(); true`); await sleep(800);
await ev(`document.querySelector('.combo input').focus(); true`);
await send("Input.insertText", { text: "Tiruvalla" });
await waitFor(`/Kerala|കേരള/.test(document.querySelector('.combo')?.innerText || '')`, 60);
if (!(await waitFor(`!document.querySelector('.combo .place-loading')`, 140))) await ev(`document.querySelector('.combo .place-loading')?.remove(); true`); // the online search (Photon) can take 10+ s
await sleep(800); await shot(`${out}/03-place.png`);

// 4. call in progress (staged; reached by URL, so no call is armed)
await go("#/", 2500); await seed(true);
await go(`#/ask?${Q}`, 6000); await top();
await waitFor(`!!document.querySelector('.call-stage')`);
await ev(`(() => {
  const s = document.querySelector('.call-stage'); s.dataset.state = 'speaking'; s.style.setProperty('--them', '0.6');
  document.querySelector('.call-status').textContent = ${JSON.stringify(T("ജ്യോതിഷി സംസാരിക്കുന്നു", "The astrologer is speaking"))};
  const tm = document.querySelector('.call-timer'); tm.hidden = false; tm.textContent = '1:42';
  document.querySelector('.call-start').hidden = true;
  for (const sel of ['.call-end', '.call-mute']) document.querySelector(sel).hidden = false;
  for (const sel of ['.call-dock .call-consent', '.phone-field', '.call-head-right > .pill:last-child']) document.querySelectorAll(sel).forEach((e) => (e.hidden = true));
  document.querySelectorAll('.ask-under a, .ask-under > span').forEach((e) => (e.hidden = true));
  return true })()`);
await sleep(600); await shot(`${out}/04-call.png`);

// 5. after the call: "Was it accurate?" card (what setStatus('ended') + showStudy() draw)
await ev(`(() => {
  const s = document.querySelector('.call-stage'); s.dataset.state = 'ended'; s.style.setProperty('--them', '0');
  document.querySelector('.call-status').textContent = ${JSON.stringify(T("കോൾ അവസാനിച്ചു", "Call ended"))};
  document.querySelector('.call-timer').hidden = true;
  document.querySelector('.call-start').hidden = false;
  for (const sel of ['.call-end', '.call-mute']) document.querySelector(sel).hidden = true;
  for (const sel of ['.call-dock .call-consent', '.phone-field', '.call-head-right > .pill:last-child']) document.querySelectorAll(sel).forEach((e) => (e.hidden = false));
  document.querySelectorAll('.ask-under a, .ask-under > span').forEach((e) => (e.hidden = false));
  const card = document.createElement('section'); card.className = 'study-card';
  const h2 = document.createElement('h2'); h2.textContent = ${JSON.stringify(T("ഇത് എത്ര ശരിയായിരുന്നു?", "Was it accurate?"))};
  const p = document.createElement('p'); p.textContent = ${JSON.stringify(T("10 ചെറിയ ചോദ്യങ്ങൾ, 2 മിനിറ്റ്. ജ്യോതിഷം ശരിക്കും പ്രവർത്തിക്കുന്നുണ്ടോ എന്ന് കണ്ടെത്താനുള്ള ഒരു പഠനത്തിന് സഹായിക്കും.", "10 quick questions, about 2 minutes. Your answers help a study on whether astrology really works."))};
  const a = document.createElement('a'); a.className = 'btn-primary-xl'; a.href = '#'; a.textContent = ${JSON.stringify(T("ചോദ്യങ്ങൾ തുടങ്ങാം", "Answer 10 questions"))};
  card.append(h2, p, a); document.querySelector('.study-slot').replaceChildren(card);
  window.scrollTo(0, 0); window.scrollTo(0, Math.max(0, document.querySelector('.call-status').getBoundingClientRect().top - 28));
  return true })()`);
await sleep(700); await shot(`${out}/05-after.png`);

// 6. study question 5 (answers 1-4 go to the canned /api/survey)
await go(`#/study?${Q}&ready=1`, 6000); await top();
await waitFor(`!!document.querySelector('.study-choice')`);
for (let i = 0; i < 4; i++) { await ev(`document.querySelector('.study-choice').click(); true`); await sleep(400); }
await blur(); await top(); await sleep(500); await shot(`${out}/06-question.png`);

// 7. blind test (questions 5-9 answered, readings from the canned /api/blindtest)
for (let i = 0; i < 5; i++) { await ev(`document.querySelector('.study-choice').click(); true`); await sleep(400); }
await waitFor(`!!document.querySelector('.blind-card')`);
// show both readings and the A / B pick buttons: scroll to the first element edge that lets the 2nd button fit
await blur(); await top(); await sleep(500); await shot(`${out}/07-blind-top.png`); // heading + readings, for the post image
await ev(`(() => { window.scrollTo(0, 0);
  const btn = document.querySelectorAll('.blind-box .big-choice')[1].getBoundingClientRect().bottom + 20 - innerHeight;
  const edges = [0, ...['.q h1', '.q p', '.blind-box'].map((s) => document.querySelector(s).getBoundingClientRect().top - 14)];
  window.scrollTo(0, Math.max(0, edges.find((e) => e >= btn) ?? btn)); return true })()`);
await sleep(700); await shot(`${out}/07-blind.png`);

const staged = await ev(`window.__staged || []`);
console.log("staged in page:", staged.length ? [...new Set(staged)].join(", ") : "none");
console.log("reached network layer:", c.log.blocked.length ? c.log.blocked : "none");
console.log("errors:", c.errs.length ? c.errs : "none");
c.close();
if (c.log.blocked.length) { console.error("GUARD: requests reached the network layer (answered locally, but layer 1 missed them)"); process.exit(2); }
process.exit(0);
