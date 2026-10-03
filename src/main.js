import "./styles/app.css";
import { h, clear } from "./lib/dom.js";
import { t, lang } from "./lib/i18n.js";
import { getUI, setUI, onChange, initSettings } from "./lib/store.js";
import { DEFAULTS } from "./engine/settings.js";
import { APP_NAME, APP_NAME_ML } from "./lib/edition.js";

initSettings(DEFAULTS);
import("./modules/settings.js").then((m) => m.applyTypography());
import { routes, navGroups } from "./routes.js";

const app = document.getElementById("app");
const main = h("main.main", { id: "main" });
const nav = h("nav.nav", { "aria-label": "Main" });
const shell = h("div.shell",
  h("aside.sidebar",
    h("div.brand", h("img.brand-logo", { src: "/logo-mark.png", alt: "", width: 28, height: 28 }), h("span.brand-mark", APP_NAME_ML)),
    nav,
    h("div.sidebar-foot", langToggle(), themeToggle())),
  h("div",
    h("header.topbar",
      h("button.btn.btn-ghost", { "aria-label": "Menu", onclick: () => shell.toggleAttribute("data-nav-open") }, "☰"),
      h("span.brand-mark", APP_NAME_ML)),
    main));
app.append(shell);
shell.addEventListener("click", (e) => {
  if (shell.hasAttribute("data-nav-open") && !e.target.closest(".sidebar") && !e.target.closest(".topbar")) shell.removeAttribute("data-nav-open");
});

function langToggle() {
  const seg = h("div.seg", { role: "group", "aria-label": "Language" });
  const draw = () => seg.replaceChildren(
    ...[["ml", "മല"], ["en", "EN"]].map(([k, label]) =>
      h("button", { type: "button", "aria-pressed": String(lang() === k), onclick: () => setUI({ lang: k }) }, label)));
  draw();
  onChange((w) => w === "ui" && draw());
  return seg;
}

function applyTheme() {
  const th = getUI().theme;
  if (th === "light" || th === "dark") document.documentElement.dataset.theme = th;
  else delete document.documentElement.dataset.theme;
}
function themeToggle() {
  const order = ["auto", "light", "dark"];
  const btn = h("button.btn.btn-sm", { type: "button" });
  const draw = () => { btn.textContent = t(getUI().theme || "auto"); };
  btn.addEventListener("click", () => setUI({ theme: order[(order.indexOf(getUI().theme || "auto") + 1) % 3] }));
  draw();
  onChange((w) => w === "ui" && (draw(), applyTheme()));
  applyTheme();
  return btn;
}

function drawNav(current) {
  nav.replaceChildren(...navGroups().flatMap((g) => [
    ...(g.label ? [h("div.nav-group", g.label)] : []),
    ...g.items.map((r) => h("a", { href: "#/" + r.path, "aria-current": current === r.path ? "page" : null }, t(r.label))),
  ]));
}

let renderSeq = 0;
async function render() {
  const [path, query] = (location.hash.slice(2) || "horoscope").split("?");
  const params = Object.fromEntries(new URLSearchParams(query || ""));
  const route = routes.find((r) => r.path === path) || routes[0];
  drawNav(route.path);
  document.documentElement.lang = lang();
  document.title = `${t(route.label)} · ${APP_NAME}`;
  shell.removeAttribute("data-nav-open");
  const my = ++renderSeq;
  clear(main).append(h("p.muted", t("loading")));
  try {
    const mod = await route.load();
    if (my !== renderSeq) return;
    clear(main);
    await mod.render(main, params);
  } catch (err) {
    console.error(err);
    if (my === renderSeq) clear(main).append(h("div.error", String(err.message || err)));
  }
}
window.addEventListener("hashchange", render);
let lastLang = lang();
onChange((w) => {
  if (w === "ui" && lang() !== lastLang) {
    lastLang = lang();
    render();
  }
});
render();
