// UI shared by Prashnam and Divasa panchangam: tab framework, Time / Sphutas / Chart / Guna-dosham tabs.
import "../../styles/prashnam.css";
import { h, clear, kv } from "../../lib/dom.js";
import { t, tx } from "../../lib/i18n.js";
import { getUI, setUI } from "../../lib/store.js";
import * as N from "../../engine/names.js";
import { ORDER } from "../../engine/core.js";
import { cellsBy, bhavaChartSign, bhavabala } from "../../engine/charts.js";
import { AYANAMSA, HOUSE } from "../../engine/settings.js";
import { keralaChart } from "../../components/kerala-chart.js";
import { gunaDosham, byId, ampm } from "../../engine/panchangam.js";

// ---------- small building blocks ----------
export const band = (ml, en) => h("h2.pr-band", tx(ml, en));
export const lines = (arr) => (arr || []).flatMap((x, i) => (i ? [h("br"), x] : [x]));

/** rows: arrays of cells, or {cells, cls}, or {section: label} */
export function dataTable(headers, rows0) {
  const rows = rows0.filter(Boolean);
  const n = headers ? headers.length : Math.max(...rows.map((r) => (Array.isArray(r) ? r.length : r.cells?.length || 1)));
  return h("div.table-wrap",
    h("table.data",
      headers && h("thead", h("tr", headers.map((x) => h("th", x)))),
      h("tbody", rows.filter(Boolean).map((r) => {
        if (r.section) return h("tr.pr-section", h("th", { colSpan: n }, r.section));
        const cells = Array.isArray(r) ? r : r.cells;
        return h("tr", { class: r.cls || "" }, cells.map((c) => (c && c.td ? h("td", { class: c.cls || "", colSpan: c.span || 1 }, c.td) : h("td", c))));
      }))));
}

export const yesNo = (present, good) => (present
  ? h("span", { class: good ? "pr-yes-good" : "pr-yes-bad" }, tx("ഉണ്ട്", "Yes"))
  : tx("ഇല്ല", "No"));

export const labeller = (db) => ({
  nak: (i) => N.nak(db, i),
  wd: (i) => N.weekday(i),
  tithi: (i) => { const r = byId(db.tblThidhi, i); return tx(r.Malayalam, r.Thidhi); },
  karana: (i) => { const r = byId(db.tblKaranam, i); return tx(r.Html, r.karanam); },
  rasi: (i) => N.rasi(i),
});

// ---------- tab framework ----------
/**
 * tabs: [{id, ml, en, render(data, ctx) -> Node}]
 * opts: {params, uiKey, data, ctx, hashBase}
 */
export function tabbed(el, tabs, { params, uiKey, data, ctx, hashBase }) {
  const tabBar = h("div.tabs.no-print", { role: "tablist" });
  const panel = h("section", { role: "tabpanel" });
  el.append(tabBar, panel);
  let current = tabs.find((x) => x.id === params.tab) || tabs.find((x) => x.id === getUI()[uiKey]) || tabs[0];
  const draw = () => tabBar.replaceChildren(...tabs.map((tab) =>
    h("button", { role: "tab", type: "button", "aria-selected": String(tab === current), onclick: () => show(tab) }, tx(tab.ml, tab.en))));
  function show(tab) {
    current = tab;
    setUI({ [uiKey]: tab.id });
    draw();
    const q = new URLSearchParams(hashBase.split("?")[1] || "");
    q.set("tab", tab.id);
    history.replaceState(null, "", `${hashBase.split("?")[0]}?${q}`);
    try {
      clear(panel).append(tab.render(data, ctx));
    } catch (err) {
      console.error(err);
      clear(panel).append(h("div.error", String(err.message || err)));
    }
  }
  show(current);
}

// ---------- Time tab ----------
const pad = (n) => String(n).padStart(2, "0");
const ng = (x) => tx(`${Math.trunc(x)} നാ.${Math.trunc((x % 1) * 60)} വിനാ.`, `${Math.trunc(x)} ng ${Math.trunc((x % 1) * 60)} vn`);
const ngT = (o) => tx(`${o.n} നാ. ${o.v} വിനാ.`, `${o.n} ng ${o.v} vn`);
const nvt = (x) => `${Math.trunc(x)}-${Math.trunc((x % 1) * 60)}-${Math.trunc((((x % 1) * 60) % 1) * 60)}`;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** variant: "prashnam" or "divasa" */
export function timeTab({ chart, time: T }, { db }, variant) {
  const { place, settings, date } = chart;
  const CT = chart.time;
  const sh = (k) => N.planetShort(k);
  const nkRow = db.tblMalayalamNakshatra[T.nakIdx - 1];
  const rm = T.rasimana;
  const dayHrs = (min) => `${Math.trunc(min / 60)}:${min % 60} Hrs (${ng((Math.trunc(min / 60) + (min % 60) / 60) * 2.5)})`;
  const dinMin = Math.round(chart.sun.S * 60) - Math.round(chart.sun.R * 60);
  const dm = (v, pos, neg) => `${Math.trunc(Math.abs(v))} ${v < 0 ? neg : pos} ${Math.round((Math.abs(v) % 1) * 60)}`;
  const tzAbs = Math.abs(place.tz);
  const saka = CT.saka;
  const yoga = db.tblNityayoga[T.yoga - 1];
  const tithiR = byId(db.tblThidhi, T.tithi);
  const kar = byId(db.tblKaranam, T.karana);
  const ml = CT.malayalam;
  const pb = CT.panchabhuta;
  const R = {
    date: [tx("തീയതി", "Date"), `${pad(date.d)} - ${MON[date.m - 1]} - ${date.y}`],
    time: [tx("സമയം", "Time"), N.clock(chart.t)],
    place: [tx("സ്ഥലം", "Place"), place.name],
    tz: [tx("സമയമേഖല", "Time zone"), `${Math.trunc(tzAbs)}:${Math.trunc((tzAbs % 1) * 60 + 1e-6)} ${place.tz < 0 ? "W" : "E"}`],
    lon: [tx("രേഖാംശം", "Longitude"), dm(place.lon, "E", "W")],
    lat: [tx("അക്ഷാംശം", "Latitude"), dm(place.lat, "N", "S")],
    mal: [tx("മലയാളതീയതി", "Malayalam date"), `${ml.day} ${N.malMonth(ml.month)} ${ml.year}`],
    udayadi: [tx("ഉദയാദി", "Udayadi"), ng(CT.udayadi)],
    asthamanadi: CT.asthamanadi != null && [tx("അസ്തമനാദി", "Asthamanadi"), ng(CT.asthamanadi)],
    rasimana: [tx("ഉ.പ. രാശിമാനം", "Sun sign remaining"), nvt(rm.sunRem)],
    rasimanaR: [tx("രാശിമാനം (ര)", "Rasimanam (Sun)"), `${N.rasi(rm.sunSign)} ${nvt(rm.dur[rm.sunSign])}`],
    lagnaGatham: [tx("ലഗ്നഗതം", "Lagna elapsed"), nvt(rm.lagnaGatham)],
    rasimanaL: [tx("രാശിമാനം (ല)", "Rasimanam (Lagna)"), `${N.rasi(rm.lagnaSign)} ${nvt(rm.dur[rm.lagnaSign])}`],
    saka: [tx("ശകവര്‍ഷം", "Saka year"), `${saka.day} ${saka.adhika ? tx("അധിക ", "Adhika ") : ""}${tx(N.SAKA_MONTH[saka.month], N.SAKA_MONTH_EN[saka.month])} ${saka.saka} (${settings.sakaGovt ? "Indian Govt. Saka" : "Traditional Saka"})`],
    samvatsara: [tx("സംവത്സരനാമം", "Samvatsara"), N.SAMVATSARA[saka.samvatsara]],
    wdI: [tx("ആഴ്ച (ഭാരതീയം)", "Weekday (Indian)"), `${N.weekday(T.indianDow)} (${sh([null, "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"][T.indianDow])})`],
    wdW: [tx("ആഴ്ച (പാശ്ചാത്യം)", "Weekday (Western)"), `${N.weekday(T.westernDow)} (${sh([null, "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"][T.westernDow])})`],
    nak: [tx("നക്ഷത്രം", "Star"), `${N.nak(db, T.nakIdx)} ${tx("പാദം", "pada")} - ${T.pada}` + (variant === "prashnam" ? ` (${sh(T.nakLord)})` : "")],
    koor: [tx("കൂറ്", "Moon sign"), N.rasi(T.koor)],
    kunda: [tx("കുന്ദനക്ഷത്രം", "Kunda star"), N.nak(db, T.kundaNak)],
    lagnaNak: [tx("ലഗ്നനക്ഷത്രം", "Lagna star"), N.nak(db, T.lagnaNak)],
    tithi: [tx("തിഥി", "Tithi"), `${tx(tithiR.Malayalam, tithiR.Thidhi)} (${sh(T.tithiLord)})`],
    yoga: [tx("നിത്യയോഗം", "Nithya yoga"), `${tx(yoga.Html, yoga.Name)} (${sh(T.yogaLords[0])}, ${sh(T.yogaLords[1])})`],
    karana: [tx("കരണം", "Karanam"), tx(kar.Html, kar.karanam)],
    dagdha: [tx("ദഗ്ദ്ധരാശി", "Dagdha rasi"), N.DAGDHA[T.dagdhaIdx]],
    njattuvela: [tx("ഞാറ്റുവേല", "Njattuvela"), N.nak(db, T.njattuvela)],
    veli: [tx("വേലി", "Tide"), T.veliHigh ? tx("വേലിയേറ്റം", "High tide") : tx("വേലിയിറക്കം", "Low tide")],
    lagna: [tx("ലഗ്നം", "Lagna"), N.rasi(T.lagnaRasi)],
    drekkana: [tx("ലഗ്നദ്രേക്കാണം", "Lagna drekkana"), tx(`${T.drekkana}ാം ദ്രേക്കാണം`, `Drekkana ${T.drekkana}`)],
    sunrise: [tx("സൂര്യോദയം", "Sunrise"), N.clock(chart.sun.R)],
    sunset: [tx("സൂര്യാസ്‌തമയം", "Sunset"), N.clock(chart.sun.S)],
    dinamana: [tx("ദിനമാനം", "Day length"), dayHrs(dinMin)],
    ratrimana: [tx("രാത്രിമാനം", "Night length"), dayHrs(1440 - dinMin)],
    gulika: [tx("ഗുളികോദയം", "Gulika rise"), N.clock(CT.gulika)],
    ayan: [tx("അയനാംശം", "Ayanamsa"), N.dms(chart.ayanamsa)],
    ayanName: [tx("അയനാംശരീതി", "Ayanamsa system"), AYANAMSA.find((a) => a.v === settings.ayanamsa)?.label],
    kaliG: [tx("ഗതകലിദിനം", "Elapsed Kali days"), CT.kali.gatha],
    kaliT: [tx("തദ്ദിനകലിദിനം", "Kali day"), CT.kali.thaddina],
    kaliY: [tx("കലിവര്‍ഷം", "Kali year"), CT.kali.year],
    tithiG: [tx("തിഥിഗതം", "Tithi elapsed"), ngT(T.tithiGatham)],
    yogaG: [tx("നിത്യയോഗഗതം", "Yoga elapsed"), ngT(T.yogaGatham)],
    karanaG: [tx("കരണഗതം", "Karanam elapsed"), ngT(T.karanaGatham)],
    nakG: [tx("നക്ഷത്രഗതം", "Star elapsed"), ngT(T.nakGatham)],
    devatha: [tx("ദേവത", "Deity"), nkRow.Devatha],
    lord: [tx("അധിപന്‍", "Lord"), nkRow.Lord],
    yoni: [tx("യോനി", "Yoni"), nkRow.Yoni],
    ganam: [tx("ഗണം", "Ganam"), nkRow.Ganam],
    tree: [tx("വൃക്ഷം", "Tree"), nkRow.Vriksham],
    bird: [tx("പക്ഷി", "Bird"), nkRow.Pakshi],
    animal: [tx("മൃഗം", "Animal"), N.MRUGAM[T.nakIdx - 1]],
    bhutam: [tx("ഭൂതം", "Element"), nkRow.Bhootham],
    akshara: [tx("അക്ഷരം", "Syllable"), nkRow.Aksharam],
    mantra: [tx("മന്ത്രം", "Mantram"), nkRow.Manthram],
    kriya: [tx("ചന്ദ്രക്രിയ", "Chandrakriya"), tx(db.tblChandrakriya[T.chandrakriya - 1].Malayalam, db.tblChandrakriya[T.chandrakriya - 1].English)],
    avastha: [tx("ചന്ദ്രാവസ്ഥ", "Chandravastha"), tx(db.tblChandraavastha[T.chandravastha - 1].Malayalam, db.tblChandraavastha[T.chandravastha - 1].English)],
    vela: [tx("ചന്ദ്രവേള", "Chandravela"), tx(db.tblChandravela[T.chandravela - 1].Malayalam, db.tblChandravela[T.chandravela - 1].English)],
    bhuta: [tx("പഞ്ചഭൂതോദയം", "Panchabhutodayam"), tx(
      `${pb.yama} - ആം യാമം. ${N.BHUTA[pb.bhuta][0]} ഭൂതോദയം. ${N.BHUTA[pb.antara][0]} അന്തരം.`,
      `Yama ${pb.yama}. ${N.BHUTA[pb.bhuta][1]} rising, ${N.BHUTA[pb.antara][1]} sub-period.`)],
    angaditya: [tx("അംഗാദിത്യന്‍", "Angadityan"), N.ANGADITYA[T.angaditya][0]],
    angadityaF: N.ANGADITYA[T.angaditya][1] && [tx("അംഗാദിത്യഫലം", "Angaditya result"), N.ANGADITYA[T.angaditya][1]],
    yogi: [tx("യോഗി", "Yogi"), `${db.tblMalayalamNakshatra[T.yogiNak - 1].Lord} (${N.nak(db, T.yogiNak)})`],
    yogiS: [tx("യോഗിസ്ഫുടം", "Yogi sphuta"), N.sphuta(T.yogi)],
    avayogi: [tx("അവയോഗി", "Avayogi"), `${db.tblMalayalamNakshatra[T.avayogiNak - 1].Lord} (${N.nak(db, T.avayogiNak)})`],
    avayogiS: [tx("അവയോഗിസ്ഫുടം", "Avayogi sphuta"), N.sphuta(T.avayogi)],
    sahayogi: [tx("സഹയോഗി", "Sahayogi"), `${N.planet(N_SIGN_LORD[T.sahayogi])} (${N.rasi(T.sahayogi)})`],
    rithu: [tx("ഋതു", "Season"), tx(N.RITHU[T.rithu][0], N.RITHU[T.rithu][1])],
  };
  const common1 = ["date", "time", "place", "tz", "lon", "lat", "mal", "udayadi", "asthamanadi", "rasimana", "rasimanaR", "lagnaGatham", "rasimanaL", "saka", "samvatsara", "wdI", "wdW"];
  const common2 = ["sunrise", "sunset", "dinamana", "ratrimana", "gulika", "ayan", "ayanName", "kaliG", "kaliT", "kaliY", "tithiG", "yogaG", "karanaG",
    "nakG", "devatha", "lord", "yoni", "ganam", "tree", "bird", "animal", "bhutam", "akshara", "mantra", "kriya", "avastha", "vela", "bhuta",
    "angaditya", "angadityaF", "yogi", "yogiS", "avayogi", "avayogiS", "sahayogi", "rithu"];
  const order = variant === "prashnam"
    ? [...common1, "nak", "koor", "kunda", "lagnaNak", "tithi", "yoga", "karana", "dagdha", "njattuvela", "veli", "lagna", "drekkana", ...common2]
    : [...common1, "tithi", "yoga", "karana", "dagdha", "nak", "koor", "njattuvela", "veli", ...common2];
  return h("div.card", band("ജ്യോതിഷസമയം", "Astrological time"), kv(order.map((k) => R[k])));
}
const N_SIGN_LORD = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];

// ---------- Sphutas tab ----------
const NL = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
export const nakCell = (lon) => {
  const n = Math.trunc(((lon % 360) * 6) / 80);
  return `${N.NAK_SHORT_ML[n]} (${N.planetShort(NL[n % 9])})`;
};
export function sphutasTab({ chart }) {
  const P = chart.planets;
  const ps = chart.time.pancha;
  const marks = (k) => (P[k].retro ? tx(" (വ)", " (R)") : "") + (P[k].combust ? tx(" (മൌ)", " (C)") : "");
  const row = (label, lon) => [label, h("span.num", N.sphuta(lon)), nakCell(lon)];
  let ti = P.Moon.lon - P.Sun.lon;
  if (ti < 0) ti += 360;
  let yo = P.Moon.lon + P.Sun.lon;
  if (yo > 360) yo -= 360;
  const rows = [
    row(N.planet("Lagna"), P.Lagna.lon),
    ...["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu"].map((k) => row(N.planet(k) + (k === "Rahu" ? "" : marks(k)), P[k].lon)),
    row(N.planet("Ketu"), P.Ketu.lon),
    row(N.planet("Mandi"), P.Mandi.lon),
    row(tx("കുന്ദം", "Kunda"), ((P.Lagna.lon * 81) / 360 % 1) * 360),
    row(tx("തിഥി", "Tithi"), ti),
    row(tx("നിത്യയോഗം", "Nithya yoga"), yo),
    { section: tx("പഞ്ചസ്ഫുടങ്ങള്‍", "Pancha sphutas") },
    row(tx("ധൂമം", "Dhuma"), ps.dhuma),
    row(tx("വ്യതീപാതം", "Vyatipata"), ps.vyatipata),
    row(tx("പരിധി", "Paridhi"), ps.parivesha),
    row(tx("ഇന്ദ്രധനുസ്", "Indradhanus"), ps.indrachapa),
    row(tx("ഉപകേതു", "Upaketu"), ps.upaketu),
  ];
  return h("div.stack",
    band("ഗ്രഹസ്ഫുടം", "Planet positions"),
    dataTable([tx("സ്ഫുടങ്ങൾ", "Body"), tx("രാ. ഭാ. ക.", "Sign-deg-min"), tx("ന.", "Star")], rows),
    h("p.muted", tx("വ = വക്രം. മൌ = മൌഢ്യം ന. = നക്ഷത്രം", "R = retrograde. C = combust. Sign 0 = Mesha (Aries).")));
}

// ---------- Chart tab ----------
/** extra: {arudha: {lon, rasi, navamsa}, swarna: {rasi, navRasi}|null, bhavabala: bool} */
export function chartsTab({ chart }, ctx, extra = {}) {
  const P = chart.planets;
  const lab = (ks) => ks.map((k) => N.planetShort(k));
  const AR = tx("ആ", "Ar"), SW = tx("സ്വ", "Sw");
  const box = (cells, label, mark) => keralaChart(cells, { title: label, center: h("strong", label), mark });
  const rasiCells = cellsBy(chart, (k) => P[k].rasi).map(lab);
  const navCells = cellsBy(chart, (k) => P[k].navamsa).map(lab);
  const hs = chart.settings.house;
  const bhavaCells = (hs === 0 ? cellsBy(chart, (k) => P[k].rasi) : cellsBy(chart, bhavaChartSign(chart))).map(lab);
  if (extra.arudha) {
    rasiCells[extra.arudha.rasi].push(AR);
    navCells[extra.arudha.navamsa].push(AR);
    if (hs === 0) bhavaCells[extra.arudha.rasi].push(AR);
    else {
      const inR = (x, s, e) => (s <= e ? x >= s && x < e : x >= s || x < e);
      const hb = chart.bhava.find((b) => inR(extra.arudha.lon, b.start, b.end));
      if (hb) bhavaCells[(hb.k + P.Lagna.rasi - 1) % 12].push(AR);
    }
  }
  if (extra.swarna) {
    rasiCells[extra.swarna.rasi].push(SW);
    navCells[extra.swarna.navRasi].push(SW);
  }
  const lagnaMark = new Set([P.Lagna.rasi]);
  const charts = [
    box(rasiCells, tx("രാശി", "Rasi"), lagnaMark),
    box(navCells, tx("നവാംശം", "Navamsa"), new Set([P.Lagna.navamsa])),
    box(bhavaCells, tx("ഭാവം", "Bhava"), lagnaMark),
  ];
  if (extra.bhavabala) charts.push(keralaChart(bhavabala(chart).map((v) => [String(Number.isInteger(v) ? v.toFixed(1) : v)]), { title: tx("ഭാവബലം", "Bhavabala"), center: h("strong", tx("ഭാവബലം", "Bhavabala")) }));
  return h("div.stack",
    band(extra.bhavabala ? "ഗ്രഹനില, നവാംശം, ഭാവം" : "ഗ്രഹനില", extra.bhavabala ? "Rasi, navamsa, bhava" : "Charts"),
    h("div.charts-row", charts),
    h("p.muted", "House System : ", HOUSE.find((x) => x.v === hs)?.label),
    h("p.muted", tx("ല = ലഗ്നം. ര = രവി. ച = ചന്ദ്രന്‍. കു = കുജന്‍ (ചൊവ്വ). ബു = ബുധന്‍. ഗു = ഗുരു. ശു = ശുക്രന്‍. മ = മന്ദന്‍ (ശനി). സ = രാഹു. ശി = കേതു. മാ = മാന്ദി." + (extra.arudha ? " ആ = ആരൂഢം. സ്വ = സ്വർണം." : ""),
      "As = Lagna, Su Mo Ma Me Ju Ve Sa, Ra = Rahu, Ke = Ketu, Md = Mandi." + (extra.arudha ? " Ar = arudha, Sw = gold (swarna)." : "") + " The shaded cell is the lagna.")));
}

// ---------- Guna-dosham tab ----------
export function gunaDoshamTab({ chart }, { db }, birthNak1) {
  const g = gunaDosham(db, chart, birthNak1, labeller(db));
  const row = (r) => [tx(r.ml, r.en), yesNo(r.present, r.good), { td: lines(r.detail), cls: "pr-detail" }];
  return h("div.stack",
    band("ഗുണദോഷം", "Good and bad factors"),
    dataTable(null, [
      { section: tx("ഗുണം", "Good") }, ...g.guna.map(row),
      { section: tx("ദോഷം", "Bad") }, ...g.dosha.map(row),
    ]));
}

export { ORDER, ampm, t };
