// Small encrypted tickets (AES-256-GCM) so the browser cannot read which blind-test reading is real.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const key = (secret) => createHash("sha256").update("blindtest:" + (secret || "dev")).digest();

export function seal(obj, secret) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(secret), iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), data]).toString("base64url");
}

export function unseal(token, secret) {
  try {
    const buf = Buffer.from(String(token), "base64url");
    const d = createDecipheriv("aes-256-gcm", key(secret), buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8"));
  } catch {
    return null;
  }
}
