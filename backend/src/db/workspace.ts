import { PrismaClient } from "@prisma/client";
import { withTenantContext } from "../tenancy/context.js";

export interface CategoryRecord { id: string; name: string; slug: string; parentId: string | null; featureFlags: string[] }
export interface BusinessProfilePatch {
  name?: string; email?: string | null; phone?: string | null; address?: string | null;
  logoObjectPath?: string | null; currencyCode?: string; timezone?: string;
  vatEnabled?: boolean; vatRateBps?: number; taxMode?: "INCLUSIVE" | "EXCLUSIVE";
}
export interface BranchWrite {
  name?: string; code?: string; address?: string | null; isActive?: boolean; isDefault?: boolean;
}
export interface BranchRecord { id: string; name: string; code: string; address: string | null; isActive: boolean; isDefault: boolean }
export interface MembershipSummary {
  business_id: string; business_name: string; role: string; permissions: string[];
  permission_scopes: Record<string,string>; branch_ids: string[]; default_branch_id: string | null;
  subscription_status: "trial" | "active" | "grace" | "expired"; features: Array<{key:string;enabled:boolean;limit:number|null;usage:number}>;
  onboarding: {current_step:string;completed_steps:string[];skipped_steps:string[];status:string};
}

export class PrismaWorkspaceRepository {
  constructor(private readonly prisma: PrismaClient, private readonly userId: string) {}

  listCategories(): Promise<CategoryRecord[]> {
    return this.prisma.category.findMany({
      where: { isActive: true }, orderBy: [{ parentId: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, parentId: true, featureFlags: true },
    });
  }

  async getBusiness(businessId: string) {
    return withTenantContext(this.prisma, { userId: this.userId, businessId }, (tx) =>
      tx.business.findUnique({
        where: { id: businessId },
        select: {
          id: true, name: true, email: true, phone: true, address: true, logoObjectPath: true,
          countryCode: true, currencyCode: true, timezone: true, vatEnabled: true, vatRateBps: true,
          taxMode: true, defaultBranchId: true,
          businessCategories: { select: { categoryId: true }, orderBy: { categoryId: "asc" } },
        },
      }),
    );
  }

  async updateBusiness(businessId: string, patch: BusinessProfilePatch) {
    return withTenantContext(this.prisma, { userId: this.userId, businessId }, (tx) =>
      tx.business.update({
        where: { id: businessId },
        data: {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.email !== undefined ? { email: patch.email } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
          ...(patch.address !== undefined ? { address: patch.address } : {}),
          ...(patch.logoObjectPath !== undefined ? { logoObjectPath: patch.logoObjectPath } : {}),
          ...(patch.currencyCode !== undefined ? { currencyCode: patch.currencyCode } : {}),
          ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
          ...(patch.vatEnabled !== undefined ? { vatEnabled: patch.vatEnabled } : {}),
          ...(patch.vatRateBps !== undefined ? { vatRateBps: patch.vatRateBps } : {}),
          ...(patch.taxMode !== undefined ? { taxMode: patch.taxMode } : {}),
        },
        select: {
          id: true, name: true, email: true, phone: true, address: true, logoObjectPath: true,
          countryCode: true, currencyCode: true, timezone: true, vatEnabled: true, vatRateBps: true,
          taxMode: true, defaultBranchId: true,
        },
      }),
    );
  }

  async listBranches(businessId: string, cursor?: string, limit = 25): Promise<{items:BranchRecord[];next_cursor:string|null}> {
    return withTenantContext(this.prisma, { userId: this.userId, businessId }, async (tx) => {
      const rows = await tx.branch.findMany({
        where: { businessId, ...(cursor ? { id: { gt: cursor } } : {}) },
        orderBy: { id: "asc" }, take: Math.min(Math.max(limit,1),100)+1,
        select: { id:true,name:true,code:true,address:true,isActive:true,isDefault:true },
      });
      const hasMore = rows.length > Math.min(Math.max(limit,1),100);
      const items = rows.slice(0, Math.min(Math.max(limit,1),100));
      return { items, next_cursor: hasMore ? items.at(-1)?.id ?? null : null };
    });
  }

  async createBranch(businessId: string, input: Required<Pick<BranchWrite,"name"|"code">> & BranchWrite): Promise<BranchRecord> {
    return withTenantContext(this.prisma, { userId: this.userId, businessId }, async (tx) => {
      if (input.isDefault) await tx.branch.updateMany({ where: { businessId, isDefault: true }, data: { isDefault: false } });
      const branch = await tx.branch.create({
        data: {
          businessId, name: input.name, code: input.code,
          address: input.address ?? null, isActive: input.isActive ?? true, isDefault: input.isDefault ?? false,
        },
        select: { id:true,name:true,code:true,address:true,isActive:true,isDefault:true },
      });
      if (branch.isDefault) await tx.business.update({ where: { id: businessId }, data: { defaultBranchId: branch.id } });
      return branch;
    });
  }

  async updateBranch(businessId: string, branchId: string, patch: BranchWrite): Promise<BranchRecord> {
    return withTenantContext(this.prisma, { userId: this.userId, businessId }, async (tx) => {
      if (patch.isDefault) await tx.branch.updateMany({ where: { businessId, isDefault: true, id: { not: branchId } }, data: { isDefault: false } });
      const branch = await tx.branch.update({
        where: { id: branchId },
        data: {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.code !== undefined ? { code: patch.code } : {}),
          ...(patch.address !== undefined ? { address: patch.address } : {}),
          ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
          ...(patch.isDefault !== undefined ? { isDefault: patch.isDefault } : {}),
        },
        select: { id:true,name:true,code:true,address:true,isActive:true,isDefault:true },
      });
      if (branch.isDefault) await tx.business.update({ where: { id: businessId }, data: { defaultBranchId: branch.id } });
      return branch;
    });
  }

  async listMemberships(userId: string): Promise<MembershipSummary[]> {
    const memberships = await this.prisma.businessMember.findMany({
      where: { userId, status: "ACTIVE" },
      select: { businessId: true },
      orderBy: { createdAt: "asc" },
    });
    const summaries = await Promise.all(memberships.map(({ businessId }) =>
      withTenantContext(this.prisma, { userId, businessId }, async (tx) => {
        const member = await tx.businessMember.findFirst({
          where: { businessId, userId, status: "ACTIVE" },
          include: {
            role: { include: { grants: { include: { permission: { select: { key: true } } } } } },
            branchAssignments: { select: { branchId: true } },
            business: { select: { name: true, subscription: { select: { status: true, planCode: true } }, onboarding: true } },
          },
        });
        if (!member) return null;
        const planCode = member.business.subscription?.planCode;
        const featureRows = planCode ? await tx.planFeature.findMany({ where: { planCode } }) : [];
        const onboarding = member.business.onboarding;
        return {
          business_id: businessId,
          business_name: member.business.name,
          role: member.role.name,
          permissions: member.role.grants.map((grant) => grant.permission.key),
          permission_scopes: Object.fromEntries(member.role.grants.map((grant) => [grant.permission.key, grant.scope])),
          branch_ids: member.branchAssignments.map((assignment) => assignment.branchId),
          default_branch_id: member.defaultBranchId,
          subscription_status: (member.business.subscription?.status ?? "EXPIRED").toLowerCase() as MembershipSummary["subscription_status"],
          features: featureRows.map((feature) => ({ key: feature.key, enabled: feature.enabled, limit: feature.limit, usage: 0 })),
          onboarding: onboarding ? {
            current_step: onboarding.currentStep.toLowerCase(),
            completed_steps: onboarding.completedSteps,
            skipped_steps: onboarding.skippedSteps,
            status: onboarding.status.toLowerCase(),
          } : { current_step: "business_profile", completed_steps: [], skipped_steps: [], status: "not_started" },
        } satisfies MembershipSummary;
      }),
    ));
    return summaries.filter((item): item is MembershipSummary => item !== null);
  }
}
