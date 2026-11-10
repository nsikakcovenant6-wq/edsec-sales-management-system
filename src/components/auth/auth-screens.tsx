"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOnboardingDraft } from "@/components/auth/onboarding-draft";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { api, ApiError, type Category, type Membership, type Branch } from "@/lib/api/client";
import { getOnboardingRoute, canCreateAdditionalBranch } from "@/lib/onboarding/flow";
import { saveBusinessProfile, saveBusinessCategories, saveBranchSetup, saveStoreConfiguration } from "@/lib/onboarding/actions";
import { useEffect, useId, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, ChevronRight, Sparkles } from "lucide-react";

const fieldClass = "mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
const labelClass = "block text-sm font-medium text-slate-700";

function Frame({ children }: { children: ReactNode }) {
  return <main className="min-h-screen min-w-0 bg-[var(--background)] px-4 py-6 sm:px-6 sm:py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)] lg:gap-10 lg:px-10 lg:py-10">
    <section className="mx-auto flex w-full min-w-0 max-w-xl flex-col justify-between lg:py-5">
      <a href="#page-content" className="sr-only rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[var(--brand)] focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50">Skip to main content</a>
      <Link href="/" className="inline-flex w-fit items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[var(--brand)] text-lg font-bold text-white">E</span><span><b className="block">EDSEC</b><small className="text-[var(--muted)]">Sales Management</small></span></Link>
      <div id="page-content" tabIndex={-1} className="min-w-0 py-10 sm:py-12 lg:py-20">{children}</div><p className="text-xs text-[var(--muted)]">© {new Date().getFullYear()} EDSEC · Innovate. Educate. Elevate.</p>
    </section>
    <aside className="relative hidden overflow-hidden rounded-[2rem] bg-[#102d66] p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-24 -top-24 size-96 rounded-full border border-white/10"/><div className="relative"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-blue-100"><Sparkles size={14}/> One workspace. Better decisions.</span><h2 className="mt-10 max-w-lg text-4xl font-semibold leading-tight xl:text-5xl">Bring every part of your business into focus.</h2><p className="mt-5 max-w-md text-base leading-7 text-blue-100/80">Organise products, teams, branches and daily sales in one clear workspace.</p></div>
      <div className="relative space-y-3">{["Know what is happening across your business","Keep your teams and branches aligned","Make confident decisions with clear records"].map((item) => <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] p-4 text-sm"><span className="grid size-7 place-items-center rounded-full bg-emerald-400/20 text-emerald-200"><Check size={15}/></span>{item}</div>)}</div>
      <p className="relative text-xs text-blue-100/60">EDSEC · BUSINESS MANAGEMENT</p>
    </aside>
  </main>;
}

function Field({ label, type = "text", placeholder, autoComplete, value, defaultValue, onChange, name, minLength, maxLength, pattern, inputMode, required = true, invalid = false, describedBy }: {
  label: string; type?: string; placeholder?: string; autoComplete?: string; value?: string; defaultValue?: string;
  onChange?: (value: string) => void; name?: string; minLength?: number; maxLength?: number; pattern?: string;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  required?: boolean; invalid?: boolean; describedBy?: string;
}) {
  const id = useId();
  return <div><label className={labelClass} htmlFor={id}>{label}{required && <span className="ml-1 text-rose-600" aria-label="required">*</span>}</label><input id={id} aria-invalid={invalid || undefined} aria-describedby={describedBy} className={fieldClass + (invalid ? " border-rose-500 focus:border-rose-500 focus:ring-rose-100" : "")} type={type} placeholder={placeholder} autoComplete={autoComplete} value={value} defaultValue={defaultValue} onChange={onChange ? (event) => onChange(event.target.value) : undefined} name={name} minLength={minLength} maxLength={maxLength} pattern={pattern} inputMode={inputMode} required={required}/></div>;
}
function Notice({ children }: { children: React.ReactNode }) {
  return <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">{children}</div>;
}

type AuthName = "register" | "verify-email" | "login" | "forgot-password" | "reset-password";
export function AuthScreen({ screen }: { screen: AuthName }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [resendSeconds, setResendSeconds] = useState(30);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = screen === "register";
  const isLogin = screen === "login";
  const isVerify = screen === "verify-email";
  const isForgot = screen === "forgot-password";
  const needsPassword = isRegister || isLogin || screen === "reset-password";
  const confirmMismatch = (isRegister || screen === "reset-password") && confirmPassword.length > 0 && password !== confirmPassword;
  const config: Record<AuthName, { title: string; description: string; action: string }> = {
    register: { title: "Create your account", description: "Create your EDSEC account to start a business workspace.", action: "Create account" },
    "verify-email": { title: "Verify your email", description: "Enter the six-digit code sent to your email address.", action: "Verify email" },
    login: { title: "Welcome back", description: "Sign in to continue to your business workspace.", action: "Sign in" },
    "forgot-password": { title: "Reset your password", description: "We’ll send password recovery instructions to your email.", action: "Send recovery instructions" },
    "reset-password": { title: "Choose a new password", description: "Create and confirm a new password for your account.", action: "Save new password" }
  };
  useEffect(() => {
    if (!isVerify || resendSeconds === 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [isVerify, resendSeconds]);

  async function routeAfterAuthentication() {
    const me = await api.me();
    const preferredId = window.localStorage.getItem("edsec.activeBusinessId");
    const membership = me.memberships.find((item) => item.business_id === preferredId) ?? me.memberships[0];
    if (!membership) { router.replace("/onboarding/welcome"); return; }
    window.localStorage.setItem("edsec.activeBusinessId", membership.business_id);
    router.replace(membership.onboarding.status === "completed" ? "/" : getOnboardingRoute(membership.onboarding.current_step));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    if ((isRegister || screen === "reset-password") && password !== confirmPassword) {
      setNotice("Your passwords do not match. Please check both fields."); return;
    }
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() } } });
        if (error) throw error;
        if (data.session) { await routeAfterAuthentication(); return; }
        router.push(`/auth/verify-email?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      if (isVerify) {
        const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp, type: "signup" });
        if (error) throw error;
        await routeAfterAuthentication(); return;
      }
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await routeAfterAuthentication(); return;
      }
      if (isForgot) {
        const redirectTo = new URL("/auth/reset-password", window.location.origin).toString();
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        if (error) throw error;
        setNotice("If the account exists, Supabase will send password recovery instructions. Check your inbox.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setNotice("Your password has been updated. Please sign in with your new password.");
      router.replace("/auth/login");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Authentication could not be completed. Please try again.");
    } finally { setBusy(false); }
  }

  async function resendCode() {
    if (resendSeconds > 0 || !email.trim()) return;
    setBusy(true); setNotice("");
    try {
      const { error } = await getSupabaseBrowserClient().auth.resend({ type: "signup", email: email.trim() });
      if (error) throw error;
      setResendSeconds(30);
      setNotice("A new verification code has been requested.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "A new code could not be requested."); }
    finally { setBusy(false); }
  }

  return <Frame><div className="mb-8"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">Account access</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{config[screen].title}</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{config[screen].description}</p></div>
    <form className="space-y-5" onSubmit={submit}>
      {isRegister && <Field label="Full name" placeholder="Your full name" autoComplete="name" minLength={2} value={fullName} onChange={setFullName}/>}
      <Field label="Email address" type="email" placeholder="you@company.com" autoComplete="email" value={email} onChange={setEmail}/>
      {needsPassword && <Field label={screen === "reset-password" ? "New password" : "Password"} type="password" placeholder="Enter your password" autoComplete={isLogin ? "current-password" : "new-password"} value={password} onChange={(value) => { setPassword(value); setNotice(""); }}/>}
      {(isRegister || screen === "reset-password") && <div><Field label="Confirm password" type="password" placeholder="Re-enter your password" autoComplete="new-password" value={confirmPassword} onChange={(value) => { setConfirmPassword(value); setNotice(""); }} invalid={confirmMismatch} describedBy="password-match-help"/><p id="password-match-help" aria-live="polite" className={"mt-2 text-xs " + (confirmMismatch ? "text-rose-700" : "text-[var(--muted)]")}>{confirmPassword.length === 0 ? "Enter the same password again to confirm it." : confirmMismatch ? "The passwords do not match yet." : "Passwords match."}</p></div>}
      {isVerify && <label className={labelClass}>Six-digit code<input className={fieldClass + " text-center text-2xl font-semibold tracking-[0.65em]"} aria-label="Six-digit email verification code" aria-describedby="otp-help" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={otp} onChange={(event) => { setOtp(event.target.value.replace(/\D/g, "").slice(0, 6)); setNotice(""); }} required/><span id="otp-help" className="mt-2 block text-xs font-normal text-[var(--muted)]">Enter the code shown in your verification email.</span></label>}
      {isRegister && <label className="flex items-start gap-3 text-xs leading-5 text-[var(--muted)]"><input type="checkbox" className="mt-1 size-4 accent-[var(--brand)]" required/>I agree to the terms of service and privacy policy.</label>}
      <button disabled={busy || (isVerify && otp.length !== 6)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Please wait…" : config[screen].action}<ArrowRight size={16}/></button>
    </form>
    {notice && <div role="status" className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">{notice}</div>}
    <div className="mt-7 flex flex-wrap items-center justify-between gap-3 text-sm">
      {isLogin ? <Link className="font-medium text-[var(--brand)]" href="/auth/forgot-password">Forgot password?</Link> : <Link className="inline-flex items-center gap-1 text-[var(--muted)]" href="/auth/login"><ArrowLeft size={14}/> Back to sign in</Link>}
      {isRegister ? <Link className="font-medium text-[var(--brand)]" href="/auth/login">Already registered? Sign in</Link> : isLogin ? <Link className="font-medium text-[var(--brand)]" href="/auth/register">Create an account</Link> : isForgot ? <Link className="font-medium text-[var(--brand)]" href="/auth/login">Return to sign in</Link> : isVerify ? <button type="button" disabled={busy || resendSeconds > 0 || !email.trim()} onClick={resendCode} className="font-medium text-[var(--brand)] disabled:cursor-not-allowed disabled:text-slate-400">{resendSeconds > 0 ? "Resend code in 00:" + String(resendSeconds).padStart(2, "0") : "Resend code"}</button> : null}
    </div>
    <p className="mt-8 flex items-center gap-2 text-xs text-[var(--muted)]"><ShieldCheck size={15}/> Account security is enforced by the connected Supabase project.</p>
  </Frame>;
}

type OnboardingStep = "welcome" | "business" | "categories" | "branches" | "store-configuration" | "complete";
export function OnboardingScreen({ step }: { step: OnboardingStep }) {
  const router = useRouter();
  const { draft, updateBusiness, toggleCategory, addBranch, updateBranch, removeBranch } = useOnboardingDraft();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<Category[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [serverBranches, setServerBranches] = useState<Branch[]>([]);
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatRate, setVatRate] = useState("750");
  const [taxMode, setTaxMode] = useState<"inclusive" | "exclusive">("exclusive");
  const selected = draft.categories;
  const additionalBranches = draft.branches;
  const branchAllowed = canCreateAdditionalBranch(membership);
  const steps = [{ id: "business", label: "Business profile" },{ id: "categories", label: "Categories" },{ id: "branches", label: "Branches" },{ id: "store-configuration", label: "Store configuration" }];
  const current = steps.findIndex((item) => item.id === step);
  const progress = step === "welcome" ? 0 : step === "complete" ? 100 : Math.round(((current + 1) / 4) * 100);
  const titles: Record<OnboardingStep,string> = { welcome: "Let’s set up your workspace", business: "Tell us about your business", categories: "What kind of business do you run?", branches: "Set up your branches", "store-configuration": "Store configuration", complete: "Your onboarding progress" };
  const descriptions: Record<OnboardingStep,string> = { welcome: "Your setup is saved to your EDSEC account and can be resumed later.", business: "Create your business workspace. The backend provisions its Main Branch automatically.", categories: "Choose at least one category from the live EDSEC catalogue.", branches: "Your Main Branch is already provisioned. Add other locations only when your plan includes multi-branch management.", "store-configuration": "Configure tax settings for this business. These values are saved to your business profile.", complete: "Your onboarding state is loaded from the backend." };
  const next = step === "welcome" ? "/onboarding/business" : step === "business" ? "/onboarding/categories" : step === "categories" ? "/onboarding/branches" : "/onboarding/store-configuration";
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [categories, me] = await Promise.all([api.categories(), api.me()]);
        if (!active) return;
        setCatalog(categories);
        const preferred = window.localStorage.getItem("edsec.activeBusinessId");
        const selectedMember = me.memberships.find((item) => item.business_id === preferred) ?? me.memberships[0] ?? null;
        if (!selectedMember) {
          setMembership(null); setBusinessId(null);
          if (step !== "welcome" && step !== "business") router.replace("/onboarding/welcome");
          return;
        }
        setMembership(selectedMember); setBusinessId(selectedMember.business_id);
        window.localStorage.setItem("edsec.activeBusinessId", selectedMember.business_id);
        const [business, onboarding, branchPage] = await Promise.all([
          api.getBusiness(selectedMember.business_id),
          api.getOnboarding(selectedMember.business_id),
          api.listBranches(selectedMember.business_id),
        ]);
        if (!active) return;
        updateBusiness("name", business.name);
        updateBusiness("email", business.email ?? "");
        updateBusiness("phone", business.phone ?? "");
        updateBusiness("address", business.address ?? "");
        updateBusiness("currency", business.currency_code);
        updateBusiness("timezone", business.timezone);
        setVatEnabled(business.vat_enabled); setVatRate(String(business.vat_rate_bps)); setTaxMode(business.tax_mode);
        setServerBranches(branchPage.items);
        if (step === "welcome") router.replace(getOnboardingRoute(onboarding.current_step));
        if (step === "complete" && onboarding.status !== "completed") router.replace(getOnboardingRoute(onboarding.current_step));
      } catch (error) {
        if (error instanceof ApiError && error.code === "UNAUTHENTICATED") router.replace("/auth/login");
        else setNotice(error instanceof Error ? error.message : "Unable to load your saved onboarding details.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  // Route step changes should not re-run the bootstrap or overwrite unsaved edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAction(action: () => Promise<void>) {
    setBusy(true); setNotice("");
    try { await action(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Your changes could not be saved. Please try again."); }
    finally { setBusy(false); }
  }
  async function submitBusiness(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.business.name.trim().length < 2) { setNotice("Enter a business name with at least two non-space characters."); return; }
    await runAction(async () => {
      const result = await saveBusinessProfile({
        name: draft.business.name.trim(), email: draft.business.email.trim() || null,
        phone: draft.business.phone.trim() || null, address: draft.business.address.trim() || null,
        currency_code: draft.business.currency, timezone: draft.business.timezone,
      }, businessId);
      setBusinessId(result.businessId); setMembership(result.membership); window.localStorage.setItem("edsec.activeBusinessId", result.businessId);
      router.push("/onboarding/categories");
    });
  }
  async function submitCategories() {
    if (!businessId) { setNotice("Create or select a business before choosing categories."); return; }
    if (selected.length === 0) { setNotice("Select at least one business category before continuing."); return; }
    await runAction(async () => { await saveBusinessCategories(businessId, selected); router.push("/onboarding/branches"); });
  }
  async function submitBranches() {
    if (!businessId) return;
    await runAction(async () => {
      const updated = await saveBranchSetup(businessId, membership, additionalBranches);
      setServerBranches(updated.items); router.push("/onboarding/store-configuration");
    });
  }
  async function submitStoreConfiguration() {
    if (!businessId) return;
    const parsedVatRate = Number(vatRate);
    if (!Number.isInteger(parsedVatRate) || parsedVatRate < 0 || parsedVatRate > 10000) { setNotice("Enter a VAT rate between 0 and 10000 basis points."); return; }
    await runAction(async () => {
      await saveStoreConfiguration(businessId, { vat_enabled: vatEnabled, vat_rate_bps: parsedVatRate, tax_mode: taxMode });
      router.push("/onboarding/complete");
    });
  }
  async function toggleBranch(branch: Branch) {
    if (!businessId) return;
    await runAction(async () => {
      const updated = await api.updateBranch(businessId, branch.id, { is_active: !branch.is_active });
      setServerBranches((items) => items.map((item) => item.id === updated.id ? updated : item));
    });
  }

  return <Frame>
    <div className="mb-7 flex items-center justify-between"><Link href="/auth/login" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)]"><ArrowLeft size={15}/> Sign out / exit</Link><span className="text-xs font-medium text-[var(--muted)]">{membership ? "Saved workspace setup" : "New workspace setup"}</span></div>
    <div className="mb-8"><div className="mb-3 flex justify-between text-xs text-[var(--muted)]"><span>{step === "welcome" ? "Getting started" : step === "complete" ? "Onboarding status" : "Step " + (current + 1) + " of 4"}</span><span>{progress}%</span></div><div role="progressbar" aria-label="Onboarding progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[var(--brand)] transition-all" style={{ width: progress + "%" }}/></div></div>
    <div className="mb-8"><span className="mb-4 grid size-12 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]"><Building2 size={22}/></span><h1 className="text-3xl font-semibold tracking-tight">{titles[step]}</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{descriptions[step]}</p></div>
    {loading && <div role="status" className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--muted)]">Loading your saved workspace and onboarding progress…</div>}
    {!loading && step === "welcome" && <div className="space-y-3">{["Business details","Categories and services","Branches and locations","Store configuration"].map((item,i) => <div key={item} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white p-4"><span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-sm font-semibold">{i+1}</span><span className="text-sm font-medium">{item}</span><ChevronRight className="ml-auto text-slate-400" size={17}/></div>)}</div>}
    {!loading && step === "business" && <form id="onboarding-form" className="space-y-4" onSubmit={submitBusiness}><Field label="Business name" placeholder="e.g. Covenant Stores" minLength={2} maxLength={160} value={draft.business.name} onChange={(value) => updateBusiness("name", value)}/><Field label="Business email" type="email" placeholder="business@example.com" required={false} value={draft.business.email} onChange={(value) => updateBusiness("email", value)}/><Field label="Business phone" type="tel" placeholder="+234 800 000 0000" autoComplete="tel" required={false} value={draft.business.phone} onChange={(value) => updateBusiness("phone", value)}/><Field label="Business address" placeholder="Street, city, state" required={false} value={draft.business.address} onChange={(value) => updateBusiness("address", value)}/><div className="grid gap-4 sm:grid-cols-2"><Field label="Currency code" placeholder="NGN" value={draft.business.currency} onChange={(value) => updateBusiness("currency", value.toUpperCase().slice(0,3))} pattern="[A-Z]{3}"/><Field label="Time zone" placeholder="Africa/Lagos" value={draft.business.timezone} onChange={(value) => updateBusiness("timezone", value)}/></div><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : membership ? "Save and continue" : "Create business and continue"}<ArrowRight size={16}/></button></form>}
    {!loading && step === "categories" && <div><p className="mb-3 text-xs text-[var(--muted)]" aria-live="polite">{selected.length} selected</p>{catalog.length === 0 ? <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--muted)]">No active categories are available yet. Ask an administrator to publish the category catalogue.</div> : <div role="group" aria-label="Business categories" className="grid gap-3 sm:grid-cols-2">{catalog.map((category) => { const active = selected.includes(category.id); return <button type="button" key={category.id} aria-pressed={active} onClick={() => toggleCategory(category.id)} className={"flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition " + (active ? "border-blue-400 bg-blue-50 text-[var(--brand)]" : "border-[var(--border)] bg-white text-slate-700 hover:border-slate-300")}>{category.name}{active && <Check aria-hidden="true" size={17}/>}</button>; })}</div>}</div>}
    {!loading && step === "branches" && <div className="space-y-5">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><p className="text-sm font-semibold text-blue-950">Main Branch is already created</p><p className="mt-1 text-xs leading-5 text-blue-800">The backend provisions exactly one default branch named “Main Branch” with code “MAIN” during business creation. This screen never creates another Main Branch.</p></div>
      <div className="space-y-2">{serverBranches.map((branch) => <div key={branch.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white p-3"><div><p className="text-sm font-semibold">{branch.name} {branch.is_default && <span className="ml-1 text-xs font-normal text-[var(--muted)]">(default)</span>}</p><p className="text-xs text-[var(--muted)]">{branch.code} · {branch.is_active ? "Active" : "Inactive"}</p></div>{!branch.is_default && <button type="button" disabled={!branchAllowed || busy} onClick={() => void toggleBranch(branch)} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40">{branch.is_active ? "Deactivate" : "Activate"}</button>}</div>)}</div>
      {!branchAllowed && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Additional branch creation and management are not included in the current plan or permissions. Your Main Branch remains available; you can continue without adding locations.</div>}
      {branchAllowed && <><div className="space-y-4">{additionalBranches.map((branch,index) => <fieldset key={branch.id} className="min-w-0 space-y-4 rounded-2xl border border-[var(--border)] bg-white p-4"><legend className="sr-only">Additional branch {index+1}</legend><div className="flex items-center justify-between"><p className="font-semibold">New branch {index+1}</p><button type="button" onClick={() => removeBranch(branch.id)} className="min-h-10 rounded-lg px-3 text-xs font-semibold text-rose-700">Remove</button></div><Field label="Branch name" value={branch.name} onChange={(value)=>updateBranch(branch.id,"name",value)}/><Field label="Branch code" value={branch.code} onChange={(value)=>updateBranch(branch.id,"code",value.toUpperCase())}/><Field label="Branch address" required={false} value={branch.address} onChange={(value)=>updateBranch(branch.id,"address",value)}/></fieldset>)}</div><button type="button" onClick={addBranch} className="rounded-lg border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold">+ Add another branch</button></>}
    </div>}
    {!loading && step === "store-configuration" && <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-5"><label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={vatEnabled} onChange={(event)=>setVatEnabled(event.target.checked)} className="size-4 accent-[var(--brand)]"/> Enable VAT</label><Field label="VAT rate (basis points)" type="number" inputMode="numeric" value={vatRate} onChange={setVatRate} required={vatEnabled}/><label className="block text-sm font-medium">Tax mode<select value={taxMode} onChange={(event)=>setTaxMode(event.target.value as "inclusive"|"exclusive")} className={fieldClass}><option value="exclusive">Exclusive</option><option value="inclusive">Inclusive</option></select></label><p className="text-xs leading-5 text-[var(--muted)]">These settings use the backend business profile fields: VAT enabled, VAT rate in basis points and tax mode.</p><button type="button" disabled={busy} onClick={()=>void submitStoreConfiguration()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save settings and finish"}<ArrowRight size={16}/></button></div>}
    {!loading && step === "complete" && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"><span className="grid size-11 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={22}/></span><h2 className="mt-4 text-lg font-semibold text-emerald-950">Onboarding saved</h2><p className="mt-2 text-sm leading-6 text-emerald-900">Your business profile, category selection and store configuration have been saved. Your Main Branch was created once by the backend.</p><p className="mt-3 text-xs text-emerald-800">Business ID: {businessId}</p><Link href="/" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white">Open workspace <ArrowRight size={16}/></Link></div>}
    {notice && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">{notice}</div>}
    {!loading && step !== "complete" && step !== "business" && step !== "store-configuration" && <div className="mt-8 flex items-center justify-between gap-3"><div className="flex items-center gap-4">{step !== "welcome" && <button type="button" onClick={() => router.push(step === "categories" ? "/onboarding/business" : "/onboarding/categories")} className="text-sm font-medium text-[var(--muted)]">Back</button>}{step === "branches" && <button type="button" disabled={busy} onClick={()=>void runAction(async()=>{if(!businessId) return; const updated=await saveBranchSetup(businessId,membership,[]);setServerBranches(updated.items);router.push("/onboarding/store-configuration");})} className="text-sm font-medium text-[var(--muted)]">Skip branch setup</button>}</div><button type="button" disabled={busy} onClick={step === "welcome" ? () => router.push(next) : () => void submitCategories()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : step === "welcome" ? "Start setup" : "Save and continue"}<ArrowRight size={16}/></button></div>}
    {!loading && step === "branches" && <div className="mt-5 flex justify-end"><button type="button" disabled={busy} onClick={()=>void submitBranches()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save branches and continue"}<ArrowRight size={16}/></button></div>}
  </Frame>;
}
