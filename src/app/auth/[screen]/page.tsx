import { AuthScreen } from "@/components/auth/auth-screens";
const allowed = ["register", "verify-email", "login", "forgot-password", "reset-password"] as const;
type PageProps = { params: Promise<{ screen: string }>; searchParams: Promise<{ email?: string | string[] }> };
export default async function AccountPage({ params, searchParams }: PageProps) {
  const [{ screen }, query] = await Promise.all([params, searchParams]);
  const selected = allowed.includes(screen as (typeof allowed)[number]) ? screen as (typeof allowed)[number] : "login";
  const email = typeof query.email === "string" ? query.email : "";
  return <AuthScreen screen={selected} initialEmail={email} />;
}
