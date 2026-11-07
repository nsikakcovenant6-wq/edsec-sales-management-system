export interface TenantContext {
  userId: string;
  businessId: string;
}

export interface TenantTransaction {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
}

export interface TenantPrismaClient {
  $transaction<T>(callback: (transaction: TenantTransaction) => Promise<T>): Promise<T>;
}

/**
 * Installs transaction-local RLS context and runs every tenant query in the same transaction.
 * Values are parameterized; never concatenate user-controlled identifiers into SQL.
 */
export async function withTenantContext<T>(
  prisma: TenantPrismaClient,
  context: TenantContext,
  work: (transaction: TenantTransaction) => Promise<T>,
): Promise<T> {
  if (!context.userId || !context.businessId) {
    throw new Error("TENANT_CONTEXT_REQUIRED");
  }

  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRawUnsafe(
      "SELECT set_config('app.user_id', $1, true), set_config('app.business_id', $2, true)",
      context.userId,
      context.businessId,
    );
    return work(transaction);
  });
}
