// Signed call-session ids: only sessions issued with a call token can write a call log.
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export function newSession(secret) {
  const id = new Date().toISOString().slice(0, 10) + "_" + randomUUID();
  return { id, sig: sign(id, secret) };
}
export function sign(id, secret) {
  return createHmac("sha256", secret || "dev").update(id).digest("base64url");
}
export function verify(id, sig, secret) {
  if (typeof id !== "string" || typeof sig !== "string" || !/^\d{4}-\d{2}-\d{2}_[0-9a-f-]{36}$/.test(id)) return false;
  const a = Buffer.from(sign(id, secret));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
