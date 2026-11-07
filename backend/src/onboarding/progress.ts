export const ONBOARDING_STEPS = [
  "business_profile",
  "business_category",
  "branch_setup",
  "store_configuration",
  "product_templates",
  "product_import",
  "subscription_selection",
  "team_invitation",
  "onboarding_complete",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const REQUIRED_STEPS = new Set<OnboardingStep>([
  "business_profile",
  "business_category",
  "store_configuration",
]);

export interface OnboardingProgress {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skippedSteps: OnboardingStep[];
  status: "not_started" | "in_progress" | "completed";
}

export interface OnboardingRepository {
  updateProgress(businessId: string, progress: OnboardingProgress): Promise<OnboardingProgress>;
}

export interface OnboardingPatch {
  currentStep?: OnboardingStep;
  completedSteps?: OnboardingStep[];
  skippedSteps?: OnboardingStep[];
}

export async function patchOnboardingProgress(
  repository: OnboardingRepository,
  businessId: string,
  current: OnboardingProgress,
  patch: OnboardingPatch,
): Promise<OnboardingProgress> {
  const completed = new Set(patch.completedSteps ?? current.completedSteps);
  const skipped = new Set(patch.skippedSteps ?? current.skippedSteps);

  for (const step of skipped) {
    if (REQUIRED_STEPS.has(step) || step === "onboarding_complete") {
      throw new Error("REQUIRED_STEP_CANNOT_BE_SKIPPED");
    }
  }
  for (const step of [...completed, ...skipped]) {
    if (!ONBOARDING_STEPS.includes(step)) throw new Error("INVALID_ONBOARDING_STEP");
  }

  const currentStep = patch.currentStep ?? current.currentStep;
  if (!ONBOARDING_STEPS.includes(currentStep)) throw new Error("INVALID_ONBOARDING_STEP");
  if (currentStep === "onboarding_complete") {
    const requiredComplete = [...REQUIRED_STEPS].every((step) => completed.has(step));
    if (!requiredComplete) throw new Error("REQUIRED_ONBOARDING_STEPS_INCOMPLETE");
  }

  const status = currentStep === "onboarding_complete"
    ? "completed"
    : completed.size === 0 && skipped.size === 0
      ? "not_started"
      : "in_progress";

  return repository.updateProgress(businessId, {
    currentStep,
    completedSteps: [...completed],
    skippedSteps: [...skipped],
    status,
  });
}
