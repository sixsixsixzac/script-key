import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateSessionId, isExpired } from "@/lib/keys";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const ok = await checkRateLimit({
    key: `session:${ip}`,
    windowMs: 60_000,
    limit: 10,
  });
  if (!ok) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  const url = new URL(req.url);
  const incoming = url.searchParams.get("id");
  const valid =
    incoming && incoming !== "undefined" && incoming !== "null"
      ? incoming
      : null;

  let sessionId = valid ?? "";
  let row = null as null | {
    id: string;
    ad_completed: boolean;
    ad_completed_at: string | null;
  };

  if (sessionId) {
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select("id, ad_completed, ad_completed_at")
      .eq("id", sessionId)
      .maybeSingle();
    if (error) {
      console.error("[session] select error:", error);
      return NextResponse.json(
        { error: `select sessions failed: ${error.message}` },
        { status: 500 }
      );
    }
    row = data;
  }

  if (!row) {
    sessionId = generateSessionId();
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .insert({ id: sessionId })
      .select("id, ad_completed, ad_completed_at")
      .single();
    if (error) {
      console.error("[session] insert error:", error);
      const hint = error.message.includes("relation")
        ? " — please run supabase/schema.sql in the SQL editor first"
        : "";
      return NextResponse.json(
        { error: `insert sessions failed: ${error.message}${hint}` },
        { status: 500 }
      );
    }
    row = data;
  }

  const { data: keyRow } = await supabaseAdmin
    .from("keys")
    .select("value, expires_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeKey =
    keyRow && !isExpired(keyRow.expires_at)
      ? { value: keyRow.value, expiresAt: keyRow.expires_at }
      : null;

  return NextResponse.json({
    sessionId,
    adCompleted: !!row.ad_completed,
    key: activeKey,
  });
}
