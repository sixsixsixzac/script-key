import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAd } from "@/lib/linkvertise";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;

  const ip = getClientIp(req);
  const ok = await checkRateLimit({
    key: `ad-complete:${ip}`,
    windowMs: 60_000,
    limit: 20,
  });
  if (!ok) {
    return NextResponse.redirect(`${origin}/?ad=invalid`);
  }

  const sessionId = url.searchParams.get("session") ?? "";
  const expStr = url.searchParams.get("exp") ?? "";
  const sig = url.searchParams.get("sig") ?? "";

  const exp = Number(expStr);

  if (!verifyAd(sessionId, exp, sig)) {
    return NextResponse.redirect(`${origin}/?ad=invalid`);
  }

  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.redirect(`${origin}/?ad=notfound`);
  }

  const now = new Date().toISOString();

  await supabaseAdmin
    .from("sessions")
    .update({ ad_completed: true, ad_completed_at: now })
    .eq("id", sessionId);

  await supabaseAdmin.from("ad_events").insert({
    session_id: sessionId,
    ref: "linkvertise",
    raw: { provider: "linkvertise", exp, ua: req.headers.get("user-agent") },
  });

  return NextResponse.redirect(`${origin}/?ad=ok`);
}
