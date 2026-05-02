import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}
if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type SessionRow = {
  id: string;
  ad_completed: boolean;
  ad_completed_at: string | null;
  created_at: string;
};

export type KeyRow = {
  id: string;
  value: string;
  session_id: string;
  created_at: string;
  expires_at: string;
};
