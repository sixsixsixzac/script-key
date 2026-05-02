import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isDevMode } from "@/lib/dev";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isDevMode()) {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const sessionId: string | undefined = body?.sessionId;

  if (!sessionId) {
    return NextResponse.json({ error: "missing sessionId" }, { status: 400 });
  }

  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("sessions")
    .update({ ad_completed: true, ad_completed_at: now })
    .eq("id", sessionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from("ad_events").insert({
    session_id: sessionId,
    ref: "dev-bypass",
    raw: { provider: "dev-bypass" },
  });

  return NextResponse.json({ ok: true });
}
