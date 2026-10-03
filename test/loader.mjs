// Node resolve hook mirroring the Vite alias in vite.config.js:
// "@private/x.js" -> src/private/x.js (full edition) or src/private-stub/x.js (public edition,
// VITE_EDITION=public, or a checkout without src/private/).
import { existsSync } from "node:fs";

const web = new URL("../", import.meta.url);
const isPublic = process.env.VITE_EDITION === "public" || !existsSync(new URL("src/private/", web));

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@private/")) {
    return next(new URL(`src/${isPublic ? "private-stub" : "private"}/${specifier.slice("@private/".length)}`, web).href, context);
  }
  return next(specifier, context);
}
