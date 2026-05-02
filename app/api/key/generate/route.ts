import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateKey, isExpired, KEY_TTL_MS } from "@/lib/keys";
import { enforceRateLimits } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { isDevMode } from "@/lib/dev";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIN_AD_COMPLETION_MS = 5_000;

function isAllowedOrigin(req: Request): boolean {
  const allowed = process.env.NEXT_PUBLIC_SITE_URL;
  if (!allowed) return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(allowed).origin;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const sessionId: string | undefined = body?.sessionId;

  if (!sessionId) {
    return NextResponse.json({ error: "missing sessionId" }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rl = await enforceRateLimits([
    { key: `key-gen:ip:${ip}`, windowMs: 60 * 60_000, limit: 5 },
    { key: `key-gen:s:${sessionId}`, windowMs: 60 * 60_000, limit: 3 },
  ]);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many key requests. Please try again later." },
      { status: 429 }
    );
  }

  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("id, ad_completed, ad_completed_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  if (!session.ad_completed) {
    return NextResponse.json(
      { error: "Ad not completed yet" },
      { status: 403 }
    );
  }

  if (session.ad_completed_at && !isDevMode()) {
    const elapsed = Date.now() - new Date(session.ad_completed_at).getTime();
    if (elapsed < MIN_AD_COMPLETION_MS) {
      return NextResponse.json(
        { error: "Suspicious timing. Please try again." },
        { status: 403 }
      );
    }
  }

  const { data: existing } = await supabaseAdmin
    .from("keys")
    .select("value, expires_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && !isExpired(existing.expires_at)) {
    return NextResponse.json({
      value: existing.value,
      expiresAt: existing.expires_at,
      reused: true,
    });
  }

  const value = generateKey();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + KEY_TTL_MS).toISOString();

  const { data, error } = await supabaseAdmin
    .from("keys")
    .insert({
      value,
      session_id: sessionId,
      expires_at: expiresAt,
    })
    .select("value, expires_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin
    .from("sessions")
    .update({ ad_completed: false, ad_completed_at: null })
    .eq("id", sessionId);

  return NextResponse.json({
    value: data.value,
    expiresAt: data.expires_at,
    reused: false,
  });
}
