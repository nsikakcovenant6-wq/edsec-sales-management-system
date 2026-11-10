import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let browserClient: SupabaseClient | undefined;
/** Browser-only Auth client; project credentials are supplied by the deployment environment. */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") throw new Error("Supabase browser client is only available in the browser");
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  browserClient = createClient(url, anonKey, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } });
  return browserClient;
}
