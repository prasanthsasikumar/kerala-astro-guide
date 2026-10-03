// Route table. Each module exports render(container, params).
// chrome: "tabs" (phone tab bar), "none" (focused screen: stepped form, results, call), "legacy" (older tool
// screens: a phone Back header is added for them). nav: which sidebar/tab item is highlighted.
export const routes = [
  { path: "home", label: "home", chrome: "tabs", load: () => import("./modules/home.js") },
  { path: "people", label: "people", chrome: "tabs", load: () => import("./modules/people.js") },
  { path: "person", label: "people", chrome: "none", nav: "people", load: () => import("./modules/person-form.js") },
  { path: "more", label: "more", chrome: "tabs", load: () => import("./modules/more.js") },
  { path: "ask", label: "ask", chrome: "none", load: () => import("./modules/ask/index.js") },
  { path: "horoscope", label: "horoscope", chrome: "none", load: () => import("./modules/horoscope/index.js") },
  { path: "porutham", label: "porutham", back: "#/", load: () => import("./modules/porutham/index.js") },
  { path: "prashnam", label: "prashnam", nav: "more", load: () => import("./modules/prashnam/index.js") },
  { path: "gocharam", label: "gocharam", nav: "more", load: () => import("./modules/gocharam/index.js") },
  { path: "panchanga-shuddhi", label: "panchangaShuddhi", nav: "more", load: () => import("./modules/panchanga-shuddhi/index.js") },
  { path: "divasa-panchangam", label: "divasaPanchangam", back: "#/", load: () => import("./modules/divasa-panchangam/index.js") },
  { path: "date-converter", label: "dateConverter", nav: "more", load: () => import("./modules/date-converter/index.js") },
  { path: "nak-porutham", label: "nakPorutham", nav: "more", load: () => import("./modules/nak-porutham/index.js") },
  { path: "rasi-pramanam", label: "rasiPramanam", nav: "more", load: () => import("./modules/rasi-pramanam/index.js") },
  { path: "saved", label: "saved", nav: "people", back: "#/people", load: () => import("./modules/saved.js") },
  { path: "settings", label: "settings", chrome: "tabs", load: () => import("./modules/settings.js") },
  { path: "about", label: "about", nav: "more", load: () => import("./modules/about.js") },
  { path: "privacy", label: "privacy", chrome: "none", load: () => import("./modules/privacy.js") },
  { path: "admin", label: "admin", chrome: "none", load: () => import("./modules/admin.js") },
];
