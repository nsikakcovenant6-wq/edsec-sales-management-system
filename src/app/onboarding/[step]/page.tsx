import { OnboardingScreen } from "@/components/auth/auth-screens";
const allowed = ["welcome", "business", "categories", "branches", "complete"] as const;
export default async function OnboardingPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  const selected = allowed.includes(step as (typeof allowed)[number]) ? step as (typeof allowed)[number] : "welcome";
  return <OnboardingScreen step={selected} />;
}
