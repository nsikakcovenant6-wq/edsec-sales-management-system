import { randomUUID } from "node:crypto";
import { PrismaClient, type OnboardingStep as PrismaOnboardingStep, type OnboardingStatus as PrismaOnboardingStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { BusinessProvisioningRepository, BusinessProvisioningTransaction } from "../businesses/create-business.js";
import type { BusinessCategoryRepository } from "../businesses/categories.js";
import type { ProfileRepository } from "../profiles/profile.js";
import type { OnboardingProgress, OnboardingRepository } from "../onboarding/progress.js";
import type { BusinessAccess } from "../http/routes.js";
import { withTenantContext } from "../tenancy/context.js";

const OWNER_PERMISSION_KEYS = [
  "business.settings.read","business.settings.update","members.read","members.invite","members.update","members.remove",
  "roles.read","roles.manage","dashboard.read","notifications.read","notifications.manage","products.read","products.create",
  "products.update","products.archive","products.import","products.cost_price.view","products.cost_price.update",
  "products.selling_price.update","inventory.read","inventory.adjust","inventory.transfer","inventory.receive",
  "suppliers.read","suppliers.create","suppliers.update","purchases.read","purchases.create","purchases.receive",
  "purchases.cancel","sales.read","sales.create","sales.void","sales.refund","sales.sync","discounts.read",
  "discounts.create","discounts.approve","discount.override_below_cost","payments.read","payments.record",
  "payments.confirm_manual","payments.refund","customers.read","customers.create","customers.update","customers.export",
  "customers.anonymise","credit.read","credit.issue","credit.collect","credit.adjust","expenses.read","expenses.create",
  "expenses.approve","reports.sales.read","reports.finance.read","reports.inventory.read","reports.export","branches.read",
  "branches.manage","cash_sessions.read","cash_sessions.manage","quotations.read","quotations.manage","invoices.read",
  "invoices.manage","subscription.read","subscription.manage","audit.read","ai.analytics.use","ai.reports.configure",
] as const;

const stepToDb: Record<OnboardingProgress["currentStep"], PrismaOnboardingStep> = {
  business_profile: "BUSINESS_PROFILE", business_category: "BUSINESS_CATEGORY", branch_setup: "BRANCH_SETUP",
  store_configuration: "STORE_CONFIGURATION", product_templates: "PRODUCT_TEMPLATES", product_import: "PRODUCT_IMPORT",
  subscription_selection: "SUBSCRIPTION_SELECTION", team_invitation: "TEAM_INVITATION", onboarding_complete: "ONBOARDING_COMPLETE",
};
const stepFromDb = Object.fromEntries(Object.entries(stepToDb).map(([key,value]) => [value,key])) as Record<PrismaOnboardingStep, OnboardingProgress["currentStep"]>;
const statusToDb: Record<OnboardingProgress["status"], PrismaOnboardingStatus> = {
  not_started: "NOT_STARTED", in_progress: "IN_PROGRESS", completed: "COMPLETED",
};
const statusFromDb: Record<PrismaOnboardingStatus, OnboardingProgress["status"]> = {
  NOT_STARTED: "not_started", IN_PROGRESS: "in_progress", COMPLETED: "completed",
};

function toProgress(row: { currentStep: PrismaOnboardingStep; completedSteps: string[]; skippedSteps: string[]; status: PrismaOnboardingStatus }): OnboardingProgress {
  return {
    currentStep: stepFromDb[row.currentStep],
    completedSteps: row.completedSteps as OnboardingProgress["completedSteps"],
    skippedSteps: row.skippedSteps as OnboardingProgress["skippedSteps"],
    status: statusFromDb[row.status],
  };
}

export class PrismaProfileRepository implements ProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}
  userProfile = {
    upsert: async (args: Parameters<ProfileRepository["userProfile"]["upsert"]>[0]) =>
      this.prisma.userProfile.upsert({
        where: args.where, create: args.create, update: args.update,
        select: { id: true, authUserId: true, email: true, fullName: true, phone: true, emailVerifiedAt: true },
      }),
  };
}

export class PrismaBusinessProvisioningRepository implements BusinessProvisioningRepository {
  constructor(private readonly prisma: PrismaClient) {}
  transaction<T>(work: (tx: BusinessProvisioningTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      let businessId = "";
      let branchId = "";
      let provisioningUserId = "";
      const adapter: BusinessProvisioningTransaction = {
        setProvisioningUser: async (userId) => { provisioningUserId = userId; },
        createBusiness: async (input) => {
          if (!provisioningUserId) throw new Error("PROVISIONING_USER_REQUIRED");
          businessId = randomUUID();
          await tx.$queryRawUnsafe(
            "SELECT set_config('app.user_id', $1, true), set_config('app.business_id', $2, true)",
            provisioningUserId, businessId,
          );
          const slugBase = input.name.toLowerCase().normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150) || "business";
          return tx.business.create({
            data: {
              id: businessId, name: input.name, slug: `${slugBase}-${businessId.slice(0, 8)}`,
              currencyCode: input.currencyCode, timezone: input.timezone,
              vatEnabled: input.vatEnabled, vatRateBps: input.vatRateBps,
            },
            select: { id: true, name: true, currencyCode: true, timezone: true },
          });
        },
        createMainBranch: async (requestedBusinessId) => {
          if (requestedBusinessId !== businessId) throw new Error("BUSINESS_CONTEXT_MISMATCH");
          const branch = await tx.branch.create({
            data: { businessId, name: "Main Branch", code: "MAIN", isDefault: true },
            select: { id: true, name: true, code: true },
          });
          branchId = branch.id;
          await tx.business.update({ where: { id: businessId }, data: { defaultBranchId: branchId } });
          return branch;
        },
        ensureOwnerRole: async () => {
          if (!businessId) throw new Error("BUSINESS_CONTEXT_REQUIRED");
          const existing = await tx.role.findFirst({ where: { businessId, code: "OWNER" }, select: { id: true } });
          const role = existing ?? await tx.role.create({
            data: { businessId, code: "OWNER", name: "Owner", isSystem: true }, select: { id: true },
          });
          const permissions = await Promise.all(OWNER_PERMISSION_KEYS.map((key) =>
            tx.permission.upsert({ where: { key }, create: { key }, update: {}, select: { id: true } }),
          ));
          await tx.rolePermission.createMany({
            data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id, scope: "business" })),
            skipDuplicates: true,
          });
          return role;
        },
        createOwnerMembership: async (input) => {
          if (input.businessId !== businessId || !branchId) throw new Error("BUSINESS_CONTEXT_MISMATCH");
          const member = await tx.businessMember.create({
            data: { businessId, userId: input.userId, roleId: input.roleId, defaultBranchId: branchId },
            select: { id: true },
          });
          await tx.memberBranch.create({ data: { businessId, memberId: member.id, branchId } });
        },
        createInitialOnboarding: async (input) => {
          await tx.onboardingProgress.create({
            data: { businessId: input.businessId, currentStep: input.currentStep, status: "NOT_STARTED" },
          });
        },
      };
      return work(adapter);
    });
  }
}

export class PrismaBusinessCategoryRepository implements BusinessCategoryRepository {
  constructor(private readonly prisma: PrismaClient, private readonly userId: string) {}
  transaction<T>(work: Parameters<BusinessCategoryRepository["transaction"]>[0]): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      let contextInstalled = false;
      const scoped = {
        assertCategoriesExist: async (categoryIds: string[]) => {
          const count = await tx.category.count({ where: { id: { in: categoryIds }, isActive: true } });
          if (count !== categoryIds.length) throw new Error("INVALID_CATEGORY_IDS");
        },
        replaceBusinessCategories: async (businessId: string, categoryIds: string[]) => {
          if (!contextInstalled) {
            await tx.$queryRawUnsafe(
              "SELECT set_config('app.user_id', $1, true), set_config('app.business_id', $2, true)",
              this.userId, businessId,
            );
            contextInstalled = true;
          }
          await tx.businessCategory.deleteMany({ where: { businessId } });
          await tx.businessCategory.createMany({ data: categoryIds.map((categoryId) => ({ businessId, categoryId })) });
        },
      };
      return work(scoped);
    });
  }
}

export class PrismaOnboardingRepository implements OnboardingRepository {
  constructor(private readonly prisma: PrismaClient, private readonly userId: string) {}
  async getProgress(businessId: string): Promise<OnboardingProgress | null> {
    return withTenantContext(this.prisma, { userId: this.userId, businessId }, async (tx) => {
      const row = await tx.onboardingProgress.findUnique({ where: { businessId } });
      return row ? toProgress(row) : null;
    });
  }
  async updateProgress(businessId: string, progress: OnboardingProgress): Promise<OnboardingProgress> {
    return withTenantContext(this.prisma, { userId: this.userId, businessId }, async (tx) => {
      const row = await tx.onboardingProgress.update({
        where: { businessId },
        data: {
          currentStep: stepToDb[progress.currentStep], completedSteps: progress.completedSteps,
          skippedSteps: progress.skippedSteps, status: statusToDb[progress.status],
        },
      });
      return toProgress(row);
    });
  }
}

export class PrismaBusinessAccess implements BusinessAccess {
  constructor(private readonly prisma: PrismaClient) {}
  async assertMember(input: { userId: string; businessId: string }): Promise<void> {
    const member = await withTenantContext(this.prisma, input, (tx) => tx.businessMember.findFirst({
      where: { businessId: input.businessId, userId: input.userId, status: "ACTIVE" },
      select: { id: true },
    }));
    if (!member) throw new Error("FORBIDDEN");
  }
  async assertPermission(input: { userId: string; businessId: string; permission: string }): Promise<void> {
    const allowed = await withTenantContext(this.prisma, input, async (tx) => {
      const member = await tx.businessMember.findFirst({
        where: { businessId: input.businessId, userId: input.userId, status: "ACTIVE" },
        select: { roleId: true },
      });
      if (!member) return false;
      const grant = await tx.rolePermission.findFirst({
        where: { roleId: member.roleId, permission: { is: { key: input.permission } }, scope: "business" },
        select: { roleId: true },
      });
      return Boolean(grant);
    });
    if (!allowed) throw new Error("FORBIDDEN");
  }
}

export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}
