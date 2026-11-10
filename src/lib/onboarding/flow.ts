import type { Membership } from "@/lib/api/client";
export function canCreateAdditionalBranch(membership: Membership | null): boolean {
  return Boolean(membership?.permissions.includes("branches.manage") && membership.features.some((feature) => feature.key === "multi_branch" && feature.enabled));
}
const stepRoutes: Record<string,string> = { business_profile: "/onboarding/business", business_category: "/onboarding/categories", branch_setup: "/onboarding/branches", store_configuration: "/onboarding/store-configuration", product_templates: "/onboarding/store-configuration", product_import: "/onboarding/store-configuration", subscription_selection: "/onboarding/store-configuration", team_invitation: "/onboarding/store-configuration", onboarding_complete: "/onboarding/complete" };
export function getOnboardingRoute(step: string | null | undefined): string { return stepRoutes[step ?? ""] ?? "/onboarding/welcome"; }
