import { h } from "../lib/dom.js";
import { t } from "../lib/i18n.js";

export const make = (label) => ({
  render(el) {
    el.append(h("div.page-head", h("h1", t(label))), h("div.empty", t("comingSoon")));
  },
});
