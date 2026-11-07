import { AuthScreen } from "@/components/auth/auth-screens";
const allowed = ["register", "verify-email", "login", "forgot-password", "reset-password"] as const;
export default async function AccountPage({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  const selected = allowed.includes(screen as (typeof allowed)[number]) ? screen as (typeof allowed)[number] : "login";
  return <AuthScreen screen={selected} />;
}
