// r1 · Home: greeting → 4 task cards → people → More tools.
import { h } from "../lib/dom.js";
import { tx, lang } from "../lib/i18n.js";
import { getCtx } from "../lib/ctx.js";
import { APP_NAME, APP_NAME_ML } from "../lib/edition.js";
import { people, initialOf, hrefFor, starOf, lastPerson } from "../lib/people.js";
import { bi, biStack } from "../ui/bi.js";
import { langPill } from "../ui/screen.js";

export function render(el) {
  const last = lastPerson();
  const taskHref = (target) => (last ? hrefFor(last, target) : `#/person?for=${target}`);
  const tasks = [
    ["ജാ", "ജാതകം", "Horoscope", last ? hrefFor(last, "horoscope") : "#/person?for=horoscope"],
    ["പൊ", "വിവാഹപൊരുത്തം", "Marriage match", "#/porutham"],
    ["ഇ", "ഇന്ന്", "Today's panchangam", "#/divasa-panchangam"],
    ["ചോ", "ജ്യോതിഷിയോട് ചോദിക്കാം", "Talk to astrologer", taskHref("ask")],
  ];
  const chips = h("div.chips");
  const list = people();
  const chip = (p, star) => h("a.chip", { href: hrefFor(p, "horoscope") },
    h("span.avatar", initialOf(p.name)),
    h("span.bi-stack", h("strong", p.name || "—"), h("span.bi-gloss", star || "")));
  chips.append(...list.map((p) => chip(p, "")), h("a.chip-add", { href: "#/person?for=horoscope" }, "+ ", tx("പുതിയ ആൾ", "New person")));
  // fill in birth stars once the engine is ready
  if (list.length) {
    getCtx().then((ctx) => {
      chips.replaceChildren(...list.map((p) => {
        const s = starOf(ctx, p);
        return chip(p, s ? ctx.db.tblMalayalamNakshatra[s - 1].Name : "");
      }), chips.lastElementChild);
    });
  }

  el.append(
    h("header.screen-head.home-head",
      h("div.brand.home-brand", h("img.brand-logo", { src: "/logo-mark.png", alt: "" }), h("span.brand-mark", lang() === "en" ? APP_NAME : APP_NAME_ML)),
      langPill()),
    h("div.home-greet",
      h("h1.display", "നമസ്കാരം"),
      h("p.lead", tx("ഇന്ന് എന്താണ് നോക്കേണ്ടത്?", "What would you like to see today?"))),
    h("div.tasks", tasks.map(([mark, ml, en, href], i) =>
      h("a.task", { href, class: i === 0 ? "is-first" : "" }, h("span.task-mark", mark), biStack(ml, en)))),
    h("section.home-people",
      h("div.section-head", h("h2", bi("ആളുകൾ", "People")), h("a", { href: "#/people" }, bi("എല്ലാം", "All"))),
      chips),
    h("a.row.home-more", { href: "#/more" },
      biStack("കൂടുതൽ ഉപകരണങ്ങൾ", "More tools · Prashnam, Transits, Date converter, Star match"),
      h("span.chev", "›")));
}
