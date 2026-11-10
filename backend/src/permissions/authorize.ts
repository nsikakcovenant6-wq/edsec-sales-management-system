export type PermissionScope = "business" | "assigned_branches" | "own_records" | "business_or_own";

export interface PermissionGrant {
  key: string;
  scope: PermissionScope;
}

export interface AuthorizationContext {
  permissions: PermissionGrant[];
  assignedBranchIds: string[];
  userId: string;
}

export interface ResourceScope {
  branchId?: string | null;
  ownerUserId?: string | null;
  sharedWithBusiness?: boolean;
}

export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN";
  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function canAccessResource(
  context: AuthorizationContext,
  permission: string,
  resource?: ResourceScope,
): boolean {
  const grant = context.permissions.find((item) => item.key === permission);
  if (!grant) return false;
  if (grant.scope === "business") return true;
  if (grant.scope === "assigned_branches") {
    return Boolean(resource?.branchId && context.assignedBranchIds.includes(resource.branchId));
  }
  if (grant.scope === "own_records") {
    return Boolean(resource?.ownerUserId && resource.ownerUserId === context.userId);
  }
  return Boolean(
    (resource?.ownerUserId && resource.ownerUserId === context.userId) ||
    resource?.sharedWithBusiness,
  );
}

export function assertPermission(
  context: AuthorizationContext,
  permission: string,
  resource?: ResourceScope,
): void {
  if (!canAccessResource(context, permission, resource)) throw new ForbiddenError();
}
