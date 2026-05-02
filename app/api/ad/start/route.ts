import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { buildLinkvertiseUrl, signAd, TOKEN_TTL_MS } from "@/lib/linkvertise";
import { enforceRateLimits } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sessionId: string | undefined = body?.sessionId;

  if (!sessionId) {
    return NextResponse.json({ error: "missing sessionId" }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rl = await enforceRateLimits([
    { key: `ad-start:ip:${ip}`, windowMs: 60 * 60_000, limit: 30 },
    { key: `ad-start:s:${sessionId}`, windowMs: 60 * 60_000, limit: 20 },
  ]);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many ad requests. Please try again later." },
      { status: 429 }
    );
  }

  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const exp = Date.now() + TOKEN_TTL_MS;
  const sig = signAd(sessionId, exp);

  const callback = `${origin}/api/ad/complete?session=${encodeURIComponent(
    sessionId
  )}&exp=${exp}&sig=${sig}`;

  try {
    const url = buildLinkvertiseUrl(callback);
    return NextResponse.json({ url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "failed to build url";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
