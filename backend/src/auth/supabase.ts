import { createClient, type User } from "@supabase/supabase-js";

export interface VerifiedIdentity {
  id: string;
  email: string;
  emailVerified: boolean;
  metadata: {
    fullName: string | null;
    phone: string | null;
  };
}

export class AuthenticationError extends Error {
  readonly code = "UNAUTHENTICATED";
  constructor(message = "A valid bearer access token is required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export function createSupabaseAuthClient(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "edsec-sales-api" } },
  });
}

function toIdentity(user: User): VerifiedIdentity {
  return {
    id: user.id,
    email: user.email ?? "",
    emailVerified: Boolean(user.email_confirmed_at),
    metadata: {
      fullName: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
      phone: typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : null,
    },
  };
}

/** Verifies the bearer token with Supabase Auth; never trusts decoded JWT claims alone. */
export async function verifySupabaseAccessToken(
  authClient: ReturnType<typeof createSupabaseAuthClient>,
  authorization: string | null,
): Promise<VerifiedIdentity> {
  if (!authorization?.startsWith("Bearer ")) throw new AuthenticationError();
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) throw new AuthenticationError();
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) throw new AuthenticationError();
  return toIdentity(data.user);
}
