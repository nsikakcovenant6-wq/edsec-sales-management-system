export interface CreateBusinessInput {
  ownerUserId: string;
  emailVerified: boolean;
  name: string;
  currencyCode?: string;
  timezone?: string;
  vatEnabled?: boolean;
  vatRateBps?: number;
}

export interface CreatedBusiness {
  id: string;
  name: string;
  currencyCode: string;
  timezone: string;
}

export interface CreatedBranch {
  id: string;
  name: string;
  code: string;
}

export interface BusinessProvisioningTransaction {
  createBusiness(input: {
    name: string;
    currencyCode: string;
    timezone: string;
    vatEnabled: boolean;
    vatRateBps: number;
  }): Promise<CreatedBusiness>;
  createMainBranch(businessId: string): Promise<CreatedBranch>;
  ensureOwnerRole(): Promise<{ id: string }>;
  createOwnerMembership(input: { businessId: string; userId: string; roleId: string }): Promise<void>;
  createInitialOnboarding(input: { businessId: string; currentStep: "BUSINESS_PROFILE" }): Promise<void>;
}

export interface BusinessProvisioningRepository {
  transaction<T>(work: (tx: BusinessProvisioningTransaction) => Promise<T>): Promise<T>;
}

export class BusinessProvisioningError extends Error {
  constructor(readonly code: "EMAIL_NOT_VERIFIED" | "VALIDATION_ERROR", message: string) {
    super(message);
    this.name = "BusinessProvisioningError";
  }
}

export async function createBusiness(
  repository: BusinessProvisioningRepository,
  input: CreateBusinessInput,
): Promise<{ business: CreatedBusiness; defaultBranch: CreatedBranch }> {
  if (!input.emailVerified) {
    throw new BusinessProvisioningError("EMAIL_NOT_VERIFIED", "Verify your email before creating a business");
  }
  const name = input.name.trim();
  if (name.length < 2 || name.length > 160) {
    throw new BusinessProvisioningError("VALIDATION_ERROR", "Business name must be between 2 and 160 characters");
  }
  const currencyCode = (input.currencyCode ?? "NGN").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new BusinessProvisioningError("VALIDATION_ERROR", "Currency code must be a three-letter ISO code");
  }
  const vatRateBps = input.vatRateBps ?? 750;
  if (!Number.isInteger(vatRateBps) || vatRateBps < 0 || vatRateBps > 10000) {
    throw new BusinessProvisioningError("VALIDATION_ERROR", "VAT rate must be between 0 and 10000 basis points");
  }

  return repository.transaction(async (tx) => {
    const business = await tx.createBusiness({
      name,
      currencyCode,
      timezone: input.timezone ?? "Africa/Lagos",
      vatEnabled: input.vatEnabled ?? false,
      vatRateBps,
    });
    const defaultBranch = await tx.createMainBranch(business.id);
    const ownerRole = await tx.ensureOwnerRole();
    await tx.createOwnerMembership({ businessId: business.id, userId: input.ownerUserId, roleId: ownerRole.id });
    await tx.createInitialOnboarding({ businessId: business.id, currentStep: "BUSINESS_PROFILE" });
    return { business, defaultBranch };
  });
}
