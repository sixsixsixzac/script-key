import { supabaseAdmin } from "@/lib/supabase";

export type RateLimitConfig = {
  key: string;
  windowMs: number;
  limit: number;
};

export async function checkRateLimit(cfg: RateLimitConfig): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
    p_key: cfg.key,
    p_window_ms: cfg.windowMs,
    p_limit: cfg.limit,
  });
  if (error) {
    console.error("rate_limit_rpc_error", error);
    return true;
  }
  return data === true;
}

export async function enforceRateLimits(
  configs: RateLimitConfig[]
): Promise<{ ok: true } | { ok: false; key: string }> {
  const results = await Promise.all(
    configs.map(async (c) => ({ key: c.key, ok: await checkRateLimit(c) }))
  );
  const failed = results.find((r) => !r.ok);
  if (failed) return { ok: false, key: failed.key };
  return { ok: true };
}
