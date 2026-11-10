export interface BusinessCategoryRepository {
  transaction<T>(work: (tx: {
    assertCategoriesExist(categoryIds: string[]): Promise<void>;
    replaceBusinessCategories(businessId: string, categoryIds: string[]): Promise<void>;
  }) => Promise<T>): Promise<T>;
}

export async function replaceBusinessCategories(
  repository: BusinessCategoryRepository,
  businessId: string,
  categoryIds: string[],
): Promise<void> {
  const normalized = [...new Set(categoryIds)];
  if (!businessId || normalized.length === 0 || normalized.length !== categoryIds.length) {
    throw new Error("VALIDATION_ERROR");
  }
  await repository.transaction(async (tx) => {
    await tx.assertCategoriesExist(normalized);
    await tx.replaceBusinessCategories(businessId, normalized);
  });
}
