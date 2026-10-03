// People: everyone saved on this device. Tap to open their horoscope.
import { h } from "../lib/dom.js";
import { tx } from "../lib/i18n.js";
import { getCtx } from "../lib/ctx.js";
import { people, initialOf, hrefFor, starOf } from "../lib/people.js";
import { bi, biStack } from "../ui/bi.js";
import { screenHeader } from "../ui/screen.js";

const fmtDate = (d) => d.split("-").reverse().join("-");

export function render(el) {
  const list = people();
  const rows = h("div.rows");
  const row = (p, star) => h("a.row.row-person", { href: hrefFor(p, "horoscope") },
    h("span.left", h("span.avatar.avatar-lg", initialOf(p.name)),
      h("span.bi-stack", h("strong", p.name || "—"), h("span.bi-gloss", [star, fmtDate(p.date), (p.place?.name || "").split(",")[0]].filter(Boolean).join(" · ")))),
    h("span.chev", "›"));
  rows.append(...list.map((p) => row(p, "")));
  if (list.length) getCtx().then((ctx) => rows.replaceChildren(...list.map((p) => {
    const s = starOf(ctx, p);
    return row(p, s ? ctx.db.tblMalayalamNakshatra[s - 1].Name : "");
  })));
  el.append(
    screenHeader(),
    h("h1.title", bi("ആളുകൾ", "People")),
    h("p.lead", tx("ജനന വിവരങ്ങൾ ഈ ഫോണിൽ സൂക്ഷിച്ചിരിക്കുന്നു.", "Birth details are kept on this phone.")),
    h("div.people-list", list.length ? rows : h("p.muted", tx("ഇതുവരെ ആരെയും ചേർത്തിട്ടില്ല.", "Nobody added yet."))),
    h("div.bottom-bar", h("a.btn-primary-xl", { href: "#/person?for=horoscope" }, "+ ", bi("പുതിയ ആളെ ചേർക്കുക", "Add a person"))),
    h("p.note", h("a", { href: "#/saved" }, bi("ബാക്കപ്പ് · പുനഃസ്ഥാപിക്കുക", "Backup · Restore"))));
}
