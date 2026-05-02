export function buildLootlabsUrl(sessionId: string): string {
  const base = process.env.LOOTLABS_LOCKER_URL;
  if (!base) throw new Error("Missing LOOTLABS_LOCKER_URL");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}puid=${encodeURIComponent(sessionId)}`;
}
