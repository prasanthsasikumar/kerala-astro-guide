// Route table. Each module exports render(container, params).
import { t } from "./lib/i18n.js";

export const routes = [
  { path: "ask", label: "ask", simple: true, load: () => import("./modules/ask/index.js") },
  { path: "horoscope", label: "horoscope", load: () => import("./modules/horoscope/index.js") },
  { path: "porutham", label: "porutham", load: () => import("./modules/porutham/index.js") },
  { path: "prashnam", label: "prashnam", load: () => import("./modules/prashnam/index.js") },
  { path: "gocharam", label: "gocharam", load: () => import("./modules/gocharam/index.js") },
  { path: "panchanga-shuddhi", label: "panchangaShuddhi", load: () => import("./modules/panchanga-shuddhi/index.js") },
  { path: "divasa-panchangam", label: "divasaPanchangam", load: () => import("./modules/divasa-panchangam/index.js") },
  { path: "date-converter", label: "dateConverter", load: () => import("./modules/date-converter/index.js") },
  { path: "nak-porutham", label: "nakPorutham", load: () => import("./modules/nak-porutham/index.js") },
  { path: "rasi-pramanam", label: "rasiPramanam", load: () => import("./modules/rasi-pramanam/index.js") },
  { path: "saved", label: "saved", load: () => import("./modules/saved.js") },
  { path: "settings", label: "settings", load: () => import("./modules/settings.js") },
  { path: "about", label: "about", load: () => import("./modules/about.js") },
  { path: "privacy", label: "privacy", simple: true, load: () => import("./modules/privacy.js") },
  { path: "admin", label: "admin", simple: true, load: () => import("./modules/admin.js") },
];

const by = (p) => routes.find((r) => r.path === p);
export const navGroups = () => [
  { items: ["ask", "horoscope", "porutham", "prashnam", "gocharam"].map(by) },
  { label: t("muhurtham"), items: ["panchanga-shuddhi", "divasa-panchangam"].map(by) },
  { label: t("tools"), items: ["date-converter", "nak-porutham", "rasi-pramanam", "saved"].map(by) },
  { label: "", items: ["settings", "about"].map(by) },
];
