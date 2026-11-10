import { createSupabaseAuthClient } from "../auth/supabase.js";
import { readBackendEnv } from "../config/env.js";
import {
  PrismaBusinessAccess,
  PrismaBusinessCategoryRepository,
  PrismaBusinessProvisioningRepository,
  PrismaOnboardingRepository,
  PrismaProfileRepository,
  createPrismaClient,
} from "../db/repositories.js";
import { PrismaWorkspaceRepository } from "../db/workspace.js";
import { createV1RouteHandlers } from "./routes.js";

let runtime: ReturnType<typeof createV1RouteHandlers> | undefined;

/** Creates the server-only API handler set. Never import this module into a client component. */
export function getV1RouteHandlers() {
  if (runtime) return runtime;
  const env = readBackendEnv();
  const prisma = createPrismaClient(env.databaseUrl);
  const authClient = createSupabaseAuthClient(env.supabaseUrl, env.supabaseServiceRoleKey);
  const profiles = new PrismaProfileRepository(prisma);
  const access = new PrismaBusinessAccess(prisma);
  runtime = createV1RouteHandlers({
    authClient,
    profiles,
    businesses: new PrismaBusinessProvisioningRepository(prisma),
    categories: (profileId) => new PrismaBusinessCategoryRepository(prisma, profileId),
    onboarding: (profileId) => new PrismaOnboardingRepository(prisma, profileId),
    access,
    categoryCatalog: { listCategories: () => new PrismaWorkspaceRepository(prisma, "").listCategories() },
    importStorage: {
      createSignedUploadUrl: async ({ bucket, objectPath }) => {
        const { data, error } = await authClient.storage.from(bucket).createSignedUploadUrl(objectPath, { upsert: false });
        if (error || !data) throw new Error("IMPORT_UPLOAD_SIGNING_FAILED");
        return { signedUrl: data.signedUrl, token: data.token, path: data.path };
      },
    },
    workspace: (profileId) => new PrismaWorkspaceRepository(prisma, profileId),
  });
  return runtime;
}
