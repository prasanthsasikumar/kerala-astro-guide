import "./styles/app.css";
import "./styles/design.css";
import { h, clear } from "./lib/dom.js";
import { t, tx, lang, applyLangFont } from "./lib/i18n.js";
import { getUI, onChange, initSettings } from "./lib/store.js";
import { DEFAULTS } from "./engine/settings.js";
import { APP_NAME, APP_NAME_ML } from "./lib/edition.js";
import { trackScreen } from "./lib/analytics.js";
import { canLeave, isBusy } from "./lib/nav-guard.js";
import { biStack } from "./ui/bi.js";
import { screenHeader, langPill } from "./ui/screen.js";

initSettings(DEFAULTS);
import("./modules/settings.js").then((m) => m.applyTypography());
import { routes } from "./routes.js";

// Shell: desktop = 240px sidebar; phone = per-screen header + 3-item tab bar (Home · People · Settings).
// The site opens on the astrologer call (#/ = ask); the other tools live under #/home.
const SIDE = [
  ["ask", "ജ്യോതിഷിയോട് ചോദിക്കാം", "Talk to astrologer"],
  ["home", "എല്ലാ ഉപകരണങ്ങളും", "All tools"],
  ["horoscope", "ജാതകം", "Horoscope"],
  ["porutham", "വിവാഹപൊരുത്തം", "Marriage match"],
  ["divasa-panchangam", "ഇന്ന്", "Today's panchangam"],
  ["more", "കൂടുതൽ", "More tools"],
];
const TABS = [["home", "ഹോം", "Home"], ["people", "ആളുകൾ", "People"], ["settings", "ക്രമീകരണം", "Settings"]];

const app = document.getElementById("app");
const main = h("main.main", { id: "main" });
const sideNav = h("nav.side-nav", { "aria-label": "Main" });
const sideFoot = h("div.side-foot");
const tabbar = h("nav.tabbar", { "aria-label": "Main" });
const shell = h("div.shell",
  h("aside.sidebar",
    h("a.brand", { href: "#/" }, h("img.brand-logo", { src: "/logo-mark.png", alt: "", width: 32, height: 32 }), h("span.brand-mark", lang() === "ml" ? APP_NAME_ML : APP_NAME)),
    sideNav, sideFoot),
  main, tabbar);
app.append(shell);

function applyTheme() {
  const th = getUI().theme;
  if (th === "light" || th === "dark") document.documentElement.dataset.theme = th;
  else delete document.documentElement.dataset.theme;
}
applyTheme();

function drawChrome(route) {
  const active = route.nav || route.path;
  sideNav.replaceChildren(...SIDE.map(([p, ml, en]) =>
    h("a.side-item", { href: "#/" + (p === "ask" ? "" : p), "aria-current": active === p ? "page" : null }, biStack(ml, en))));
  sideFoot.replaceChildren(
    h("a.side-item", { href: "#/settings", "aria-current": active === "settings" ? "page" : null }, biStack("ക്രമീകരണം", "Settings")),
    h("div.side-lang", langPill()));
  tabbar.replaceChildren(...TABS.map(([p, ml, en]) =>
    h("a.tab", { href: "#/" + p, "aria-current": active === p || (p === "people" && active === "person") ? "page" : null },
      h("span.tab-pill"), tx(ml, en))));
}

// After a new deploy, an open page can ask for code files that no longer exist.
// Reload once to pick up the new version instead of showing an error.
function reloadForUpdate() {
  try {
    if (sessionStorage.getItem("ag.reloaded") === location.hash) return false;
    sessionStorage.setItem("ag.reloaded", location.hash);
  } catch { /* storage off: reload anyway */ }
  location.reload();
  return true;
}
window.addEventListener("vite:preloadError", (e) => { if (reloadForUpdate()) e.preventDefault(); });
const isStaleChunk = (err) => /dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(String(err?.message || err));

let renderSeq = 0;
async function render() {
  const [path, query] = (location.hash.slice(2) || "ask").split("?");
  const params = Object.fromEntries(new URLSearchParams(query || ""));
  const route = routes.find((r) => r.path === path) || routes.find((r) => r.path === "ask");
  shell.dataset.chrome = route.chrome || "legacy";
  // the call flow (details form and call screen) has no sidebar either, so nothing distracts from it
  shell.dataset.focus = route.path === "ask" || (route.path === "person" && params.for === "ask") ? "1" : "";
  drawChrome(route);
  document.documentElement.lang = lang();
  applyLangFont();
  document.title = route.path === "ask" ? `${APP_NAME_ML} · ${APP_NAME}: talk to an astrologer in Malayalam` : `${t(route.label)} · ${APP_NAME}`;
  if (route.path !== "admin") trackScreen(route.path, route.label);
  const my = ++renderSeq;
  main.className = "main";
  clear(main).append(h("p.muted.loading", t("loading")));
  try {
    const mod = await route.load();
    if (my !== renderSeq) return;
    clear(main);
    // older tool screens get a phone header with Back (their own headings stay)
    if ((route.chrome || "legacy") === "legacy") main.append(h("div.legacy-head", screenHeader({ back: route.back || "#/more" })));
    await mod.render(main, params);
    window.scrollTo(0, 0);
    try { sessionStorage.removeItem("ag.reloaded"); } catch { /* ignore */ }
  } catch (err) {
    console.error(err);
    if (isStaleChunk(err) && reloadForUpdate()) return;
    if (my === renderSeq) clear(main).append(h("div.error", String(err.message || err)));
  }
}

let shownHash = location.hash;
window.addEventListener("hashchange", () => {
  // a live call can veto navigation; put the address back and keep the screen as it is
  if (!canLeave()) {
    history.replaceState(null, "", shownHash || "#/");
    return;
  }
  shownHash = location.hash;
  render();
});
let lastLang = lang();
onChange((w) => {
  if (w !== "ui") return;
  applyTheme();
  // never redraw under a live call (it would orphan the call); the new language shows once it ends
  if (lang() !== lastLang && !isBusy()) {
    lastLang = lang();
    shell.querySelector(".brand-mark").textContent = lang() === "ml" ? APP_NAME_ML : APP_NAME;
    render();
  }
});
render();
