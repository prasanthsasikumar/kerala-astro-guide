// Render 1080x1920 scene cards (caption band + phone screenshot) and the 1600x1000 post image in Chrome.
// usage: node compose.mjs <en|ml>      (needs media/shots-<lang>/ from capture.mjs)
//        node compose.mjs post         (needs media/shots-en/)
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { openChrome } from "./cdp.mjs";

const mode = process.argv[2] || "en";
const here = fileURLToPath(new URL(".", import.meta.url));
const media = `${here}../../../media`;
const logo = `${here}../../public/logo-mark.png`;
const PAPER = "#FBF8F2", INK = "oklch(22% 0.02 60)", ACCENT = "oklch(50% 0.17 32)", MUTED = "oklch(42% 0.02 60)";
const FONTS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@600;700&family=Noto+Sans:wght@500;600&family=Noto+Serif+Malayalam:wght@700&family=Noto+Sans+Malayalam:wght@500;600&display=block">`;

const CAPTIONS = {
  en: { brand: "Kerala Astro Guide", scenes: [
    ["01-home", "Free horoscopes, in plain words", "Malayalam first, plus 5 more languages"],
    ["02-step1", "Enter birth details", "Step 1: who"],
    ["03-step2", "Date and time of birth", "Step 2: when"],
    ["04-place", "Pick the place", "Step 3: where"],
    ["05-horoscope", "Your horoscope, in plain words", "Star, moon sign, ascendant, current period"],
    ["06-chart", "The Kerala chart, explained", "Every box and symbol in everyday language"],
    ["07-call", "Talk to the astrologer", "An AI voice call, up to 5 minutes"],
  ], end: ["Kerala Astro Guide", "astro.flowsxr.com", "free · open source"] },
  ml: { brand: "കേരള അസ്ട്രോ ഗൈഡ്", scenes: [
    ["01-home", "സൗജന്യ ജാതകം, ലളിതമായ ഭാഷയിൽ", "മലയാളത്തിലും മറ്റ് 5 ഭാഷകളിലും"],
    ["02-step1", "ജനന വിവരങ്ങൾ നൽകുക", "ഘട്ടം 1: ആര്"],
    ["03-step2", "ജനന തീയതിയും സമയവും", "ഘട്ടം 2: എപ്പോൾ"],
    ["04-place", "ജനന സ്ഥലം തിരഞ്ഞെടുക്കുക", "ഘട്ടം 3: എവിടെ"],
    ["05-horoscope", "നിങ്ങളുടെ ജാതകം, ലളിതമായ ഭാഷയിൽ", "നക്ഷത്രം, കൂറ്, ലഗ്നം, ദശ"],
    ["06-chart", "ഗ്രഹനില, വിശദീകരണത്തോടെ", "ഓരോ കളവും ലളിതമായി പറഞ്ഞുതരും"],
    ["07-call", "ജ്യോതിഷിയോട് സംസാരിക്കാം", "AI വോയ്സ് കോൾ, 5 മിനിറ്റ് വരെ"],
  ], end: ["കേരള അസ്ട്രോ ഗൈഡ്", "astro.flowsxr.com", "സൗജന്യം · ഓപ്പൺ സോഴ്സ്"] },
};

const base = (w, h, ml) => `
  html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; }
  body { background: ${PAPER}; color: ${INK}; font-family: ${ml ? '"Noto Sans Malayalam", ' : ""}"Noto Sans", sans-serif; -webkit-font-smoothing: antialiased; }
  .serif { font-family: ${ml ? '"Noto Serif Malayalam", ' : ""}"Noto Serif", serif; }
  .phone { border-radius: 44px; overflow: hidden; background: ${PAPER}; border: 2px solid oklch(86% 0.015 80);
    box-shadow: 0 2px 6px oklch(30% 0.03 60 / 0.08), 0 30px 70px oklch(30% 0.04 60 / 0.16); }
  .phone img { display: block; width: 100%; }`;

function sceneHtml(lang, shotFile, title, sub) {
  const ml = lang === "ml";
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${base(1080, 1920, ml)}
  .band { position: absolute; left: 0; right: 0; top: 0; height: 400px; display: flex; flex-direction: column; justify-content: center; padding: 30px 80px 0; box-sizing: border-box; }
  .brand { display: flex; align-items: center; gap: 16px; font-weight: 600; font-size: 34px; color: ${ACCENT}; }
  .brand img { width: 52px; height: 52px; }
  h1 { margin: 26px 0 0; font-weight: 700; font-size: ${ml ? 70 : 78}px; line-height: 1.22; letter-spacing: -0.01em; }
  p { margin: 18px 0 0; font-size: ${ml ? 38 : 40}px; color: ${MUTED}; font-weight: 500; }
  .phone { position: absolute; top: 450px; left: 50%; transform: translateX(-50%); width: 660px; height: ${Math.round(660 * 844 / 390)}px; }
  </style></head><body>
  <div class="band"><div class="brand"><img src="file://${logo}">${CAPTIONS[lang].brand}</div><h1 class="serif">${title}</h1><p>${sub}</p></div>
  <div class="phone"><img src="file://${shotFile}"></div></body></html>`;
}

function endHtml(lang) {
  const ml = lang === "ml"; const [name, url, tags] = CAPTIONS[lang].end;
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${base(1080, 1920, ml)}
  body { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  img { width: 300px; height: 300px; }
  h1 { margin: 40px 0 0; font-size: ${ml ? 76 : 84}px; font-weight: 700; color: ${INK}; }
  .url { margin-top: 70px; font-size: 76px; font-weight: 600; color: ${ACCENT}; }
  .tags { margin-top: 26px; font-size: 52px; color: ${MUTED}; font-weight: 500; }
  </style></head><body><img src="file://${logo}"><h1 class="serif">${name}</h1><div class="url">${url}</div><div class="tags">${tags}</div></body></html>`;
}

function postHtml() {
  const s = (f) => `file://${media}/shots-en/${f}.png`;
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${base(1600, 1000, false)}
  .top { position: absolute; left: 90px; right: 90px; top: 64px; }
  .brand { display: flex; align-items: center; gap: 14px; font-weight: 600; font-size: 26px; color: ${ACCENT}; }
  .brand img { width: 44px; height: 44px; }
  h1 { margin: 22px 0 0; font-size: 56px; line-height: 1.18; font-weight: 700; letter-spacing: -0.01em; max-width: 1300px; }
  .url { position: absolute; right: 90px; top: 74px; font-size: 26px; font-weight: 600; color: ${MUTED}; }
  .row { position: absolute; top: 330px; left: 0; right: 0; display: flex; justify-content: center; gap: 70px; }
  .phone { width: 380px; height: ${Math.round(380 * 844 / 390)}px; border-radius: 40px; }
  </style></head><body>
  <div class="top"><div class="brand"><img src="file://${logo}">Kerala Astro Guide</div>
  <h1 class="serif">My retired parents got into astrology.<br>So I built a way to test it.</h1></div>
  <div class="url">astro.flowsxr.com · free · open source</div>
  <div class="row"><div class="phone"><img src="${s("01-home")}"></div><div class="phone"><img src="${s("05-horoscope")}"></div><div class="phone"><img src="${s("07-call")}"></div></div>
  </body></html>`;
}

const c = await openChrome();
const render = async (html, file, w, h) => {
  const tmp = `${media}/.build/${Math.random().toString(36).slice(2)}.html`;
  writeFileSync(tmp, html); await c.size(w, h, 1, false);
  await c.nav("file://" + tmp, 600);
  await c.ev(`document.fonts.ready.then(() => Promise.all([...document.images].map((i) => i.complete ? 1 : new Promise((r) => (i.onload = i.onerror = r))))).then(() => true)`);
  await c.sleep(400); await c.shot(file);
};
mkdirSync(`${media}/.build`, { recursive: true });
if (mode === "post") {
  await render(postHtml(), `${media}/post-image.png`, 1600, 1000);
} else {
  const out = `${media}/.build/scenes-${mode}`; mkdirSync(out, { recursive: true });
  let i = 0;
  for (const [f, t, sub] of CAPTIONS[mode].scenes) await render(sceneHtml(mode, `${media}/shots-${mode}/${f}.png`, t, sub), `${out}/${String(++i).padStart(2, "0")}.png`, 1080, 1920);
  await render(endHtml(mode), `${out}/${String(++i).padStart(2, "0")}.png`, 1080, 1920);
}
c.close(); process.exit(0);
