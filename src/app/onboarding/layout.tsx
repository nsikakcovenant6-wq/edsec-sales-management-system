import type { ReactNode } from "react";
import { OnboardingDraftProvider } from "@/components/auth/onboarding-draft";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <OnboardingDraftProvider>{children}</OnboardingDraftProvider>;
}
