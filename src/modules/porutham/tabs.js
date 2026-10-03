// Vivaha porutham result tabs. Each render(match, ctx) -> Node.
import { h, kv, table } from "../../lib/dom.js";
import { tx, lang } from "../../lib/i18n.js";
import * as N from "../../engine/names.js";
import { dasa, ORDER } from "../../engine/core.js";
import { keralaChart } from "../../components/kerala-chart.js";
import { cellsBy } from "../../engine/charts.js";
import * as P from "../../engine/porutham.js";

const pad = (n) => String(n).padStart(2, "0");
const FEMALE = () => tx("സ്ത്രീ", "Female");
const MALE = () => tx("പുരുഷന്‍", "Male");
const band = (ml, en) => h("h2.pm-band", tx(ml, en));
const chip = (ok, okText, badText) => h("span.pm-chip", { class: ok ? "is-good" : "is-bad" }, ok ? okText : badText);
// interpretive text stays Malayalam; English mode adds a short gloss underneath (nothing when absent)
export const gloss = (ml, en) => (ml ? [h("p", ml), lang() === "en" && en ? h("p.muted.pm-gloss", en) : null] : []);
const DASA_PLANET = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];

// ---- 0 Time ----
function displayDate(input) {
  const [y, m, d] = input.date.split("-");
  const [hh, mi] = input.time.split(":").map(Number);
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${d}-${m}-${y} ${pad(h12)}:${pad(mi)} ${hh >= 12 ? "PM" : "AM"}`;
}
function personTime(chart, db, who) {
  const { input, place } = chart;
  const T = chart.time;
  const moon = chart.planets.Moon.lon;
  const star = P.starOf(moon);
  const nk = db.tblMalayalamNakshatra[star - 1];
  const dm = (v, pos, neg) => `${Math.trunc(Math.abs(v))} ${v < 0 ? neg : pos} ${Math.round((Math.abs(v) % 1) * 60)}`;
  const b = dasa(db, chart, moon).balance;
  return h("div.card",
    h("h3", { style: { marginTop: 0 } }, who),
    kv([
      [tx("പേര്", "Name"), input.name || "untitled"],
      [tx("തീയതി", "Date"), displayDate(input)],
      [tx("സ്ഥലം", "Place"), place.name],
      [tx("രേഖാംശം", "Longitude"), dm(place.lon, "E", "W")],
      [tx("അക്ഷാംശം", "Latitude"), dm(place.lat, "N", "S")],
      [tx("മലയാളതീയതി", "Malayalam date"), `${T.malayalam.day} ${N.malMonth(T.malayalam.month)} ${T.malayalam.year}`],
      [tx("ആഴ്ച(ഭാരതീയം)", "Weekday (Indian)"), N.weekday(T.indianDow)],
      [tx("ആഴ്ച(പാശ്ചാത്യം)", "Weekday (Western)"), N.weekday(T.westernDow)],
      [tx("ജന്മനക്ഷത്രം", "Birth star"), `${N.nak(db, star)} ${tx("പാദം", "pada")} - ${P.padaOf(moon)}`],
      [tx("ജന്മശിഷ്ടം", "Dasa balance"), `${b.years} ${tx("വ", "y")} ${b.months} ${tx("മാ", "m")} ${b.days} ${tx("ദി", "d")} ${tx(b.lord.ml, DASA_PLANET[b.lord.id - 1] + " dasa")}`],
      [tx("ഗണം", "Ganam"), nk.Ganam],
      [tx("യോനി", "Yoni"), nk.Yoni],
      [tx("മൃഗം", "Animal"), N.MRUGAM[star - 1]],
      [tx("പക്ഷി", "Bird"), nk.Pakshi],
      [tx("സൂര്യോദയം", "Sunrise"), N.clock(chart.sun.R)],
      [tx("സൂര്യാസ്‌തമയം", "Sunset"), N.clock(chart.sun.S)],
    ]));
}
export function time(M, { db }) {
  return h("div.stack", band("ജനനസമയം", "Birth details"),
    h("div.pm-pair", personTime(M.female, db, FEMALE()), h("div.pm-break"), personTime(M.male, db, MALE())));
}

// ---- 1 Sphutas ----
const NL = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const nakLabel = (L) => {
  const n = Math.trunc((L * 6) / 80);
  return `${tx(N.NAK_SHORT_ML[n], N.NAK_EN[n])} (${N.planetShort(NL[n % 9])})`;
};
function sphutaTable(chart, title) {
  const Pl = chart.planets;
  const rows = ORDER.map((k) => {
    const marks = (Pl[k].speed < 0 && k !== "Rahu" && k !== "Ketu" ? tx(" (വ)", " (R)") : "") + (Pl[k].combust ? tx(" (മൌ)", " (C)") : "");
    return [N.planet(k) + marks, h("span.num", N.sphuta(Pl[k].lon)), nakLabel(Pl[k].lon)];
  });
  return h("div", h("h3", title), table([tx("സ്ഫുടങ്ങൾ", "Body"), tx("രാ. ഭാ. ക.", "Sign-deg-min"), tx("ന.", "Star")], rows));
}
export function sphutas(M) {
  return h("div.stack",
    h("div.pm-pair",
      sphutaTable(M.female, tx("സ്ത്രീ ഗ്രഹസ്ഫുടം", "Female planet longitudes")),
      sphutaTable(M.male, tx("പുരുഷന്‍ ഗ്രഹസ്ഫുടം", "Male planet longitudes"))),
    h("p.muted", tx("വ = വക്രം. മൌ = മൌഢ്യം . ന. = നക്ഷത്രം", "R = retrograde. C = combust. Sign 0 = Mesha (Aries).")));
}

// ---- 2 Charts ----
function chartPair(chart, db, rasiCap, navCap) {
  const Pl = chart.planets;
  const box = (signOf, cap, mark, cls) => keralaChart(cellsBy(chart, signOf).map((ks) => ks.map((k) => N.planetShort(k))),
    { title: cap, center: h("strong", cap), mark });
  const star = N.nak(db, P.starOf(Pl.Moon.lon));
  return [box((k) => Pl[k].rasi, `${rasiCap} - ${star}`, new Set([Pl.Lagna.rasi])),
    h("div.pm-navamsa", box((k) => Pl[k].navamsa, `${navCap} - ${tx("നവാംശം", "Navamsa")}`, new Set([Pl.Lagna.navamsa])))];
}
export function charts(M, { db }) {
  return h("div.stack", band("ഗ്രഹനില (സ്ത്രീ, പുരുഷന്‍)", "Charts (female, male)"),
    h("div.charts-row", chartPair(M.female, db, tx("സ്ത്രീ", "Female"), tx("സ്ത്രീ", "Female"))),
    h("div.pm-break"),
    h("div.charts-row", chartPair(M.male, db, tx("പു.", "Male"), tx("പു.", "Male"))),
    h("p.muted", tx("ല = ലഗ്നം. ര = രവി. ച = ചന്ദ്രന്‍. കു = കുജന്‍ (ചൊവ്വ). ബു = ബുധന്‍. ഗു = ഗുരു. ശു = ശുക്രന്‍. മ = മന്ദന്‍ (ശനി). സ = രാഹു. ശി = കേതു. മാ = മാന്ദി.",
      "As = Lagna, Su Mo Ma Me Ju Ve Sa, Ra = Rahu, Ke = Ketu, Md = Mandi. The shaded cell is the lagna.")));
}

// ---- 3 Nakshatra porutham (also used by the Tools screen) ----
export function poruthamTable(grades) {
  return table([tx("പൊരുത്തം", "Porutham"), tx("ഫലം", "Grade"), tx("പോയിന്റ്", "Points")],
    P.PORUTHAM_NAMES.map(([ml, en], i) => [tx(ml, `${i + 1}) ${en}`), tx(P.gradeMl(grades[i]), P.gradeEn(grades[i])), h("span.num", P.gradePts(grades[i]))]), { rightCols: [2] });
}
export function countBlock(cnt8, cnt10) {
  return h("div",
    h("b", tx("പൊരുത്തസംഖ്യ", "Porutham count")),
    h("div", tx(`എട്ടില്‍ ${P.countWord(cnt8)} പൊരുത്തം`, `${P.countValue(cnt8)} out of 8`)),
    h("div", tx(`പത്തില്‍ ${P.countWord(cnt10)} പൊരുത്തം`, `${P.countValue(cnt10)} out of 10`)));
}
export function nakshatra(M, { db }) {
  const n = M.nak;
  const who = (chart, idx, label) => {
    const lon = chart.planets.Moon.lon;
    const r = Math.floor(((idx - 1) * 12) / 36);
    return [label, `${N.nak(db, P.starOf(lon))} ${tx("പാദം", "pada")} ${P.padaOf(lon)}`, N.rasi(r)];
  };
  return h("div.stack", band("നക്ഷത്രപൊരുത്തങ്ങള്‍", "Nakshatra porutham"),
    table(["", tx("നക്ഷത്രം", "Star"), tx("കൂറ്", "Moon sign")], [who(M.female, n.fIdx, FEMALE()), who(M.male, n.mIdx, MALE())]),
    poruthamTable(n.grades),
    countBlock(n.cnt8, n.cnt10),
    h("div.pm-flags",
      chip(n.pass, tx("നക്ഷത്രപൊരുത്തം അനുകൂലം", "Star match: pass"), tx("നക്ഷത്രപൊരുത്തം പോരാ", "Star match: fail")),
      chip(n.rajjuOk, tx("മധ്യമരജ്ജുദോഷമില്ല", "No madhya rajju"), tx("മധ്യമരജ്ജുദോഷമുണ്ട്", "Madhya rajju dosham")),
      chip(n.vedhaOk, tx("വേധമില്ല", "No vedha"), tx("നക്ഷത്രവേധമുണ്ട്", "Vedha dosham"))),
    h("p.muted", tx(
      `പാസാകാന്‍: വേധമില്ലാതെ എട്ടില്‍ 3 എങ്കിലും, മധ്യമരജ്ജു ഉണ്ടെങ്കില്‍ 5 എങ്കിലും (പൂര്‍ണസംഖ്യ മാത്രം). പട്ടിക #${n.id}: ${n.value}`,
      `Pass rule: no vedha and at least 3 of 8, or at least 5 of 8 with madhya rajju (whole number part only). Table row #${n.id}: ${n.value}`)));
}

// ---- 4 Papasamyam ----
const REF_HEAD = () => [tx("ലഗ്നാല്‍", "From lagna"), tx("ചന്ദ്രാല്‍", "From moon"), tx("ശുക്രാല്‍", "From venus")];
const PAPA_EN = { sun: "Su", mars: "Ma", saturn: "Sa", rahu: "Ra", ketu: "Ke" };
function papaPerson(t, title) {
  const rows = P.PAPA_PLANETS.map((p) => [tx(P.PAPA_LABEL[p], PAPA_EN[p]), ...P.REFS.map((r) => h("span.num", P.fmtPts(t.cells[p][r])))]);
  rows.push([h("b", tx("ആകെ പാപസംഖ്യ", "Total papa points")), "", "", h("b.num", P.fmtPts(t.total))]);
  return h("div", h("h3", title), table([tx("ഗ്രഹം", "Planet"), ...REF_HEAD()], rows, { rightCols: [1, 2, 3] }));
}
function papaMethod2(side, title) {
  const cell = (c) => h("span", { class: c.hit ? "" : "muted" }, c.text);
  return h("div", h("h3", title), table([title, ...REF_HEAD(), tx("ആകെ", "Total")], [
    [h("span", "വൈധവ്യം", h("br"), "(1, 2, 4, 7, 8, 12)"), ...P.REFS.map((r) => cell(side.v[r])), h("b.num", side.V)],
    [h("span", "ദീര്‍ഘമംഗല്യം", h("br"), "(1, 2, 7, 9)"), ...P.REFS.map((r) => cell(side.d[r])), h("b.num", side.D)],
  ]));
}
const FOOT_PAPA = "ര = രവി‍, ച = ചന്ദ്രന്‍, കു = ചൊവ്വ, ബു = ബുധന്‍, ഗു = ഗുരു, ശു = ശുക്രന്‍, മ = ശനി, സ = രാഹു, ശി = കേതു";
export function papa(M) {
  const p = M.papa;
  const method = h("p.muted", tx("രീതി: ", "Method: "), [
    "ദമ്പത്യോരൈക്യകാലേ എന്നിത്യാദി നിയമം", "ലഗ്നാത് പൂർണം എന്നിത്യാദി നിയമം", "ദീർഘമംഗല്യയോഗമാണ് വൈധവ്യദോഷം പരിഹാരം"][p.method] ?? "",
  tx(" (ക്രമീകരണങ്ങളില്‍ മാറ്റാം)", " (change in Settings)"));
  let body, verdict;
  if (p.method === 2) {
    body = h("div.pm-pair", papaMethod2(p.female, tx("സ്ത്രീ", "Female")), papaMethod2(p.male, tx("പുരുഷൻ", "Male")));
    verdict = h("div.card.phalam", (p.lines || []).map((l) => h("p", l)), chip(p.flag === 1, tx("അനുകൂലം", "Acceptable"), tx("അധമം", "Bad")));
  } else {
    body = h("div.pm-pair",
      papaPerson(p.female, tx("സ്ത്രീജാതകാല്‍ പാപസംഖ്യ", "Female papa points")),
      papaPerson(p.male, tx("പുരുഷജാതകാല്‍ പാപസംഖ്യ", "Male papa points")));
    verdict = h("div.card.phalam", p.text && gloss(p.text[0], p.text[1]), chip(p.flag === 1, tx("അനുകൂലം", "Acceptable"), tx("അധമം", "Bad")));
  }
  return h("div.stack", band("പാപസാമ്യം", "Papasamyam"), method, body, verdict, h("p.muted", FOOT_PAPA));
}

// ---- 5 Dasa sandhi ----
const dasaName = (e) => (e.lord == null ? tx("ജനനം", "Birth") : tx(e.label, DASA_PLANET[e.id - 1]));
export function dasaSandhi(M) {
  const rows = M.fEnds.map((f, i) => [dasaName(f), h("span.num", P.fmtDn(f.n)), dasaName(M.mEnds[i]), h("span.num", P.fmtDn(M.mEnds[i].n))]);
  const s = M.sandhi;
  const fromNow = M.female.settings.dasaSandhiFromNow !== false;
  return h("div.stack", band("ദശാസന്ധി", "Dasa sandhi"),
    h("div.table-wrap", h("table.data",
      h("thead",
        h("tr", h("th", { colspan: 2 }, FEMALE()), h("th", { colspan: 2 }, MALE())),
        h("tr", ...[0, 1].flatMap(() => [h("th", tx("ദശ", "Dasa")), h("th", tx("അവസാനം", "Ends"))]))),
      h("tbody", rows.map((r) => h("tr", r.map((c) => h("td", c))))))),
    h("p.muted", fromNow ? tx("നിലവിലെ തീയതി മുതല്‍ (ഒരു വര്‍ഷത്തിലേറെ പഴയ മാറ്റങ്ങള്‍ ഒഴിവാക്കുന്നു)", "From the current date (changes more than a year in the past are skipped)")
      : tx("ജനനതീയതി മുതല്‍", "From the birth date")),
    h("div.card.phalam",
      s.lines.map((l) => h("div", { class: l.grade === "D" ? "pm-bad" : "" }, gloss(P.sandhiLineMl(l), P.sandhiLineEn(l)))),
      s.flag === 0 ? gloss(P.REMEDY_DASA, P.FINAL_EN?.remedy) : gloss(P.NO_SANDHI, "No dasa sandhi dosham.")),
    h("p.muted", "ര. = രവി (സൂര്യന്‍). ച. = ചന്ദ്രന്‍, കു = കുജന്‍ (ചൊവ്വ). ബു = ബുധന്‍, ഗു = ഗുരു. ശു = ശുക്രന്‍. മ = മന്ദന്‍ (ശനി). സ = സര്‍പ്പന്‍ (രാഹു). ശി = ശിഖി (കേതു). മാ = മാന്ദി"));
}

// ---- 6 Kuja dosham ----
function kujaPerson(side, title) {
  const heads = { lagna: tx("ലഗ്നാല്‍", "From lagna"), moon: tx("ചന്ദ്രാല്‍", "From moon"), venus: tx("ശുക്രാല്‍", "From venus") };
  return h("div.card", h("h3", { style: { marginTop: 0 } }, title),
    P.REFS.map((r) => h("div.pm-kuja",
      h("b", heads[r], " ", chip(!side.cells[r].dosha, tx("ദോഷമില്ല", "no dosha"), tx("ദോഷം", "dosha"))),
      h("p", side.cells[r].text))),
    h("p.muted", tx(`ആകെ ദോഷം: ${side.K}`, `Total dosha count: ${side.K}`)));
}
export function kuja(M) {
  const k = M.kuja;
  return h("div.stack", band("കുജദോഷം", "Kuja dosham"),
    h("div.pm-pair", kujaPerson(k.female, tx("സ്ത്രീ ജാതകാല്‍", "Female chart")), kujaPerson(k.male, tx("പുരുഷ ജാതകാല്‍", "Male chart"))),
    h("div.card.phalam", k.text && gloss(k.text[0], k.text[1]), chip(k.flag === 1, tx("അനുകൂലം", "Acceptable"), tx("അധമം", "Bad"))));
}

// ---- 7 Abhiprayam ----
export function opinion(M) {
  const o = M.opinion;
  const rows = [
    [tx("നക്ഷത്രപൊരുത്തം", "Nakshatra porutham"), M.nak.pass],
    [tx("പാപസാമ്യം", "Papasamyam"), M.papa.flag === 1],
    [tx("ദശാസന്ധി", "Dasa sandhi"), M.sandhi.flag === 1],
    [tx("കുജദോഷം", "Kuja dosham"), M.kuja.flag === 1],
  ];
  const head = { best: tx("ഉത്തമം", "Best match"), remedy: tx("മധ്യമം (പരിഹാരത്തോടെ)", "Medium, with remedy"), reject: tx("യോജിപ്പിക്കരുത്", "Not recommended") }[o.outcome];
  return h("div.stack", band("അഭിപ്രായം", "Opinion"),
    h("div.pm-flags", rows.map(([l, ok]) => chip(ok, h("span", "✓ ", l), h("span", "✗ ", l)))),
    h("div.card.phalam",
      h("h3", { class: o.outcome === "reject" ? "pm-bad" : "" }, head),
      h("p", o.good, o.bad, o.dosha),
      gloss(o.final, P.FINAL_EN?.[o.outcome])));
}

export const TABS = [
  { id: "time", ml: "സമയം", en: "Time", render: time },
  { id: "sphutas", ml: "സ്ഫുടങ്ങള്‍", en: "Longitudes", render: sphutas },
  { id: "charts", ml: "ഗ്രഹനില", en: "Charts", render: charts },
  { id: "nakshatra", ml: "നക്ഷത്രപൊരുത്തം", en: "Nakshatra porutham", render: nakshatra },
  { id: "papa", ml: "പാപസാമ്യം", en: "Papasamyam", render: papa },
  { id: "dasa", ml: "ദശാസന്ധി", en: "Dasa sandhi", render: dasaSandhi },
  { id: "kuja", ml: "കുജദോഷം", en: "Kuja dosham", render: kuja },
  { id: "opinion", ml: "അഭിപ്രായം", en: "Opinion", render: opinion },
  { id: "print", ml: "Print", en: "Print", render: printAll },
];

// ---- 8 Print: every tab, page breaks between ----
function printAll(M, ctx) {
  const f = M.female.input.name || "untitled", m = M.male.input.name || "untitled";
  return h("div.stack",
    h("div.form-actions.no-print", { style: { marginTop: 0 } },
      h("button.btn.btn-primary", { type: "button", onclick: () => { const old = document.title; document.title = `AG-Matching ${f} & ${m}`; window.print(); document.title = old; } }, tx("പ്രിന്റ്", "Print"))),
    h("h1.pm-print-title", `${f} & ${m}`),
    TABS.filter((x) => x.id !== "print").map((x, i) => h("section.pm-print-page", { class: i ? "pm-page-break" : "" }, x.render(M, ctx))));
}
