import { randomBytes } from "crypto";

export const KEY_TTL_MS = 24 * 60 * 60 * 1000;

export function generateKey() {
  const raw = randomBytes(18).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const padded = (raw + "XXXXXXXXXXXXXXXX").slice(0, 20);
  return `${padded.slice(0, 4)}-${padded.slice(4, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}`;
}

export function generateSessionId() {
  return randomBytes(16).toString("hex");
}

export function isExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}
