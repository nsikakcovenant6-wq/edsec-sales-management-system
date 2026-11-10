import { describe, expect, it } from "vitest";
import { canAccessResource, type AuthorizationContext } from "../src/permissions/authorize.js";

const cashier: AuthorizationContext = {
  userId: "cashier-1",
  assignedBranchIds: ["branch-a"],
  permissions: [{ key: "sales.read", scope: "assigned_branches" }],
};

describe("permission scope enforcement", () => {
  it("limits cashier sales.read to assigned branches", () => {
    expect(canAccessResource(cashier, "sales.read", { branchId: "branch-a" })).toBe(true);
    expect(canAccessResource(cashier, "sales.read", { branchId: "branch-b" })).toBe(false);
  });

  it("denies missing permission grants", () => {
    expect(canAccessResource(cashier, "sales.refund", { branchId: "branch-a" })).toBe(false);
  });

  it("supports own-record scope", () => {
    const context = { ...cashier, permissions: [{ key: "customers.read", scope: "own_records" as const }] };
    expect(canAccessResource(context, "customers.read", { ownerUserId: "cashier-1" })).toBe(true);
    expect(canAccessResource(context, "customers.read", { ownerUserId: "cashier-2" })).toBe(false);
  });
});
