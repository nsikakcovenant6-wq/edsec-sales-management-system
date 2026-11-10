import { describe, expect, it, vi } from "vitest";
import { createV1RouteHandlers } from "../src/http/routes.js";

function dependencies() {
  const authClient = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1", email: "owner@example.test", email_confirmed_at: "2026-11-07T00:00:00.000Z", user_metadata: { full_name: "Owner" } } }, error: null }) } } as never;
  const profiles = { userProfile: { upsert: vi.fn().mockResolvedValue({ id: "profile-1", authUserId: "auth-1", email: "owner@example.test", fullName: "Owner", phone: null, emailVerifiedAt: new Date() }) } };
  const businesses = { transaction: vi.fn() };
  const categories = { transaction: vi.fn() };
  const onboarding = { getProgress: vi.fn(), updateProgress: vi.fn() };
  const access = { listMemberships: vi.fn().mockResolvedValue([]), assertMember: vi.fn(), assertPermission: vi.fn(), assertFeature: vi.fn() };
  const categoryCatalog = { listCategories: vi.fn().mockResolvedValue([] as Array<{ id: string; name: string; slug: string; parentId: string | null; featureFlags: string[] }>) };
  const workspace = () => ({
    getBusiness: vi.fn(), updateBusiness: vi.fn(), listBranches: vi.fn(),
    createBranch: vi.fn(), updateBranch: vi.fn(),
  });
  return {
    authClient, profiles, businesses, categories: () => categories,
    onboarding: () => onboarding, access, categoryCatalog,
    importStorage: { createSignedUploadUrl: vi.fn().mockResolvedValue({ signedUrl: "https://storage.example.test/signed", token: "signed-token", path: "business-1/imports/file.csv" }) },
    workspace,
    requestId: () => "test-request",
  };
}

describe("Phase 2 signed product import upload", () => {
  it("checks permissions and feature before issuing a tenant-scoped signed URL", async () => {
    const deps = dependencies();
    const handlers = createV1RouteHandlers(deps);
    const response = await handlers.createProductImportUpload(new Request("https://example.test", {
      method: "POST", headers: { authorization: "Bearer valid-token", "content-type": "application/json" },
      body: JSON.stringify({ file_name: "products.csv", content_type: "text/csv", size_bytes: 1024 }),
    }), "business-1");
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ data: { bucket: "edsec-product-imports", upload_url: "https://storage.example.test/signed", token: "signed-token" } });
    expect(deps.access.assertPermission).toHaveBeenCalledWith({ userId: "profile-1", businessId: "business-1", permission: "products.import" });
    expect(deps.access.assertFeature).toHaveBeenCalledWith({ userId: "profile-1", businessId: "business-1", feature: "product_import" });
  });
  it("rejects unsupported files before requesting storage", async () => {
    const deps = dependencies();
    const handlers = createV1RouteHandlers(deps);
    const response = await handlers.createProductImportUpload(new Request("https://example.test", {
      method: "POST", headers: { authorization: "Bearer valid-token", "content-type": "application/json" },
      body: JSON.stringify({ file_name: "products.xls", content_type: "application/vnd.ms-excel", size_bytes: 1024 }),
    }), "business-1");
    expect(response.status).toBe(400);
    expect(deps.importStorage.createSignedUploadUrl).not.toHaveBeenCalled();
  });
});

describe("Phase 1 REST handlers", () => {

  it("returns the OpenAPI profile shape and resolves memberships with the internal profile ID", async () => {
    const deps = dependencies();
    const handlers = createV1RouteHandlers(deps);
    const response = await handlers.me(new Request("https://example.test/api/v1/me", {
      headers: { authorization: "Bearer valid-token" },
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { user_id: "profile-1", email: "owner@example.test", full_name: "Owner", memberships: [] },
      meta: { request_id: "test-request" },
    });
    expect(deps.access.listMemberships).toHaveBeenCalledWith("profile-1");
  });

  it("exposes public category catalogue in snake_case", async () => {
    const deps = dependencies();
    deps.categoryCatalog.listCategories.mockResolvedValue([{
      id: "cat-1", name: "Groceries", slug: "groceries", parentId: null, featureFlags: ["barcode"],
    }]);
    const handlers = createV1RouteHandlers(deps);
    const response = await handlers.listCategories();
    expect(await response.json()).toMatchObject({
      data: [{ id: "cat-1", name: "Groceries", parent_id: null, feature_flags: ["barcode"] }],
    });
  });

  it("rejects missing bearer tokens before accessing profile data", async () => {
    const deps = dependencies();
    const handlers = createV1RouteHandlers(deps);
    const response = await handlers.me(new Request("https://example.test/api/v1/me"));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "UNAUTHENTICATED", request_id: "test-request" } });
    expect(deps.profiles.userProfile.upsert).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON for business creation", async () => {
    const deps = dependencies();
    const handlers = createV1RouteHandlers(deps);
    const response = await handlers.createBusiness(new Request("https://example.test/api/v1/businesses", {
      method: "POST", headers: { authorization: "Bearer token", "content-type": "application/json" }, body: "{",
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(deps.businesses.transaction).not.toHaveBeenCalled();
  });

  it("returns a stable request id in successful JSON envelope", async () => {
    const deps = dependencies();
    const handlers = createV1RouteHandlers(deps);
    const response = await handlers.getOnboarding(new Request("https://example.test"), "business-1");
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { request_id: "test-request" } });
  });
});
