export interface BackendEnv {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  databaseUrl: string;
}

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) throw new Error(`Missing required environment variable: ${name}`);
  return value.trim();
}

export function readBackendEnv(source: NodeJS.ProcessEnv = process.env): BackendEnv {
  const supabaseUrl = required("SUPABASE_URL", source.SUPABASE_URL);
  const parsedUrl = new URL(supabaseUrl);
  if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
    throw new Error("SUPABASE_URL must use HTTPS outside localhost");
  }
  return {
    supabaseUrl: parsedUrl.origin,
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY", source.SUPABASE_SERVICE_ROLE_KEY),
    databaseUrl: required("DATABASE_URL", source.DATABASE_URL),
  };
}
