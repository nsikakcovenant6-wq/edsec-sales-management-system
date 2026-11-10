import { createBusiness, type BusinessProvisioningRepository } from "../businesses/create-business.js";
import { replaceBusinessCategories, type BusinessCategoryRepository } from "../businesses/categories.js";
import { verifySupabaseAccessToken, type VerifiedIdentity } from "../auth/supabase.js";
import { getOrCreateProfile, type ProfileRepository } from "../profiles/profile.js";
import { patchOnboardingProgress, type OnboardingPatch, type OnboardingProgress, type OnboardingRepository } from "../onboarding/progress.js";
import { ApiError } from "./errors.js";
import { PRODUCT_IMPORT_UPLOAD_POLICY, validateSignedImportUploadRequest } from "../products/import-storage.js";
import { ImportValidationError } from "../products/import-validation.js";
import type { BusinessProfilePatch, BranchWrite, CategoryRecord, MembershipSummary } from "../db/workspace.js";

export interface BusinessAccess {
  listMemberships(userId: string): Promise<MembershipSummary[]>;
  assertMember(input: { userId: string; businessId: string }): Promise<void>;
  assertPermission(input: { userId: string; businessId: string; permission: string }): Promise<void>;
  assertFeature(input: { userId: string; businessId: string; feature: string }): Promise<void>;
}
export interface RouteDependencies {
  authClient: Parameters<typeof verifySupabaseAccessToken>[0];
  profiles: ProfileRepository;
  businesses: BusinessProvisioningRepository;
  categories: (profileId: string) => BusinessCategoryRepository;
  onboarding: (profileId: string) => OnboardingRepository & {
    getProgress(businessId: string): Promise<OnboardingProgress | null>;
  };
  access: BusinessAccess;
  categoryCatalog: { listCategories(): Promise<CategoryRecord[]> };
  importStorage: { createSignedUploadUrl(input: { bucket: string; objectPath: string; expiresIn: number }): Promise<{ signedUrl: string; token: string; path: string }> };
  workspace: (profileId: string) => {
    getBusiness(businessId: string): Promise<unknown | null>;
    updateBusiness(businessId: string, patch: BusinessProfilePatch): Promise<unknown>;
    listBranches(businessId: string, cursor?: string, limit?: number): Promise<{items: unknown[]; next_cursor: string | null}>;
    createBranch(businessId: string, input: Required<Pick<BranchWrite, "name" | "code">> & BranchWrite): Promise<unknown>;
    updateBranch(businessId: string, branchId: string, patch: BranchWrite): Promise<unknown>;
  };
  requestId?: () => string;
}
type JsonObject = Record<string, unknown>;

function json(data: unknown, status = 200, requestId = "unknown"): Response {
  return Response.json({ data, meta: { request_id: requestId } }, { status });
}

function businessDto(value: unknown): Record<string, unknown> {
  const row = value as Record<string, unknown>;
  return {
    id: row.id, name: row.name, email: row.email, phone: row.phone, address: row.address,
    logo_object_path: row.logoObjectPath, country_code: row.countryCode, currency_code: row.currencyCode,
    timezone: row.timezone, vat_enabled: row.vatEnabled, vat_rate_bps: row.vatRateBps,
    tax_mode: typeof row.taxMode === "string" ? row.taxMode.toLowerCase() : row.taxMode,
    default_branch_id: row.defaultBranchId,
  };
}
function branchDto(value: unknown): Record<string, unknown> {
  const row = value as Record<string, unknown>;
  return { id: row.id, name: row.name, code: row.code, address: row.address, is_active: row.isActive, is_default: row.isDefault };
}
function onboardingDto(value: OnboardingProgress): Record<string, unknown> {
  return { current_step: value.currentStep, completed_steps: value.completedSteps, skipped_steps: value.skippedSteps, status: value.status };
}

function readRequestId(deps: RouteDependencies): string {
  return deps.requestId?.() ?? crypto.randomUUID();
}
async function body(request: Request): Promise<JsonObject> {
  let value: unknown;
  try { value = await request.json(); } catch { throw new ApiError(400, "VALIDATION_ERROR", "Request body must be valid JSON"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "VALIDATION_ERROR", "Request body must be a JSON object");
  return value as JsonObject;
}
async function identity(request: Request, deps: RouteDependencies): Promise<VerifiedIdentity> {
  try { return await verifySupabaseAccessToken(deps.authClient, request.headers.get("authorization")); }
  catch { throw new ApiError(401, "UNAUTHENTICATED", "A valid bearer access token is required"); }
}
function errorResponse(error: unknown, requestId: string): Response {
  if (error instanceof ApiError) return Response.json(error.toBody(requestId), { status: error.status });
  if (error instanceof ImportValidationError) return Response.json({ error: { code: error.code, message: error.message, request_id: requestId } }, { status: 400 });
  const code = error instanceof Error ? error.message : "";
  const known: Record<string, [number, string]> = {
    EMAIL_NOT_VERIFIED: [403, "Verify your email before creating a business"],
    EMAIL_REQUIRED: [400, "A verified email address is required"],
    FORBIDDEN: [403, "You do not have permission to perform this action"],
    FEATURE_NOT_AVAILABLE: [403, "This feature is not included in the current business plan"],
    INVALID_CATEGORY_IDS: [400, "One or more selected business categories are invalid"],
    VALIDATION_ERROR: [400, "The submitted information is invalid"],
    REQUIRED_STEP_CANNOT_BE_SKIPPED: [400, "Required onboarding steps cannot be skipped"],
    INVALID_ONBOARDING_STEP: [400, "The onboarding step is invalid"],
    REQUIRED_ONBOARDING_STEPS_INCOMPLETE: [409, "Complete all required steps before finishing onboarding"],
  };
  const mapped = known[code];
  if (mapped) return Response.json({ error: { code, message: mapped[1], request_id: requestId } }, { status: mapped[0] });
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred", request_id: requestId } }, { status: 500 });
}

/** Framework-neutral REST handlers. Mount these in Next.js route.ts files or another HTTP adapter. */
export function createV1RouteHandlers(deps: RouteDependencies) {
  return {
    me: async (request: Request): Promise<Response> => {
      const requestId = readRequestId(deps);
      try {
        const user = await identity(request, deps);
        const profile = await getOrCreateProfile(deps.profiles, user);
        return json({
          user_id: profile.id, email: profile.email,
          full_name: profile.fullName,
          memberships: await deps.access.listMemberships(profile.id),
        }, 200, requestId);
      } catch (error) { return errorResponse(error, requestId); }
    },


    listCategories: async (): Promise<Response> => {
      const requestId = readRequestId(deps);
      try { return json((await deps.categoryCatalog.listCategories()).map((category) => ({ id: category.id, name: category.name, slug: category.slug, parent_id: category.parentId, feature_flags: category.featureFlags })), 200, requestId); }
      catch (error) { return errorResponse(error, requestId); }
    },

    getBusiness: async (request: Request, businessId: string): Promise<Response> => {
      const requestId = readRequestId(deps);
      try {
        const user = await identity(request, deps);
        const profile = await getOrCreateProfile(deps.profiles, user);
        await deps.access.assertMember({ userId: profile.id, businessId });
        await deps.access.assertPermission({ userId: profile.id, businessId, permission: "business.settings.read" });
        const business = await deps.workspace(profile.id).getBusiness(businessId);
        if (!business) throw new ApiError(404, "NOT_FOUND", "Business was not found");
        return json(businessDto(business), 200, requestId);
      } catch (error) { return errorResponse(error, requestId); }
    },

    patchBusiness: async (request: Request, businessId: string): Promise<Response> => {
      const requestId = readRequestId(deps);
      try {
        const user = await identity(request, deps);
        const profile = await getOrCreateProfile(deps.profiles, user);
        await deps.access.assertMember({ userId: profile.id, businessId });
        await deps.access.assertPermission({ userId: profile.id, businessId, permission: "business.settings.update" });
        const input = await body(request);
        const patch: BusinessProfilePatch = {};
        if (typeof input.name === "string") patch.name = input.name.trim();
        if (input.email === null || typeof input.email === "string") patch.email = input.email as string | null;
        if (input.phone === null || typeof input.phone === "string") patch.phone = input.phone as string | null;
        if (input.address === null || typeof input.address === "string") patch.address = input.address as string | null;
        if (input.logo_object_path === null || typeof input.logo_object_path === "string") patch.logoObjectPath = input.logo_object_path as string | null;
        if (typeof input.currency_code === "string") patch.currencyCode = input.currency_code.toUpperCase();
        if (typeof input.timezone === "string") patch.timezone = input.timezone;
        if (typeof input.vat_enabled === "boolean") patch.vatEnabled = input.vat_enabled;
        if (typeof input.vat_rate_bps === "number") patch.vatRateBps = input.vat_rate_bps;
        if (input.tax_mode === "inclusive") patch.taxMode = "INCLUSIVE";
        if (input.tax_mode === "exclusive") patch.taxMode = "EXCLUSIVE";
        if (Object.keys(patch).length === 0) throw new ApiError(400, "VALIDATION_ERROR", "At least one supported business field is required");
        if (patch.name !== undefined && (patch.name.length < 2 || patch.name.length > 160)) throw new ApiError(400, "VALIDATION_ERROR", "Business name must be 2–160 characters");
        if (patch.currencyCode !== undefined && !/^[A-Z]{3}$/.test(patch.currencyCode)) throw new ApiError(400, "VALIDATION_ERROR", "Currency code must be three uppercase letters");
        if (patch.vatRateBps !== undefined && (!Number.isInteger(patch.vatRateBps) || patch.vatRateBps < 0 || patch.vatRateBps > 10000)) throw new ApiError(400, "VALIDATION_ERROR", "VAT rate must be between 0 and 10000 basis points");
        return json(businessDto(await deps.workspace(profile.id).updateBusiness(businessId, patch)), 200, requestId);
      } catch (error) { return errorResponse(error, requestId); }
    },

    listBranches: async (request: Request, businessId: string): Promise<Response> => {
      const requestId = readRequestId(deps);
      try {
        const user = await identity(request, deps);
        const profile = await getOrCreateProfile(deps.profiles, user);
        await deps.access.assertMember({ userId: profile.id, businessId });
        await deps.access.assertPermission({ userId: profile.id, businessId, permission: "branches.read" });
        const url = new URL(request.url);
        const limit = Number(url.searchParams.get("limit") ?? 25);
        const page = await deps.workspace(profile.id).listBranches(businessId, url.searchParams.get("cursor") ?? undefined, Number.isFinite(limit) ? limit : 25);
        return json({ items: page.items.map(branchDto), next_cursor: page.next_cursor }, 200, requestId);
      } catch (error) { return errorResponse(error, requestId); }
    },

    createBranch: async (request: Request, businessId: string): Promise<Response> => {
      const requestId = readRequestId(deps);
      try {
        const user = await identity(request, deps);
        const profile = await getOrCreateProfile(deps.profiles, user);
        await deps.access.assertMember({ userId: profile.id, businessId });
        await deps.access.assertPermission({ userId: profile.id, businessId, permission: "branches.manage" });
        await deps.access.assertFeature({ userId: profile.id, businessId, feature: "multi_branch" });
        const input = await body(request);
        if (typeof input.name !== "string" || !input.name.trim() || typeof input.code !== "string" || !input.code.trim()) {
          throw new ApiError(400, "VALIDATION_ERROR", "Branch name and code are required");
        }
        return json(branchDto(await deps.workspace(profile.id).createBranch(businessId, {
          name: input.name.trim(), code: input.code.trim(),
          address: input.address === null || typeof input.address === "string" ? input.address : undefined,
          isActive: typeof input.is_active === "boolean" ? input.is_active : undefined,
          isDefault: typeof input.is_default === "boolean" ? input.is_default : undefined,
        })), 201, requestId);
      } catch (error) { return errorResponse(error, requestId); }
    },

    updateBranch: async (request: Request, businessId: string, branchId: string): Promise<Response> => {
      const requestId = readRequestId(deps);
      try {
        const user = await identity(request, deps);
        const profile = await getOrCreateProfile(deps.profiles, user);
        await deps.access.assertMember({ userId: profile.id, businessId });
        await deps.access.assertPermission({ userId: profile.id, businessId, permission: "branches.manage" });
        await deps.access.assertFeature({ userId: profile.id, businessId, feature: "multi_branch" });
        const input = await body(request);
        const patch: BranchWrite = {};
        if (typeof input.name === "string") patch.name = input.name.trim();
        if (typeof input.code === "string") patch.code = input.code.trim();
        if (input.address === null || typeof input.address === "string") patch.address = input.address as string | null;
        if (typeof input.is_active === "boolean") patch.isActive = input.is_active;
        if (typeof input.is_default === "boolean") patch.isDefault = input.is_default;
        if (Object.keys(patch).length === 0) throw new ApiError(400, "VALIDATION_ERROR", "At least one branch field is required");
        return json(branchDto(await deps.workspace(profile.id).updateBranch(businessId, branchId, patch)), 200, requestId);
      } catch (error) { return errorResponse(error, requestId); }
    },

    createProductImportUpload: async (request: Request, businessId: string): Promise<Response> => {
      const requestId = readRequestId(deps);
      try {
        const user = await identity(request, deps);
        const profile = await getOrCreateProfile(deps.profiles, user);
        await deps.access.assertMember({ userId: profile.id, businessId });
        await deps.access.assertPermission({ userId: profile.id, businessId, permission: "products.import" });
        await deps.access.assertFeature({ userId: profile.id, businessId, feature: "product_import" });
        const input = validateSignedImportUploadRequest(await body(request));
        const extension = input.file_name.slice(input.file_name.lastIndexOf(".")).toLowerCase();
        const objectPath = businessId + "/imports/" + crypto.randomUUID() + extension;
        const signed = await deps.importStorage.createSignedUploadUrl({ bucket: PRODUCT_IMPORT_UPLOAD_POLICY.bucket, objectPath, expiresIn: PRODUCT_IMPORT_UPLOAD_POLICY.expiresInSeconds });
        return json({ bucket: PRODUCT_IMPORT_UPLOAD_POLICY.bucket, object_path: objectPath, upload_url: signed.signedUrl, token: signed.token, expires_in: PRODUCT_IMPORT_UPLOAD_POLICY.expiresInSeconds }, 201, requestId);
      } catch (error) { return errorResponse(error, requestId); }
    },

    createBusiness: async (request: Request): Promise<Response> => {
      const requestId = readRequestId(deps);
      try {
        const user = await identity(request, deps);
        const profile = await getOrCreateProfile(deps.profiles, user);
        const input = await body(request);
        if (typeof input.name !== "string") throw new ApiError(400, "VALIDATION_ERROR", "Business name is required", { name: "required" });
        if (input.email !== undefined && input.email !== null && (typeof input.email !== "string" || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(input.email))) throw new ApiError(400, "VALIDATION_ERROR", "Business email address is invalid", { email: "invalid" });
        const result = await createBusiness(deps.businesses, {
          ownerUserId: profile.id, emailVerified: user.emailVerified, name: input.name,
          email: typeof input.email === "string" ? input.email : null,
          phone: typeof input.phone === "string" ? input.phone : null,
          address: typeof input.address === "string" ? input.address : null,
          currencyCode: typeof input.currency_code === "string" ? input.currency_code : undefined,
          timezone: typeof input.timezone === "string" ? input.timezone : undefined,
          vatEnabled: typeof input.vat_enabled === "boolean" ? input.vat_enabled : undefined,
          vatRateBps: typeof input.vat_rate_bps === "number" ? input.vat_rate_bps : undefined,
        });
        return json({ business: businessDto(result.business), default_branch: branchDto(result.defaultBranch) }, 201, requestId);
      } catch (error) { return errorResponse(error, requestId); }
    },

    replaceCategories: async (request: Request, businessId: string): Promise<Response> => {
      const requestId = readRequestId(deps);
      try {
        const user = await identity(request, deps);
        const profile = await getOrCreateProfile(deps.profiles, user);
        await deps.access.assertMember({ userId: profile.id, businessId });
        await deps.access.assertPermission({ userId: profile.id, businessId, permission: "business.settings.update" });
        const input = await body(request);
        if (!Array.isArray(input.category_ids) || !input.category_ids.every((id) => typeof id === "string")) {
          throw new ApiError(400, "VALIDATION_ERROR", "category_ids must be an array of category IDs", { category_ids: "invalid" });
        }
        await replaceBusinessCategories(deps.categories(profile.id), businessId, input.category_ids as string[]);
        return json({ business_id: businessId, category_ids: [...new Set(input.category_ids)] }, 200, requestId);
      } catch (error) { return errorResponse(error, requestId); }
    },

    getOnboarding: async (request: Request, businessId: string): Promise<Response> => {
      const requestId = readRequestId(deps);
      try {
        const user = await identity(request, deps);
        const profile = await getOrCreateProfile(deps.profiles, user);
        await deps.access.assertMember({ userId: profile.id, businessId });
        await deps.access.assertPermission({ userId: profile.id, businessId, permission: "business.settings.read" });
        const progress = await deps.onboarding(profile.id).getProgress(businessId);
        if (!progress) throw new ApiError(404, "NOT_FOUND", "Onboarding progress was not found");
        return json(onboardingDto(progress), 200, requestId);
      } catch (error) { return errorResponse(error, requestId); }
    },

    patchOnboarding: async (request: Request, businessId: string): Promise<Response> => {
      const requestId = readRequestId(deps);
      try {
        const user = await identity(request, deps);
        const profile = await getOrCreateProfile(deps.profiles, user);
        await deps.access.assertMember({ userId: profile.id, businessId });
        await deps.access.assertPermission({ userId: profile.id, businessId, permission: "business.settings.update" });
        const current = await deps.onboarding(profile.id).getProgress(businessId);
        if (!current) throw new ApiError(404, "NOT_FOUND", "Onboarding progress was not found");
        const input = await body(request);
        const patch: OnboardingPatch = {};
        if (typeof input.current_step === "string") patch.currentStep = input.current_step as OnboardingPatch["currentStep"];
        if (Array.isArray(input.completed_steps) && input.completed_steps.every((step) => typeof step === "string")) patch.completedSteps = input.completed_steps as OnboardingPatch["completedSteps"];
        if (Array.isArray(input.skipped_steps) && input.skipped_steps.every((step) => typeof step === "string")) patch.skippedSteps = input.skipped_steps as OnboardingPatch["skippedSteps"];
        if (input.current_step !== undefined && !patch.currentStep) throw new ApiError(400, "VALIDATION_ERROR", "current_step is invalid");
        if (input.completed_steps !== undefined && !patch.completedSteps) throw new ApiError(400, "VALIDATION_ERROR", "completed_steps must be an array of steps");
        if (input.skipped_steps !== undefined && !patch.skippedSteps) throw new ApiError(400, "VALIDATION_ERROR", "skipped_steps must be an array of steps");
        return json(onboardingDto(await patchOnboardingProgress(deps.onboarding(profile.id), businessId, current, patch)), 200, requestId);
      } catch (error) { return errorResponse(error, requestId); }
    },
  };
}
