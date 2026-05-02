import { createHmac, timingSafeEqual } from "crypto";

export const TOKEN_TTL_MS = 10 * 60 * 1000;

function getSecret() {
  const s = process.env.AD_POSTBACK_SECRET;
  if (!s) throw new Error("Missing AD_POSTBACK_SECRET");
  return s;
}

export function signAd(sessionId: string, exp: number) {
  const payload = `${sessionId}.${exp}`;
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function verifyAd(sessionId: string, exp: number, sig: string) {
  if (!sessionId || !exp || !sig) return false;
  if (exp < Date.now()) return false;
  const expected = signAd(sessionId, exp);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function buildLinkvertiseUrl(targetUrl: string) {
  const userId = process.env.LINKVERTISE_USER_ID;
  if (!userId) throw new Error("Missing LINKVERTISE_USER_ID");
  const encoded = Buffer.from(targetUrl).toString("base64");
  return `https://link-to.net/${userId}/${Math.floor(Math.random() * 900000) + 100000}/dynamic?r=${encoded}`;
}
