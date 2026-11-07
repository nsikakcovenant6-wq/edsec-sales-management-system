import type { Prisma, PrismaClient } from "@prisma/client";

export interface TenantContext {
  userId: string;
  businessId: string;
}

export type TenantTransaction = Prisma.TransactionClient;
export type TenantPrismaClient = Pick<PrismaClient, "$transaction">;

/** Installs transaction-local RLS context before any tenant-scoped database operation. */
export async function withTenantContext<T>(
  prisma: TenantPrismaClient,
  context: TenantContext,
  work: (transaction: TenantTransaction) => Promise<T>,
): Promise<T> {
  if (!context.userId || !context.businessId) throw new Error("TENANT_CONTEXT_REQUIRED");
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRawUnsafe(
      "SELECT set_config('app.user_id', $1, true), set_config('app.business_id', $2, true)",
      context.userId, context.businessId,
    );
    return work(transaction);
  });
}
