// Bottom sheet (modal dialog) for enlarged charts and pickers. The page underneath keeps running.
import { h } from "../lib/dom.js";
import { tx } from "../lib/i18n.js";

export function openSheet(title, body, { extraHead = null } = {}) {
  const close = h("button.btn-primary-xl.sheet-close", { type: "button" }, tx("അടയ്ക്കുക", "Close"));
  const dlg = h("dialog.ask-sheet", { "aria-label": typeof title === "string" ? title : "" },
    h("div.sheet-head", h("strong", title), extraHead),
    h("div.sheet-body", body),
    h("div.sheet-foot", close));
  close.addEventListener("click", () => dlg.close());
  dlg.addEventListener("close", () => dlg.remove());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}
