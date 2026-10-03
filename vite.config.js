import { defineConfig, loadEnv } from "vite";
import { existsSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

// Two editions from one codebase (see src/lib/edition.js):
//   full   (default when src/private/ exists): local use, includes the private texts and data.
//   public (VITE_EDITION=public, or any checkout without src/private/): calculations only.
// "@private/x.js" resolves to src/private/x.js (full) or src/private-stub/x.js (public).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, "VITE_");
  const hasPrivate = existsSync(path.join(root, "src/private"));
  const edition = (process.env.VITE_EDITION || env.VITE_EDITION) === "public" || !hasPrivate ? "public" : "full";
  const isPublic = edition === "public";
  return {
    server: { host: "127.0.0.1", port: 5180 },
    optimizeDeps: { exclude: ["sweph-wasm"] },
    define: { "import.meta.env.VITE_EDITION": JSON.stringify(edition) },
    resolve: {
      alias: [{ find: /^@private\//, replacement: path.join(root, isPublic ? "src/private-stub" : "src/private") + "/" }],
    },
    plugins: [askApi(loadEnv(mode, root, "")), ...(isPublic ? [publicEdition()] : [])],
  };
});

const APP_NAME = "Kerala Astro Guide";
// public/ files that belong to the full edition only
const FULL_ONLY = ["data", "charticon.png"];

function manifest() {
  const m = JSON.parse(readFileSync(path.join(root, "public/manifest.webmanifest"), "utf8"));
  return JSON.stringify({ ...m, name: APP_NAME, short_name: "Astro Guide" }, null, 2) + "\n";
}

function publicEdition() {
  let outDir;
  return {
    name: "public-edition",
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); },
    transformIndexHtml: (html) => html.replace(/<title>[^<]*<\/title>/, `<title>കേരള അസ്ട്രോ ഗൈഡ് · ${APP_NAME}: talk to an astrologer in Malayalam</title>`),
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || "").split("?")[0];
        if (FULL_ONLY.some((p) => url === `/${p}` || url.startsWith(`/${p}/`))) {
          res.statusCode = 404;
          return res.end("Not part of the public edition");
        }
        if (url === "/manifest.webmanifest") {
          res.setHeader("content-type", "application/manifest+json");
          return res.end(manifest());
        }
        next();
      });
    },
    closeBundle() {
      if (!outDir || !existsSync(outDir)) return;
      for (const p of FULL_ONLY) rmSync(path.join(outDir, p), { recursive: true, force: true });
      writeFileSync(path.join(outDir, "manifest.webmanifest"), manifest());
    },
  };
}

// Dev only: serve the serverless functions in api/ from the Vite server.
function askApi(env) {
  return {
    name: "api-functions",
    configureServer(server) {
      server.middlewares.use("/api", async (req, res, next) => {
        const name = (req.url || "").split("?")[0].replace(/^\//, "");
        if (!/^[a-z-]+$/.test(name) || !existsSync(path.join(root, "api", name + ".js"))) return next();
        const mod = await server.ssrLoadModule(`/api/${name}.js`);
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const request = new Request("http://localhost/api" + req.url, {
          method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
        });
        const response = await mod.handle(request, { ...process.env, ...env });
        res.statusCode = response.status;
        response.headers.forEach((v, k) => res.setHeader(k, v));
        if (!response.body) return res.end();
        const reader = response.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      });
    },
  };
}
