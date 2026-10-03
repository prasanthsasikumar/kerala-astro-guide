// Verifies the public edition: node scripts/check-public.mjs
//  1. builds the public edition into dist/
//  2. fails if dist/ contains any sample of the full edition's interpretive texts, has a data/
//     folder, or references a /data/ path
//  3. lists the files a fresh `git init` of web/ would track (honouring .gitignore) and fails if any
//     of them contains a text sample or a provenance marker
// Text samples come from the full-edition files when present (src/private/, public/data/); in a
// public checkout those checks are skipped with a notice.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, mkdtempSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (f) => path.relative(web, f);
const problems = [];
const TEXT_EXT = /\.(m?js|cjs|json|html|css|md|txt|sh|webmanifest|svg|xml|ya?ml)$|(^|\/)(LICENSE|\.gitignore)$/i;

// provenance markers, assembled so this file does not match itself
const MARKERS = [["Mee", "val"], ["ja", "dx"], ["decom", "pil"], ["_un", "packed"]].map((p) => p.join(""));
// the one allowed mention: the independence note
const ALLOWED = {};

// ---------- 1. build ----------
console.log("building the public edition ...");
execFileSync("npx", ["vite", "build", "--logLevel", "warn"], { cwd: web, stdio: "inherit", env: { ...process.env, VITE_EDITION: "public" } });

// ---------- text samples ----------
async function samples() {
  if (!existsSync(path.join(web, "src/private/texts.js")) || !existsSync(path.join(web, "public/data/astro.json"))) return null;
  const strings = [];
  const walk = (v) => {
    if (typeof v === "string") strings.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  for (const f of ["texts.js", "phalam-texts.js", "gochara-texts.js"]) walk(await import(pathToFileURL(path.join(web, "src/private", f)).href));
  const astro = JSON.parse(readFileSync(path.join(web, "public/data/astro.json"), "utf8"));
  const yogam = JSON.parse(readFileSync(path.join(web, "public/data/yogam.json"), "utf8"));
  const PROSE = /^(Male|Female|female|Phalam|phalam|result|description|pariharam|Devan|Devatha)$|-(Male|Female)$/;
  for (const db of [astro, yogam]) for (const rows of Object.values(db)) for (const r of rows) {
    for (const [k, v] of Object.entries(r)) if (PROSE.test(k) && typeof v === "string") strings.push(v);
  }
  // sentences of 25+ characters, without markup
  const sentences = [...new Set(strings.flatMap((s) => s.replace(/<[^>]+>/g, " ").split(/[.!?]\s|<br\/?>|\n/))
    .map((s) => s.trim()).filter((s) => s.length >= 25 && /[ഀ-ൿ]/.test(s)))];
  // a deterministic spread of ~30 sentences, each cut to a 24-character core
  const step = Math.max(1, Math.floor(sentences.length / 30));
  const picked = sentences.filter((_, i) => i % step === 0).slice(0, 30);
  // plus the English glosses of the porutham verdicts
  const { PORUTHAM } = await import(pathToFileURL(path.join(web, "src/private/texts.js")).href);
  picked.push(...Object.values(PORUTHAM.FINAL_EN).map((s) => s.slice(0, 60)));
  return picked.map((s) => (s.length > 40 ? s.slice(8, 32) : s));
}
const SAMPLES = await samples();
if (SAMPLES) console.log(`text samples: ${SAMPLES.length}`);
else console.log("notice: full-edition files not present, text-sample checks skipped");

const forms = (s) => [s, JSON.stringify(s).slice(1, -1), s.replace(/[^\x00-\x7f]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))];
const hasSample = (text) => SAMPLES?.find((s) => forms(s).some((f) => text.includes(f)));

function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const f = path.join(dir, n);
    return statSync(f).isDirectory() ? files(f) : [f];
  });
}

// ---------- 2. dist ----------
const dist = path.join(web, "dist");
if (existsSync(path.join(dist, "data"))) problems.push("dist/data/ exists");
for (const f of files(dist)) {
  if (!TEXT_EXT.test(f)) continue;
  const text = readFileSync(f, "utf8");
  const s = hasSample(text);
  if (s) problems.push(`${rel(f)}: contains text sample "${s}"`);
  if (/["'`(]\/data\/|\bdata\/(astro|yogam|places)\.json/.test(text)) problems.push(`${rel(f)}: references a /data/ path`);
}

// ---------- 3. would-be-tracked files ----------
const tmp = mkdtempSync(path.join(tmpdir(), "kag-check-"));
let tracked = [];
try {
  cpSync(web, tmp, { recursive: true, filter: (src) => !/(^|\/)(node_modules|dist|dist-[^/]*|\.git)$/.test(path.relative(web, src)) });
  execFileSync("git", ["init", "-q"], { cwd: tmp });
  tracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: tmp, encoding: "utf8" }).split("\n").filter(Boolean);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`would-be-tracked files: ${tracked.length}`);
for (const f of tracked) {
  if (/^(src\/private|test\/private|public\/data)\//.test(f)) problems.push(`${f}: private path would be tracked`);
  if (!TEXT_EXT.test(f)) continue;
  let text = readFileSync(path.join(web, f), "utf8");
  for (const a of ALLOWED[f] || []) text = text.replaceAll(a, "");
  const s = hasSample(text);
  if (s) problems.push(`${f}: contains text sample "${s}"`);
  for (const m of MARKERS) if (text.toLowerCase().includes(m.toLowerCase())) problems.push(`${f}: contains "${m}"`);
}

if (problems.length) {
  console.error(`\ncheck-public FAILED (${problems.length}):`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log("check-public passed");
