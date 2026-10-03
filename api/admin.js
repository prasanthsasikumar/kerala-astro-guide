// Admin: list saved calls. GET /api/admin?cursor=... with header x-admin-key.
import { list, get } from "@vercel/blob";
import { timingSafeEqual } from "node:crypto";
import { json } from "./_lib/session.js";

function okKey(given, want) {
  const a = Buffer.from(String(given || ""));
  const b = Buffer.from(String(want || ""));
  return b.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export async function handle(request, env = process.env) {
  if (!okKey(request.headers.get("x-admin-key"), env.ADMIN_KEY)) return json(401, { error: "unauthorised" });
  const url = new URL(request.url);
  const token = env.BLOB_READ_WRITE_TOKEN;
  const page = await list({ prefix: "calls/", limit: 50, cursor: url.searchParams.get("cursor") || undefined, token });
  const blobs = [...page.blobs].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const calls = await Promise.all(blobs.map(async (bl) => {
    try {
      const r = await get(bl.pathname, { access: "private", token, useCache: false });
      return r?.statusCode === 200 ? JSON.parse(await new Response(r.stream).text()) : null;
    } catch {
      return null;
    }
  }));
  return json(200, { calls: calls.filter(Boolean), cursor: page.hasMore ? page.cursor : null });
}

export function GET(request) {
  return handle(request);
}
