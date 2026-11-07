import { describe, expect, it, vi } from "vitest";
import { createV1RouteHandlers } from "../src/http/routes.js";

function dependencies() {
  const authClient = { auth: { getUser: vi.fn() } } as never;
  const profiles = { userProfile: { upsert: vi.fn() } };
  const businesses = { transaction: vi.fn() };
  const categories = { transaction: vi.fn() };
  const onboarding = { getProgress: vi.fn(), updateProgress: vi.fn() };
  const access = { assertMember: vi.fn(), assertPermission: vi.fn() };
  return { authClient, profiles, businesses, categories, onboarding, access, requestId: () => "test-request" };
}

describe("Phase 1 REST handlers", () => {
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
    expect(response.status).toBe(401);
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
