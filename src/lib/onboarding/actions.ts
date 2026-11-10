import { api, ApiError, type BusinessCreate, type BusinessPatch, type Membership } from "@/lib/api/client";
import { canCreateAdditionalBranch } from "@/lib/onboarding/flow";
import type { BranchDraft } from "@/components/auth/onboarding-draft";

export async function saveBusinessProfile(input: BusinessCreate, currentBusinessId: string | null) {
  let businessId = currentBusinessId;
  if (businessId) {
    await api.patchBusiness(businessId, input);
  } else {
    const me = await api.me();
    const existing = me.memberships[0];
    if (existing) {
      businessId = existing.business_id;
      await api.patchBusiness(businessId, input);
    } else {
      const created = await api.createBusiness(input);
      businessId = created.business.id;
      // createBusiness provisions Main Branch atomically; never send a second MAIN branch.
    }
  }
  const current = await api.getOnboarding(businessId);
  await api.patchOnboarding(businessId, {
    current_step: current.completed_steps.includes("business_category") ? current.current_step : "business_category",
    completed_steps: [...new Set([...current.completed_steps, "business_profile"])],
  });
  const me = await api.me();
  const membership = me.memberships.find((item) => item.business_id === businessId) ?? null;
  return { businessId, membership };
}

export async function saveBusinessCategories(businessId: string, categoryIds: string[]) {
  if (categoryIds.length === 0) throw new ApiError({ code: "VALIDATION_ERROR", message: "Select at least one business category." }, 400);
  await api.replaceCategories(businessId, [...new Set(categoryIds)]);
  const current = await api.getOnboarding(businessId);
  await api.patchOnboarding(businessId, {
    current_step: "branch_setup",
    completed_steps: [...new Set([...current.completed_steps, "business_profile", "business_category"])],
  });
}

export async function saveBranchSetup(businessId: string, membership: Membership | null, drafts: BranchDraft[]) {
  const existing = await api.listBranches(businessId);
  if (drafts.length > 0 && !canCreateAdditionalBranch(membership)) {
    throw new ApiError({ code: "FEATURE_NOT_AVAILABLE", message: "Additional branches require the multi-branch plan feature and branches.manage permission." }, 403);
  }
  const existingCodes = new Set(existing.items.map((branch) => branch.code.toUpperCase()));
  for (const draft of drafts) {
    const name = draft.name.trim(), code = draft.code.trim().toUpperCase();
    if (!name || !code) throw new ApiError({ code: "VALIDATION_ERROR", message: "Every additional branch needs a name and code." }, 400);
    if (code === "MAIN" || existingCodes.has(code)) continue;
    await api.createBranch(businessId, { name, code, address: draft.address.trim() || null });
    existingCodes.add(code);
  }
  const current = await api.getOnboarding(businessId);
  const hasAdditional = existingCodes.size > existing.items.filter((item) => item.is_default).length;
  const skipped = new Set(current.skipped_steps);
  const completed = new Set(current.completed_steps);
  if (hasAdditional) { completed.add("branch_setup"); skipped.delete("branch_setup"); }
  else { skipped.add("branch_setup"); completed.delete("branch_setup"); }
  await api.patchOnboarding(businessId, { current_step: "store_configuration", completed_steps: [...completed], skipped_steps: [...skipped] });
  return api.listBranches(businessId);
}

export async function saveStoreConfiguration(businessId: string, input: Pick<BusinessPatch, "vat_enabled" | "vat_rate_bps" | "tax_mode">) {
  await api.patchBusiness(businessId, input);
  const current = await api.getOnboarding(businessId);
  await api.patchOnboarding(businessId, {
    current_step: "onboarding_complete",
    completed_steps: [...new Set([...current.completed_steps, "business_profile", "business_category", "store_configuration"])],
  });
}
