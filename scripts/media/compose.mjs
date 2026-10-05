// Render the scene cards and the post image in Chrome.
// usage: node compose.mjs <en|ml>        1080x1920 scenes  -> media/.build/scenes-<lang>/
//        node compose.mjs <en|ml> wide   1920x1080 scenes  -> media/.build/scenes-<lang>-wide/
//        node compose.mjs post           1600x1000 post image -> media/post-image.png (needs media/shots-en/)
// Captions live in CAPTIONS below (no em dashes, no emoji). Scenes need media/shots-<lang>/ from capture.mjs.
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { openChrome } from "./cdp.mjs";

const mode = process.argv[2] || "en";
const wide = process.argv[3] === "wide";
const here = fileURLToPath(new URL(".", import.meta.url));
const media = `${here}../../../media`;
const logo = `${here}../../public/logo-mark.png`;
const PAPER = "#FBF8F2", INK = "oklch(22% 0.02 60)", ACCENT = "oklch(50% 0.17 32)", MUTED = "oklch(42% 0.02 60)";
const FONTS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@600;700&family=Noto+Sans:wght@500;600&family=Noto+Serif+Malayalam:wght@700&family=Noto+Sans+Malayalam:wght@500;600&display=block">`;
const PHONE_W = 390, PHONE_H = 844;

// [screenshot, heading, one line]; the story: enter birth details -> the call starts by itself ->
// talk in Malayalam or English -> a blind test: can you tell your real reading from a random one?
const CAPTIONS = {
  en: { brand: "Kerala Astro Guide", scenes: [
    ["01-first", "Talk to an astrologer", "A free voice call, up to 5 minutes"],
    ["02-when", "Enter the birth details", "Date and time of birth"],
    ["03-place", "Pick the birth place", "Type a town, tap it in the list"],
    ["04-call", "The call starts by itself", "Talk in Malayalam or English"],
    ["05-after", "Then: was it accurate?", "10 quick questions after the call"],
    ["06-question", "A small research study", "Did it really describe the person?"],
    ["07-blind", "The blind test", "Your real reading or a random one. Can you tell?"],
  ], end: ["Kerala Astro Guide", "astro.flowsxr.com", "free · open source"] },
  ml: { brand: "കേരള അസ്ട്രോ ഗൈഡ്", scenes: [
    ["01-first", "ജ്യോതിഷിയോട് സംസാരിക്കാം", "സൗജന്യ വോയ്സ് കോൾ, 5 മിനിറ്റ് വരെ"],
    ["02-when", "ജനന വിവരങ്ങൾ നൽകുക", "ജനന തീയതിയും സമയവും"],
    ["03-place", "ജനിച്ച സ്ഥലം", "സ്ഥലപ്പേര് എഴുതി ലിസ്റ്റിൽ നിന്ന് എടുക്കുക"],
    ["04-call", "കോൾ തനിയെ തുടങ്ങും", "മലയാളത്തിലോ ഇംഗ്ലീഷിലോ സംസാരിക്കാം"],
    ["05-after", "ഇനി: എത്ര ശരിയായിരുന്നു?", "കോളിനു ശേഷം 10 ചെറിയ ചോദ്യങ്ങൾ"],
    ["06-question", "ഒരു ചെറിയ പഠനം", "ജാതകം ആ ആളെ ശരിക്കും വിവരിച്ചോ?"],
    ["07-blind", "ബ്ലൈൻഡ് ടെസ്റ്റ്", "യഥാർത്ഥ വിവരണമോ, ക്രമരഹിതമായതോ? തിരിച്ചറിയാമോ?"],
  ], end: ["കേരള അസ്ട്രോ ഗൈഡ്", "astro.flowsxr.com", "സൗജന്യം · ഓപ്പൺ സോഴ്സ്"] },
};

const base = (w, h, ml) => `
  html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; }
  body { background: ${PAPER}; color: ${INK}; font-family: ${ml ? '"Noto Sans Malayalam", ' : ""}"Noto Sans", sans-serif; -webkit-font-smoothing: antialiased; }
  h1, p { text-wrap: balance; }
  .serif { font-family: ${ml ? '"Noto Serif Malayalam", ' : ""}"Noto Serif", serif; }
  .phone { border-radius: 44px; overflow: hidden; background: ${PAPER}; border: 2px solid oklch(86% 0.015 80);
    box-shadow: 0 2px 6px oklch(30% 0.03 60 / 0.08), 0 30px 70px oklch(30% 0.04 60 / 0.16); }
  .phone img { display: block; width: 100%; }
  .brand { display: flex; align-items: center; gap: 16px; font-weight: 600; color: ${ACCENT}; }`;
const head = (w, h, ml, css) => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${base(w, h, ml)}${css}</style></head>`;

function sceneTall(lang, shotFile, title, sub) {
  const ml = lang === "ml";
  return head(1080, 1920, ml, `
  .band { position: absolute; left: 0; right: 0; top: 0; height: 400px; display: flex; flex-direction: column; justify-content: center; padding: 30px 80px 0; box-sizing: border-box; }
  .brand { font-size: 34px; } .brand img { width: 52px; height: 52px; }
  h1 { margin: 26px 0 0; font-weight: 700; font-size: ${ml ? 66 : 78}px; line-height: 1.22; letter-spacing: -0.01em; }
  p { margin: 18px 0 0; font-size: ${ml ? 36 : 40}px; line-height: 1.35; color: ${MUTED}; font-weight: 500; }
  .phone { position: absolute; top: 450px; left: 50%; transform: translateX(-50%); width: 660px; height: ${Math.round(660 * PHONE_H / PHONE_W)}px; }
  `) + `<body>
  <div class="band"><div class="brand"><img src="file://${logo}">${CAPTIONS[lang].brand}</div><h1 class="serif">${title}</h1><p>${sub}</p></div>
  <div class="phone"><img src="file://${shotFile}"></div></body></html>`;
}

function sceneWide(lang, shotFile, title, sub, n, total) {
  const ml = lang === "ml";
  const ph = 960, pw = Math.round(ph * PHONE_W / PHONE_H);
  return head(1920, 1080, ml, `
  .phone { position: absolute; top: 60px; left: 330px; width: ${pw}px; height: ${ph}px; border-radius: 40px; }
  .text { position: absolute; left: ${330 + pw + 130}px; right: 150px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; }
  .brand { font-size: 32px; } .brand img { width: 50px; height: 50px; }
  h1 { margin: 34px 0 0; font-weight: 700; font-size: ${ml ? 66 : 80}px; line-height: 1.2; letter-spacing: -0.01em; }
  p { margin: 24px 0 0; font-size: ${ml ? 36 : 42}px; line-height: 1.4; color: ${MUTED}; font-weight: 500; }
  .count { margin-top: 56px; display: flex; gap: 10px; } .count span { width: 34px; height: 6px; border-radius: 3px; background: oklch(88% 0.015 80); } .count span.on { background: ${ACCENT}; }
  `) + `<body>
  <div class="phone"><img src="file://${shotFile}"></div>
  <div class="text"><div class="brand"><img src="file://${logo}">${CAPTIONS[lang].brand}</div><h1 class="serif">${title}</h1><p>${sub}</p>
  <div class="count">${Array.from({ length: total }, (_, i) => `<span class="${i < n ? "on" : ""}"></span>`).join("")}</div></div></body></html>`;
}

function endCard(lang, w, h) {
  const ml = lang === "ml"; const [name, url, tags] = CAPTIONS[lang].end;
  const k = w > h ? 0.8 : 1;
  return head(w, h, ml, `
  body { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  img { width: ${300 * k}px; height: ${300 * k}px; }
  h1 { margin: ${40 * k}px 0 0; font-size: ${(ml ? 76 : 84) * k}px; font-weight: 700; color: ${INK}; }
  .url { margin-top: ${70 * k}px; font-size: ${76 * k}px; font-weight: 600; color: ${ACCENT}; }
  .tags { margin-top: ${26 * k}px; font-size: ${52 * k}px; color: ${MUTED}; font-weight: 500; }
  `) + `<body><img src="file://${logo}"><h1 class="serif">${name}</h1><div class="url">${url}</div><div class="tags">${tags}</div></body></html>`;
}

function postHtml() {
  const s = (f) => `file://${media}/shots-en/${f}.png`;
  const ph = 680, pw = Math.round(ph * PHONE_W / PHONE_H); // whole phones, nothing cut at the bottom
  return head(1600, 1000, false, `
  .top { position: absolute; left: 90px; right: 90px; top: 60px; }
  .brand { font-size: 26px; gap: 14px; } .brand img { width: 44px; height: 44px; }
  h1 { margin: 22px 0 0; font-size: 54px; line-height: 1.18; font-weight: 700; letter-spacing: -0.01em; max-width: 1300px; }
  .url { position: absolute; right: 90px; top: 70px; font-size: 26px; font-weight: 600; color: ${MUTED}; }
  .row { position: absolute; top: 284px; left: 0; right: 0; display: flex; justify-content: center; gap: 110px; }
  .col { display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .phone { width: ${pw}px; height: ${ph}px; border-radius: 38px; }
  `) + `<body>
  <div class="top"><div class="brand"><img src="file://${logo}">Kerala Astro Guide</div>
  <h1 class="serif">My retired parents got into astrology.<br>So I built a way to test it.</h1></div>
  <div class="url">astro.flowsxr.com · free · open source</div>
  <div class="row">
    <div class="col"><div class="phone"><img src="${s("01-first")}"></div></div>
    <div class="col"><div class="phone"><img src="${s("04-call")}"></div></div>
    <div class="col"><div class="phone"><img src="${s("07-blind-top")}"></div></div>
  </div></body></html>`;
}

const c = await openChrome();
const render = async (html, file, w, h) => {
  const tmp = `${media}/.build/${Math.random().toString(36).slice(2)}.html`;
  writeFileSync(tmp, html); await c.size(w, h, 1, false);
  await c.nav("file://" + tmp, 600);
  await c.ev(`document.fonts.ready.then(() => Promise.all([...document.images].map((i) => i.complete ? 1 : new Promise((r) => (i.onload = i.onerror = r))))).then(() => true)`);
  const over = await c.ev(`[...document.querySelectorAll('h1, p, .url, .tags')].filter((e) => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > innerWidth || e.getBoundingClientRect().bottom > innerHeight).map((e) => e.textContent.slice(0, 40))`);
  if (over?.length) console.warn("overflow in", file, over);
  await c.sleep(400); await c.shot(file); rmSync(tmp);
};
mkdirSync(`${media}/.build`, { recursive: true });
if (mode === "post") {
  await render(postHtml(), `${media}/post-image.png`, 1600, 1000);
} else {
  const out = `${media}/.build/scenes-${mode}${wide ? "-wide" : ""}`; rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
  const [W, H] = wide ? [1920, 1080] : [1080, 1920];
  const list = CAPTIONS[mode].scenes;
  let i = 0;
  for (const [f, t, sub] of list) {
    const shotFile = `${media}/shots-${mode}/${f}.png`;
    i += 1;
    await render(wide ? sceneWide(mode, shotFile, t, sub, i, list.length) : sceneTall(mode, shotFile, t, sub), `${out}/${String(i).padStart(2, "0")}.png`, W, H);
  }
  await render(endCard(mode, W, H), `${out}/${String(++i).padStart(2, "0")}.png`, W, H);
}
c.close(); process.exit(0);
