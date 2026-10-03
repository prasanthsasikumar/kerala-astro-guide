// Page 0: Time (സമയം)
import { h, kv } from "../../../lib/dom.js";
import { tx } from "../../../lib/i18n.js";
import * as N from "../../../engine/names.js";
import { dasa, dayNum } from "../../../engine/core.js";
import { period } from "../../../engine/charts.js";
import { AYANAMSA } from "../../../engine/settings.js";

const pad = (n) => String(n).padStart(2, "0");
const ng = (x) => N.nazhikaText({ n: Math.trunc(x), v: Math.trunc((x % 1) * 60) });

export function render(chart, { db }) {
  const T = chart.time;
  const nk = db.tblMalayalamNakshatra[T.nakIdx - 1];
  const sh = (k) => N.planetShort(k);
  const { input, place, settings } = chart;
  const [hh, mi] = input.time.split(":").map(Number);
  const tzAbs = Math.abs(place.tz);
  const dm = (v, pos, neg) => `${Math.trunc(Math.abs(v))} ${v < 0 ? neg : pos} ${Math.round((Math.abs(v) % 1) * 60)}`;
  const ds = dasa(db, chart, chart.planets.Moon.lon);
  const today = Math.floor(Date.now() / 864e5);
  const age = period(dayNum(chart.date.y, chart.date.m, chart.date.d), today);
  const saka = T.saka;
  const rm = T.rasimana;
  const fmtD = (x) => `${Math.trunc(x)}-${Math.trunc((x % 1) * 60)}-${Math.trunc((((x % 1) * 60) % 1) * 60)}`;
  const dayHrs = (min) => `${Math.trunc(min / 60)}:${pad(min % 60)} Hrs (${ng((min / 60) * 2.5)})`;
  const rithuSuffix = settings.rithuSayana ? tx(" (സായന പ്രകാരം)", " (sayana)") : tx(" (നിരയന പ്രകാരം)", " (nirayana)");
  const yoga = db.tblNityayoga[T.yoga - 1];
  const nakName = (i1) => N.nak(db, i1);
  const yogiNak = (lon) => Math.trunc((lon * 6) / 80) + 1;

  const rows = [
    [tx("പേര്", "Name"), input.name || "—"],
    [tx("ലിംഗം", "Gender"), input.gender === "Female" ? tx("സ്ത്രീ", "Female") : tx("പുരുഷന്‍", "Male")],
    [tx("തീയതി", "Date"), input.date.split("-").reverse().join("-")],
    [tx("സമയം", "Time"), N.clock(hh + mi / 60)],
    [tx("സ്ഥലം", "Place"), place.name],
    [tx("സമയമേഖല", "Time zone"), `${Math.trunc(tzAbs)}:${pad(Math.trunc((tzAbs % 1) * 60 + 1e-6))} ${place.tz < 0 ? "W" : "E"}`],
    [tx("രേഖാംശം", "Longitude"), dm(place.lon, "E", "W")],
    [tx("അക്ഷാംശം", "Latitude"), dm(place.lat, "N", "S")],
    [tx("മലയാളതീയതി", "Malayalam date"), `${T.malayalam.day} ${N.malMonth(T.malayalam.month)} ${T.malayalam.year}`],
    [tx("ഉദയാദി", "Udayadi"), ng(T.udayadi)],
    T.asthamanadi != null && [tx("അസ്തമനാദി", "Asthamanadi"), ng(T.asthamanadi)],
    [tx("ഉ.പ. രാശിമാനം", "Sun sign remaining"), fmtD(rm.sunRem)],
    [tx("രാശിമാനം (ര)", "Rasimanam (Sun)"), `${N.rasi(rm.sunSign)} ${fmtD(rm.dur[rm.sunSign])}`],
    [tx("ലഗ്നഗതം", "Lagna elapsed"), fmtD(rm.lagnaGatham)],
    [tx("രാശിമാനം (ല)", "Rasimanam (Lagna)"), `${N.rasi(rm.lagnaSign)} ${fmtD(rm.dur[rm.lagnaSign])}`],
    [tx("ശകവര്‍ഷം", "Saka year"), `${saka.day} ${saka.adhika ? tx("അധിക ", "Adhika ") : ""}${tx(N.SAKA_MONTH[saka.month], N.SAKA_MONTH_EN[saka.month])} ${saka.saka} (${settings.sakaGovt ? "Indian Govt. Saka" : "Traditional Saka"})`],
    [tx("സംവത്സരനാമം", "Samvatsara"), N.SAMVATSARA[saka.samvatsara]],
    [tx("ആഴ്ച (ഭാരതീയം)", "Weekday (Indian)"), `${N.weekday(T.indianDow)} (${sh(T.weekdayLord)})`],
    [tx("ആഴ്ച (പാശ്ചാത്യം)", "Weekday (Western)"), `${N.weekday(T.westernDow)} (${sh([null, "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"][T.westernDow])})`],
    [tx("ജന്മനക്ഷത്രം", "Birth star"), `${nakName(T.nakIdx)} ${tx("പാദം", "pada")} - ${T.pada} (${sh(T.nakLord)})`],
    [tx("കൂറ്", "Moon sign"), N.rasi(T.koor - 1)],
    [tx("കുന്ദനക്ഷത്രം", "Kunda star"), nakName(T.kundaNak)],
    [tx("തിഥി", "Tithi"), `${tx(db.tblThidhi[T.tithi - 1].Malayalam, db.tblThidhi[T.tithi - 1].Thidhi)} (${sh(T.tithiLord)})`],
    [tx("നിത്യയോഗം", "Nithya yoga"), `${tx(yoga.Html, yoga.Name)} (${sh(lordOfNak(T.yoga))},${sh(lordOfNak(T.yoga2))})`],
    [tx("കരണം", "Karanam"), tx(db.tblKaranam[T.karana - 1].Html, db.tblKaranam[T.karana - 1].karanam)],
    [tx("ദഗ്ദ്ധരാശി", "Dagdha rasi"), N.DAGDHA[T.dagdhaIdx]],
    [tx("ഞാറ്റുവേല", "Njattuvela"), nakName(T.njattuvela)],
    [tx("വേലി", "Tide"), T.veliHigh ? tx("വേലിയേറ്റം", "High tide") : tx("വേലിയിറക്കം", "Low tide")],
    [tx("ലഗ്നം", "Lagna"), N.rasi(T.lagnaRasi)],
    [tx("ലഗ്നദ്രേക്കാണം", "Lagna drekkana"), T.drekkana],
    [tx("സൂര്യോദയം", "Sunrise"), N.clock(chart.sun.R)],
    [tx("സൂര്യാസ്‌തമയം", "Sunset"), N.clock(chart.sun.S)],
    [tx("ദിനമാനം", "Day length"), dayHrs(T.dinamanaMin)],
    [tx("രാത്രിമാനം", "Night length"), dayHrs(T.ratrimanaMin)],
    [tx("ഗുളികോദയം", "Gulika rise"), N.clock(T.gulika)],
    [tx("അയനാംശം", "Ayanamsa"), N.dms(chart.ayanamsa)],
    [tx("അയനാംശരീതി", "Ayanamsa system"), AYANAMSA.find((a) => a.v === settings.ayanamsa)?.label],
    [tx("ഗതകലിദിനം", "Elapsed Kali days"), T.kali.gatha],
    [tx("തദ്ദിനകലിദിനം", "Kali day"), T.kali.thaddina],
    [tx("കലിവര്‍ഷം", "Kali year"), T.kali.year],
    [tx("തിഥിഗതം", "Tithi elapsed"), N.nazhikaText(T.tithiGatham)],
    [tx("നിത്യയോഗഗതം", "Yoga elapsed"), N.nazhikaText(T.yogaGatham)],
    [tx("കരണഗതം", "Karanam elapsed"), N.nazhikaText(T.karanaGatham)],
    [tx("നക്ഷത്രഗതം", "Star elapsed"), N.nazhikaText(T.nakGatham)],
    [tx("ദേവത", "Deity"), nk.Devatha],
    [tx("അധിപന്‍", "Lord"), nk.Lord],
    [tx("യോനി", "Yoni"), nk.Yoni],
    [tx("ഗണം", "Ganam"), nk.Ganam],
    [tx("വൃക്ഷം", "Tree"), nk.Vriksham],
    [tx("പക്ഷി", "Bird"), nk.Pakshi],
    [tx("മൃഗം", "Animal"), N.MRUGAM[T.nakIdx - 1]],
    [tx("ഭൂതം", "Element"), nk.Bhootham],
    [tx("അക്ഷരം", "Syllable"), nk.Aksharam],
    [tx("മന്ത്രം", "Mantram"), nk.Manthram],
    [tx("ചന്ദ്രക്രിയ", "Chandrakriya"), tx(db.tblChandrakriya[T.chandrakriya - 1].Malayalam, db.tblChandrakriya[T.chandrakriya - 1].English)],
    [tx("ചന്ദ്രാവസ്ഥ", "Chandravastha"), tx(db.tblChandraavastha[T.chandravastha - 1].Malayalam, db.tblChandraavastha[T.chandravastha - 1].English)],
    [tx("ചന്ദ്രവേള", "Chandravela"), tx(db.tblChandravela[T.chandravela - 1].Malayalam, db.tblChandravela[T.chandravela - 1].English)],
    [tx("പഞ്ചഭൂതോദയം", "Panchabhutodayam"), tx(
      `${T.panchabhuta.yama} - ആം യാമം. ${N.BHUTA[T.panchabhuta.bhuta][0]} ഭൂതോദയം. ${N.BHUTA[T.panchabhuta.antara][0]} അന്തരം.`,
      `Yama ${T.panchabhuta.yama}. ${N.BHUTA[T.panchabhuta.bhuta][1]} rising, ${N.BHUTA[T.panchabhuta.antara][1]} sub-period.`)],
    [tx("അംഗാദിത്യന്‍", "Angadityan"), N.ANGADITYA[T.angaditya][0]],
    N.ANGADITYA[T.angaditya][1] && [tx("അംഗാദിത്യഫലം", "Angaditya result"), N.ANGADITYA[T.angaditya][1]],
    [tx("യോഗി", "Yogi"), `${db.tblMalayalamNakshatra[yogiNak(T.yogi) - 1].Lord} (${nakName(yogiNak(T.yogi))})`],
    [tx("യോഗിസ്ഫുടം", "Yogi sphuta"), N.sphuta(T.yogi)],
    [tx("അവയോഗി", "Avayogi"), `${db.tblMalayalamNakshatra[yogiNak(T.avayogi) - 1].Lord} (${nakName(yogiNak(T.avayogi))})`],
    [tx("അവയോഗിസ്ഫുടം", "Avayogi sphuta"), N.sphuta(T.avayogi)],
    [tx("സഹയോഗി", "Sahayogi"), `${N.planet(T.sahayogi)} (${N.rasi(Math.trunc(T.yogi / 30))})`],
    [tx("ഋതു", "Season"), tx(N.RITHU[T.rithu][0], N.RITHU[T.rithu][1]) + rithuSuffix],
    [tx("അയനം", "Ayana"), (T.uttarayana ? tx("ഉത്തരായനം", "Uttarayana") : tx("ദക്ഷിണായനം", "Dakshinayana")) + rithuSuffix],
    [tx("ജന്മശിഷ്ടം", "Dasa balance"), `${ds.balance.years} ${tx("വ", "y")} ${ds.balance.months} ${tx("മാ", "m")} ${ds.balance.days} ${tx("ദി", "d")} ${tx(ds.balance.lord.ml, ds.balance.lord.lord + " dasa")}`],
    [tx("വയസ്സ്", "Age"), `${age.y} ${tx("വ", "y")} ${age.m} ${tx("മാ", "m")} ${age.d} ${tx("ദി", "d")}`],
  ];
  return h("div.card", h("h2", { style: { marginBottom: "var(--space-md)" } }, tx("ജ്യോതിഷസമയം", "Astrological time")), kv(rows));
}

// nithya yoga lords follow the nakshatra-lord cycle
const NL = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
function lordOfNak(i1) {
  return NL[(i1 - 1) % 9];
}
