// r3 · Horoscope: simple view first (4 facts, current dasa, rasi chart, sections);
// the Expert toggle (remembered) reveals every tab as pill filters.
import "../../styles/ask.css";
import { h, clear } from "../../lib/dom.js";
import { t, tx, tf, lang, locale } from "../../lib/i18n.js";
import { listCharts, saveChart, getUI, setUI } from "../../lib/store.js";
import { getCtx, queryToInput } from "../../lib/ctx.js";
import { computeChart, dasa, subPeriods } from "../../engine/core.js";
import { NAK_EN, RASI_EN } from "../../engine/names.js";
import { nakName, rasiName } from "../../engine/names-i18n.js";
import { AYANAMSA, HOUSE, NODE } from "../../engine/settings.js";
import { people, initialOf, hrefFor, rememberPerson } from "../../lib/people.js";
import { cellsBy } from "../../engine/charts.js";
import { chartBox, EXPLAIN, explained } from "./tabs/charts.js";
import { bi, biStack } from "../../ui/bi.js";
import { langPill } from "../../ui/screen.js";
import { openSheet } from "../../ui/sheet.js";
import { TABS } from "./tabs.js";
import { studyCard } from "../../ui/study-card.js";

const DASA_EN = { Kethu: "Ketu", Ven: "Venus", Sun: "Sun", Moo: "Moon", Mar: "Mars", Rahu: "Rahu", Jup: "Jupiter", Sat: "Saturn", Mer: "Mercury" };
const fmtLong = (n) => new Date(n * 864e5).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export async function render(el, params) {
  const input = queryToInput(params) || (params.id && listCharts().find((c) => c.id === params.id));
  if (!input) return pick(el);
  input.timeUnknown = input.timeUnknown || params.tu === "1";
  rememberPerson(input);

  let expert = !!getUI().expert;
  let toggleBtn;
  const head = h("header.screen-head", h("a.back-link", { href: "#/" }, "‹ ", bi("ഹോം", "Home")), h("span.head-actions", expertToggle(), langPill()));
  const body = h("div");
  el.append(head, body);

  const ctx = await getCtx();
  const chart = computeChart(ctx.swe, ctx.db, ctx.settings, input);
  const [y, m, d] = input.date.split("-").map(Number);
  const when = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const sub = [when, input.timeUnknown ? tx("സമയം അറിയില്ല", "time unknown") : clock12(input.time), (input.place?.name || "").split(",")[0]].join(" · ");
  const editHref = input.id ? `#/person?for=horoscope&edit=${input.id}` : null;

  const top = h("div.person-head",
    h("span.avatar", initialOf(input.name)),
    h("div", h("h1", input.name || "—"), h("p.muted", sub, " · ",
      editHref ? h("a", { href: editHref }, tx("മാറ്റുക", "Edit")) : h("button.ask-textbtn", { type: "button", onclick: (e) => { const s = saveChart({ ...input, kind: "birth" }); rememberPerson(s); e.target.replaceWith(tx("സൂക്ഷിച്ചു", "Saved")); history.replaceState(null, "", hrefFor(s, "horoscope")); } }, tx("സൂക്ഷിക്കുക", "Save")))));

  const draw = () => {
    clear(body).append(top, expert ? expertView(chart, ctx, input, params) : simpleView(chart, ctx, input, openTab));
  };
  function openTab(tab) {
    expert = true;
    setUI({ expert, horoTab: tab });
    toggleBtn.setAttribute("aria-pressed", "true");
    draw();
    window.scrollTo(0, 0);
  }
  function expertToggle() {
    const b = toggleBtn = h("button.pill.expert-btn", { type: "button", "aria-pressed": String(expert) }, bi("വിദഗ്ധ", "Expert"), h("span.switch"));
    b.addEventListener("click", () => {
      expert = !expert;
      setUI({ expert });
      b.setAttribute("aria-pressed", String(expert));
      draw();
    });
    return b;
  }
  draw();
}

function clock12(hm) {
  let [hh, mm] = hm.split(":").map(Number);
  const ap = hh >= 12 ? "pm" : "am";
  hh = hh % 12 || 12;
  return `${hh}:${String(mm).padStart(2, "0")} ${ap}`;
}

// ---------- simple ----------
function simpleView(chart, ctx, input, openTab) {
  const { db } = ctx;
  const T = chart.time;
  const P = chart.planets;
  const ML = lang() === "ml";
  const EN = lang() === "en";
  const nk = nakName(T.nakIdx - 1, db);
  const sign = (i) => rasiName(i);
  const tithi = db.tblThidhi[T.tithi - 1];
  const fact = (ml, en, value, gloss) => h("div.fact", h("span.fact-label", bi(ml, en)), h("strong.fact-value", value), h("span.fact-gloss", gloss));
  const facts = h("div.facts",
    fact("നക്ഷത്രം", "Star", nk, EN ? `pada ${T.pada}` : `${NAK_EN[T.nakIdx - 1]}, pada ${T.pada}`),
    fact("കൂറ്", "Moon sign", sign(P.Moon.rasi), EN ? "" : RASI_EN[P.Moon.rasi]),
    input.timeUnknown
      ? fact("ലഗ്നം", "Ascendant", "—", tx("സമയം അറിയാതെ കണക്കാക്കാനാവില്ല", "Needs the birth time"))
      : fact("ലഗ്നം", "Ascendant", sign(P.Lagna.rasi), EN ? "" : RASI_EN[P.Lagna.rasi]),
    fact("തിഥി", "Lunar day", ML ? tithi.Malayalam : tithi.Thidhi, ML ? tithi.Thidhi : ""));

  // current dasa and sub-period
  const ds = dasa(db, chart, P.Moon.lon);
  const today = Math.floor(Date.now() / 864e5);
  const cur = ds.periods.find((p) => p.start <= today && today < p.end);
  let dasaCard = null;
  if (cur) {
    const subs = subPeriods(ds.D, ds.Y, cur.dasa.id, cur.years, cur.start);
    const sp = subs.find((s) => s.start <= today && today < s.end) || subs[0];
    const pct = Math.round(((today - sp.start) / (sp.end - sp.start)) * 100);
    dasaCard = h("div.dasa-card",
      h("span.fact-label", bi("ഇപ്പോഴത്തെ ദശ", "Current period")),
      h("strong.fact-value", ML ? `${cur.dasa.ml} · ${sp.dasa.full}` : `${DASA_EN[cur.dasa.lord]} · ${DASA_EN[sp.dasa.lord]}`),
      h("span.fact-gloss", tf("{date} വരെ", "{dasa} dasa, {sub} sub-period · until {date}", { date: fmtLong(sp.end), dasa: DASA_EN[cur.dasa.lord], sub: DASA_EN[sp.dasa.lord] })),
      h("span.progress", { role: "progressbar", "aria-valuenow": pct, "aria-valuemin": 0, "aria-valuemax": 100 }, h("span", { style: { width: pct + "%" } })));
  }

  const rasiCells = cellsBy(chart, (k) => P[k].rasi);
  const center = h("span", bi("ലഗ്നം", "Lagna"), h("br"), h("strong", input.timeUnknown ? "—" : sign(P.Lagna.rasi)));
  const rasi = chartBox(rasiCells, tx("രാശി", "Rasi"), { mark: input.timeUnknown ? new Set() : new Set([P.Lagna.rasi]), center, size: 520 });
  const enlarge = () => openSheet(tx("രാശിചക്രം", "Rasi chart"), h("div.stack",
    explained(chartBox(rasiCells, tx("രാശി", "Rasi"), { mark: new Set([P.Lagna.rasi]), center: h("strong", tx("രാശി", "Rasi")), size: 600 }), EXPLAIN.rasi(chart)),
    explained(chartBox(cellsBy(chart, (k) => P[k].navamsa), tx("നവാംശം", "Navamsa"), { mark: new Set([P.Lagna.navamsa]), center: h("strong", tx("നവാംശം", "Navamsa")), size: 600 }), EXPLAIN.navamsa()),
    input.timeUnknown ? h("p.notice", EXPLAIN.timeUnknown()) : null,
    h("p.chart-legend", EXPLAIN.legend())));

  const go = (tab) => () => openTab(tab);
  const sections = [
    ["ജ്യോതിഷിയോട് ചോദിക്കാം", "Talk to the astrologer about {name}", null, hrefFor(input, "ask")],
    ["എല്ലാ ചക്രങ്ങളും", "All charts · Navamsa, Bhava, Shadvarga", "charts"],
    ["ദശാകാലങ്ങൾ", "Dasa periods · full timeline", "dasa"],
    ["ഗ്രഹസ്ഫുടങ്ങൾ", "Planet positions · degrees & stars", "sphutas"],
    ["ദോഷങ്ങൾ", "Doshas · Karthru", "karthru"],
  ];
  return h("div.simple-view",
    facts,
    dasaCard && h("div.mt-sm", dasaCard),
    h("section.mt-lg",
      h("div.section-head", h("h2", bi("രാശിചക്രം", "Rasi chart")), h("button.ask-textbtn", { type: "button", onclick: enlarge }, bi("വലുതാക്കുക", "Enlarge"))),
      h("button.chart-tap", { type: "button", onclick: enlarge, "aria-label": tx("വലുതാക്കുക", "Enlarge") }, rasi)),
    h("div.rows.mt-lg", sections.map(([ml, en, tab, href]) =>
      href ? h("a.row", { href }, biStack(ml, en, { vars: { name: input.name || "" } }), h("span.chev", "›"))
        : h("button.row", { type: "button", onclick: go(tab) }, biStack(ml, en), h("span.chev", "›")))),
    studyCard(hrefFor(input, "study") + "&ready=1", "horoscope"));
}

// ---------- expert ----------
function expertView(chart, ctx, input, params) {
  const { settings } = ctx;
  const pills = h("div.pills", { role: "tablist" });
  const panel = h("section", { role: "tabpanel" });
  let showAll = false;
  let current = TABS.find((x) => x.id === params.tab) || TABS.find((x) => x.id === getUI().horoTab) || TABS[0];
  const drawPills = () => {
    const vis = showAll ? TABS : TABS.slice(0, 7).concat(TABS.indexOf(current) >= 7 ? [current] : []);
    pills.replaceChildren(...vis.map((tab) =>
      h("button.pill", { role: "tab", type: "button", "aria-selected": String(tab === current), class: tab === current ? "is-on" : "", onclick: () => show(tab) }, tx(tab.ml, tab.en))),
      !showAll && TABS.length > 7 ? h("button.pill.pill-more", { type: "button", onclick: () => { showAll = true; drawPills(); } }, `+ ${TABS.length - vis.length} ${tx("കൂടുതൽ", "more")}`) : null);
  };
  let seq = 0;
  async function show(tab) {
    current = tab;
    setUI({ horoTab: tab.id });
    drawPills();
    const my = ++seq;
    clear(panel).append(h("p.muted", t("loading")));
    try {
      const mod = await tab.load();
      const node = await mod.render(chart, ctx);
      if (my === seq) clear(panel).append(node);
    } catch (err) {
      console.error(err);
      if (my === seq) clear(panel).append(h("div.error", String(err.message || err)));
    }
  }
  show(current);
  const line = [AYANAMSA.find((a) => a.v === settings.ayanamsa)?.label, HOUSE.find((x) => x.v === settings.house)?.label, NODE.find((n) => n.v === settings.node)?.label].filter(Boolean).join(" · ");
  return h("div.expert-view", pills, panel,
    h("p.muted.settings-line", line, ". ", h("a", { href: "#/settings" }, tx("ക്രമീകരണങ്ങളിൽ മാറ്റാം", "Change in Settings"))));
}

// ---------- no person chosen ----------
function pick(el) {
  const list = people();
  if (!list.length) {
    location.replace("#/person?for=horoscope");
    return;
  }
  el.append(
    h("header.screen-head", h("a.back-link", { href: "#/" }, "‹ ", bi("ഹോം", "Home")), langPill()),
    h("h1.title", bi("ആരുടെ ജാതകം?", "Whose horoscope?")),
    h("div.rows.mt-lg", list.map((p) => h("a.row.row-person", { href: hrefFor(p, "horoscope") },
      h("span.left", h("span.avatar.avatar-lg", initialOf(p.name)), h("strong", p.name || "—")), h("span.chev", "›")))),
    h("div.bottom-bar", h("a.btn-primary-xl", { href: "#/person?for=horoscope" }, "+ ", bi("പുതിയ ആളെ ചേർക്കുക", "Add a person"))));
}
