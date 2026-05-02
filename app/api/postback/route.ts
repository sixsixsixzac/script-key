import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getParam(url: URL, ...names: string[]) {
  for (const n of names) {
    const v = url.searchParams.get(n);
    if (v) return v;
  }
  return null;
}

async function handle(req: Request, extra?: Record<string, unknown>) {
  const url = new URL(req.url);
  const params = { ...Object.fromEntries(url.searchParams.entries()), ...(extra ?? {}) };

  const secretExpected = process.env.AD_POSTBACK_SECRET;
  const secret = (params.secret as string) ?? (params.key as string) ?? "";
  if (!secretExpected || secret !== secretExpected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const directSessionId =
    (params.session as string) ??
    (params.subid as string) ??
    (params.sub as string) ??
    (params.s1 as string) ??
    (params.click_id as string) ??
    null;

  if (!directSessionId) {
    return NextResponse.json({ ok: false, error: "missing session" }, { status: 400 });
  }

  const ref =
    (params.ref as string) ??
    (params.click_id as string) ??
    (params.transaction_id as string) ??
    null;

  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("id")
    .eq("id", directSessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ ok: false, error: "session not found" }, { status: 404 });
  }

  const sessionId = session.id;

  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("sessions")
    .update({ ad_completed: true, ad_completed_at: now })
    .eq("id", sessionId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from("ad_events").insert({
    session_id: sessionId,
    ref,
    raw: params,
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    body = await req.json().catch(() => ({}));
  } else if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    body = Object.fromEntries(new URLSearchParams(text));
  }
  return handle(req, body);
}
