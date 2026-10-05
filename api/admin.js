// Admin: list saved calls. GET /api/admin?cursor=...&limit=50 (max 200) with header x-admin-key.
import { list, get } from "@vercel/blob";
import { timingSafeEqual } from "node:crypto";
import { json } from "./_lib/session.js";

function okKey(given, want) {
  const a = Buffer.from(String(given || ""));
  const b = Buffer.from(String(want || ""));
  return b.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

const MAX_LIMIT = 200;
const CONCURRENCY = 20;

// Like Promise.all(items.map(fn)) but with at most n in flight; keeps order.
async function mapLimit(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

export async function handle(request, env = process.env) {
  if (!okKey(request.headers.get("x-admin-key"), env.ADMIN_KEY)) return json(401, { error: "unauthorised" });
  const url = new URL(request.url);
  const token = env.BLOB_READ_WRITE_TOKEN;
  const limit = Math.max(1, Math.min(MAX_LIMIT, parseInt(url.searchParams.get("limit"), 10) || 50));
  // ?kind=survey lists study answers instead of calls (same response shape: { calls, cursor })
  const prefix = url.searchParams.get("kind") === "survey" ? "survey/" : "calls/";
  const page = await list({ prefix, limit, cursor: url.searchParams.get("cursor") || undefined, token });
  const blobs = [...page.blobs].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const calls = await mapLimit(blobs, CONCURRENCY, async (bl) => {
    try {
      const r = await get(bl.pathname, { access: "private", token, useCache: false });
      return r?.statusCode === 200 ? JSON.parse(await new Response(r.stream).text()) : null;
    } catch {
      return null;
    }
  });
  return json(200, { calls: calls.filter(Boolean), cursor: page.hasMore ? page.cursor : null });
}

export function GET(request) {
  return handle(request);
}
