export function getClientIp(req: Request): string {
  const headers = req.headers;
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xri = headers.get("x-real-ip");
  if (xri) return xri.trim();
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
