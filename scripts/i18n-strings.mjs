// Lists the English strings used on the simple screens (second argument of tx/bi/biStack, and the
// English side of the label table), so they can be translated into the other Indian languages.
import { readFileSync, writeFileSync } from "node:fs";
const FILES = ["src/main.js", "src/modules/home.js", "src/modules/people.js", "src/modules/person-form.js", "src/modules/more.js",
  "src/modules/horoscope/index.js", "src/modules/ask/index.js", "src/modules/settings.js", "src/modules/privacy.js",
  "src/ui/support.js", "src/modules/horoscope/tabs/charts.js", "src/ui/screen.js", "src/ui/sheet.js", "src/components/place-picker.js", "src/lib/i18n.js"];
const out = new Set();
const lit = String.raw`(?:"((?:[^"\\]|\\.)*)"|\x60((?:[^\x60\\]|\\.)*)\x60)`;
const re = new RegExp(String.raw`\b(?:tx|tf|bi|biStack|question|both|fact)\(\s*${lit}\s*,\s*${lit}`, "g");
for (const f of FILES) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(re)) {
    const en = m[3] ?? m[4];
    if (en && /[A-Za-z]/.test(en)) out.add(en);
  }
  if (f.endsWith("i18n.js")) for (const m of src.matchAll(/\[\s*"[^"]*",\s*"([^"]+)"\s*\]/g)) out.add(m[1]);
  if (f.endsWith("main.js") || f.endsWith("more.js")) for (const m of src.matchAll(/\["[a-z-]+",\s*"[^"]*",\s*"([^"]+)"\]/g)) out.add(m[1]);
}
// strings passed through other helpers (sections, labels)
for (const f of FILES) for (const m of readFileSync(f, "utf8").matchAll(/\["[^"]*[\u0D00-\u0D7F][^"]*",\s*"([^"]*[A-Za-z][^"]*)"/g)) out.add(m[1]);
const list = [...out].sort();
writeFileSync("scripts/i18n-strings.json", JSON.stringify(list, null, 2));
console.log(list.length, "strings;", list.filter((s) => s.includes("${")).length, "with template variables");
