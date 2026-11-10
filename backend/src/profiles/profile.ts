import type { VerifiedIdentity } from "../auth/supabase.js";

export interface ProfileRecord {
  id: string;
  authUserId: string;
  email: string;
  fullName: string;
  phone: string | null;
  emailVerifiedAt: Date | null;
}

export interface ProfileRepository {
  userProfile: {
    upsert(args: {
      where: { authUserId: string };
      create: {
        authUserId: string;
        email: string;
        fullName: string;
        phone: string | null;
        emailVerifiedAt: Date | null;
      };
      update: {
        email: string;
        fullName: string;
        phone: string | null;
        emailVerifiedAt: Date | null;
      };
    }): Promise<ProfileRecord>;
  };
}

/** First /me call creates or synchronizes the profile; it never creates a business. */
export async function getOrCreateProfile(
  repository: ProfileRepository,
  identity: VerifiedIdentity,
): Promise<ProfileRecord> {
  const email = identity.email.trim().toLowerCase();
  if (!email) throw new Error("EMAIL_REQUIRED");
  const fullName = identity.metadata.fullName?.trim() || email.split("@")[0] || "User";
  return repository.userProfile.upsert({
    where: { authUserId: identity.id },
    create: {
      authUserId: identity.id,
      email,
      fullName,
      phone: identity.metadata.phone,
      emailVerifiedAt: identity.emailVerified ? new Date() : null,
    },
    update: {
      email,
      fullName,
      phone: identity.metadata.phone,
      emailVerifiedAt: identity.emailVerified ? new Date() : null,
    },
  });
}
