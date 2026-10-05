// Local persistence: settings + saved charts in localStorage, with JSON backup/restore.
const KEY_SETTINGS = "ag.settings";
const KEY_CHARTS = "ag.charts";
const KEY_UI = "ag.ui";

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep in memory only */
  }
}

const listeners = new Set();
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const emit = (what) => listeners.forEach((fn) => fn(what));

// ---- settings (defaults are filled in by engine/settings.js) ----
let settings = read(KEY_SETTINGS, {});
export const getSettings = () => settings;
export function setSettings(patch) {
  settings = { ...settings, ...patch };
  write(KEY_SETTINGS, settings);
  emit("settings");
}
export function initSettings(defaults) {
  settings = { ...defaults, ...settings };
}

// ---- ui prefs ----
let ui = read(KEY_UI, { lang: "en" });
// a shared link can pick the language, e.g. astro.flowsxr.com/ml or ?lang=ml; it is remembered on this device
if (typeof location !== "undefined") {
  const want = new URLSearchParams(location.search).get("lang") || location.pathname.match(/^\/([a-z]{2})\/?$/)?.[1];
  if (["ml", "en", "hi", "ta", "te", "kn"].includes(want) && ui.lang !== want) {
    ui = { ...ui, lang: want };
    write(KEY_UI, ui);
  }
}
export const getUI = () => ui;
export function setUI(patch) {
  ui = { ...ui, ...patch };
  write(KEY_UI, ui);
  emit("ui");
}

// ---- saved charts ----
// chart = { id, kind: "birth", name, gender, date: "YYYY-MM-DD", time: "HH:MM", place: {name, lat, lon, tz}, note }
export const listCharts = () => read(KEY_CHARTS, []);
export function saveChart(chart) {
  const all = listCharts();
  const c = { ...chart, id: chart.id || crypto.randomUUID(), savedAt: new Date().toISOString() };
  const i = all.findIndex((x) => x.id === c.id);
  if (i >= 0) all[i] = c;
  else all.unshift(c);
  write(KEY_CHARTS, all);
  emit("charts");
  return c;
}
export function deleteChart(id) {
  write(KEY_CHARTS, listCharts().filter((x) => x.id !== id));
  emit("charts");
}

export function exportBackup() {
  return JSON.stringify({ app: "astro-guide-web", version: 1, settings, charts: listCharts() }, null, 2);
}
export function importBackup(text) {
  const data = JSON.parse(text);
  if (data.app !== "astro-guide-web") throw new Error("Not an Astro Guide backup file");
  if (data.settings) setSettings(data.settings);
  if (Array.isArray(data.charts)) {
    const byId = new Map(listCharts().map((c) => [c.id, c]));
    data.charts.forEach((c) => byId.set(c.id, c));
    write(KEY_CHARTS, [...byId.values()]);
    emit("charts");
  }
}
