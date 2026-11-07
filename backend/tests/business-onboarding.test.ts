import { describe, expect, it, vi } from "vitest";
import { createBusiness, type BusinessProvisioningRepository } from "../src/businesses/create-business.js";
import { replaceBusinessCategories } from "../src/businesses/categories.js";
import { patchOnboardingProgress, type OnboardingRepository } from "../src/onboarding/progress.js";

describe("business provisioning", () => {
  it("creates business, Main Branch, owner membership and onboarding atomically", async () => {
    const calls: string[] = [];
    const repository: BusinessProvisioningRepository = {
      transaction: async (work) => work({
        createBusiness: async (input) => { calls.push(`business:${input.currencyCode}`); return { id: "biz-1", name: input.name, currencyCode: input.currencyCode, timezone: input.timezone }; },
        createMainBranch: async () => { calls.push("branch:MAIN"); return { id: "branch-1", name: "Main Branch", code: "MAIN" }; },
        ensureOwnerRole: async () => { calls.push("role:OWNER"); return { id: "role-owner" }; },
        createOwnerMembership: async () => { calls.push("membership"); },
        createInitialOnboarding: async () => { calls.push("onboarding"); },
      }),
    };
    const result = await createBusiness(repository, { ownerUserId: "user-1", emailVerified: true, name: "Corner Shop" });
    expect(result.defaultBranch.code).toBe("MAIN");
    expect(calls).toEqual(["business:NGN", "branch:MAIN", "role:OWNER", "membership", "onboarding"]);
  });

  it("rejects unverified owners before starting a transaction", async () => {
    const transaction = vi.fn();
    await expect(createBusiness({ transaction } as unknown as BusinessProvisioningRepository, {
      ownerUserId: "user-1", emailVerified: false, name: "Corner Shop",
    })).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("multi-category business setup", () => {
  it("validates and replaces a unique category set in one transaction", async () => {
    const replace = vi.fn();
    const repository = {
      transaction: async (work: (tx: { assertCategoriesExist(ids: string[]): Promise<void>; replaceBusinessCategories(id: string, ids: string[]): Promise<void> }) => Promise<void>) => work({
        assertCategoriesExist: async () => undefined,
        replaceBusinessCategories: replace,
      }),
    };
    await replaceBusinessCategories(repository, "biz-1", ["cat-a", "cat-b"]);
    expect(replace).toHaveBeenCalledWith("biz-1", ["cat-a", "cat-b"]);
  });
});

describe("onboarding progress", () => {
  const initial = { currentStep: "business_profile" as const, completedSteps: [] as const, skippedSteps: [] as const, status: "not_started" as const };
  it("does not allow required steps to be skipped", async () => {
    const repository: OnboardingRepository = { updateProgress: async (_id, progress) => progress };
    await expect(patchOnboardingProgress(repository, "biz-1", initial, { skippedSteps: ["business_profile"] })).rejects.toThrow("REQUIRED_STEP_CANNOT_BE_SKIPPED");
  });
  it("allows optional steps to be skipped and persists progress", async () => {
    const repository: OnboardingRepository = { updateProgress: async (_id, progress) => progress };
    const result = await patchOnboardingProgress(repository, "biz-1", initial, { skippedSteps: ["branch_setup"] });
    expect(result.skippedSteps).toContain("branch_setup");
    expect(result.status).toBe("in_progress");
  });
});
