import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isExpired } from "@/lib/keys";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const ok = await checkRateLimit({
    key: `key-verify:${ip}`,
    windowMs: 60_000,
    limit: 60,
  });
  if (!ok) {
    return NextResponse.json(
      { status: "rate_limited" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const raw: string | undefined = body?.key;
  if (!raw) {
    return NextResponse.json({ status: "not_found" });
  }

  const { data } = await supabaseAdmin
    .from("keys")
    .select("value, expires_at")
    .eq("value", raw.trim().toUpperCase())
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ status: "not_found" });
  }
  if (isExpired(data.expires_at)) {
    return NextResponse.json({ status: "expired" });
  }
  return NextResponse.json({ status: "valid", expiresAt: data.expires_at });
}
