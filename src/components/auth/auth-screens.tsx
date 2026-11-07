"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, ChevronRight, ShieldCheck, Sparkles } from "lucide-react";

const categories = ["Retail & general merchandise", "Food, grocery & beverages", "Fashion & apparel", "Electronics & gadgets", "Health & beauty", "Pharmacy", "Wholesale & distribution", "Hardware & building materials", "Other"];
const fieldClass = "mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
const labelClass = "block text-sm font-medium text-slate-700";

function Frame({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-[var(--background)] px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)] lg:gap-10 lg:px-10 lg:py-10">
    <section className="mx-auto flex w-full max-w-xl flex-col justify-between lg:py-5">
      <Link href="/" className="inline-flex w-fit items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[var(--brand)] text-lg font-bold text-white">E</span><span><b className="block">EDSEC</b><small className="text-[var(--muted)]">Sales Management</small></span></Link>
      <div className="py-12 lg:py-20">{children}</div><p className="text-xs text-[var(--muted)]">© {new Date().getFullYear()} EDSEC · Innovate. Educate. Elevate.</p>
    </section>
    <aside className="relative hidden overflow-hidden rounded-[2rem] bg-[#102d66] p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-24 -top-24 size-96 rounded-full border border-white/10"/><div className="relative"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-blue-100"><Sparkles size={14}/> One workspace. Better decisions.</span><h2 className="mt-10 max-w-lg text-4xl font-semibold leading-tight xl:text-5xl">Bring every part of your business into focus.</h2><p className="mt-5 max-w-md text-base leading-7 text-blue-100/80">Organise products, teams, branches and daily sales in one clear workspace.</p></div>
      <div className="relative space-y-3">{["Know what is happening across your business","Keep your teams and branches aligned","Make confident decisions with clear records"].map((item) => <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] p-4 text-sm"><span className="grid size-7 place-items-center rounded-full bg-emerald-400/20 text-emerald-200"><Check size={15}/></span>{item}</div>)}</div>
      <p className="relative text-xs text-blue-100/60">EDSEC · BUSINESS MANAGEMENT</p>
    </aside>
  </main>;
}

function Field({ label, type = "text", placeholder, autoComplete, value, onChange, name, minLength, pattern, inputMode, required = true }: {
  label: string; type?: string; placeholder?: string; autoComplete?: string; value?: string;
  onChange?: (value: string) => void; name?: string; minLength?: number; pattern?: string;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  required?: boolean;
}) {
  return <label className={labelClass}>{label}<input className={fieldClass} type={type} placeholder={placeholder} autoComplete={autoComplete} value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} name={name} minLength={minLength} pattern={pattern} inputMode={inputMode} required={required}/></label>;
}
function Notice({ children }: { children: React.ReactNode }) {
  return <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">{children}</div>;
}

type AuthName = "register" | "verify-email" | "login" | "forgot-password" | "reset-password";
export function AuthScreen({ screen }: { screen: AuthName }) {
  const [notice, setNotice] = useState("");
  const [otp, setOtp] = useState("");
  const [resendSeconds, setResendSeconds] = useState(30);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const config: Record<AuthName, { title: string; description: string; action: string }> = {
    register: { title: "Create your account", description: "Start setting up your EDSEC workspace.", action: "Continue to email verification" },
    "verify-email": { title: "Verify your email", description: "Enter the six-digit code. This is a UI preview; no code has been sent.", action: "Verify email" },
    login: { title: "Welcome back", description: "Sign in to continue to your business workspace.", action: "Sign in" },
    "forgot-password": { title: "Reset your password", description: "Enter the email address associated with your account.", action: "Send recovery instructions" },
    "reset-password": { title: "Choose a new password", description: "Create and confirm a new password for your account.", action: "Save new password" }
  };
  const isRegister = screen === "register";
  const isLogin = screen === "login";
  const isVerify = screen === "verify-email";
  const isForgot = screen === "forgot-password";
  const needsPassword = isRegister || isLogin || screen === "reset-password";
  useEffect(() => {
    if (!isVerify || resendSeconds === 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [isVerify, resendSeconds]);
  const submitMessage = isRegister ? "Registration details validated in this preview. No account was created." : isVerify ? "Verification preview submitted. No OTP was checked." : isLogin ? "Sign-in preview submitted. Authentication is not connected." : isForgot ? "Recovery preview submitted. No email was sent." : "Password preview submitted. No password was changed.";
  return <Frame><div className="mb-8"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">Account access</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{config[screen].title}</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{config[screen].description}</p></div>
    <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if ((isRegister || screen === "reset-password") && password !== confirmPassword) { setNotice("Your passwords do not match. Please check both fields."); return; } setNotice(submitMessage); }}>
      {isRegister && <Field label="Full name" placeholder="Your full name" autoComplete="name" minLength={2}/>}
      <Field label="Email address" type="email" placeholder="you@company.com" autoComplete="email"/>
      {needsPassword && <Field label={screen === "reset-password" ? "New password" : "Password"} type="password" placeholder="Enter your password" autoComplete={isLogin ? "current-password" : "new-password"} value={password} onChange={setPassword}/>}
      {(isRegister || screen === "reset-password") && <Field label="Confirm password" type="password" placeholder="Re-enter your password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword}/>}
      {isVerify && <label className={labelClass}>Six-digit code<input className={fieldClass + " text-center text-2xl font-semibold tracking-[0.65em]"} inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} required/><span className="mt-2 block text-xs font-normal text-[var(--muted)]">Enter the code shown in your verification email.</span></label>}
      {isRegister && <label className="flex items-start gap-3 text-xs leading-5 text-[var(--muted)]"><input type="checkbox" className="mt-1 size-4 accent-[var(--brand)]" required/>I agree to the terms of service and privacy policy.</label>}
      <button disabled={isVerify && otp.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-50">{config[screen].action}<ArrowRight size={16}/></button>
    </form>
    {notice && <Notice>{notice}</Notice>}
    {isRegister && notice && <Link href="/auth/verify-email" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--brand)]">Continue to verification preview <ArrowRight size={15}/></Link>}
    <div className="mt-7 flex flex-wrap items-center justify-between gap-3 text-sm">
      {isLogin ? <Link className="font-medium text-[var(--brand)]" href="/auth/forgot-password">Forgot password?</Link> : <Link className="inline-flex items-center gap-1 text-[var(--muted)]" href="/auth/login"><ArrowLeft size={14}/> Back to sign in</Link>}
      {isRegister ? <Link className="font-medium text-[var(--brand)]" href="/auth/login">Already registered? Sign in</Link> : isLogin ? <Link className="font-medium text-[var(--brand)]" href="/auth/register">Create an account</Link> : isForgot ? <Link className="font-medium text-[var(--brand)]" href="/auth/reset-password">Continue to reset preview</Link> : isVerify ? <button type="button" disabled={resendSeconds > 0} onClick={() => { setResendSeconds(30); setNotice("Resend preview selected. No email was sent."); }} className="font-medium text-[var(--brand)] disabled:cursor-not-allowed disabled:text-slate-400">{resendSeconds > 0 ? "Resend code in 00:" + String(resendSeconds).padStart(2, "0") : "Resend code"}</button> : null}
    </div>
    <p className="mt-8 flex items-center gap-2 text-xs text-[var(--muted)]"><ShieldCheck size={15}/> Account security will follow the approved authentication contract.</p>
  </Frame>;
}

type OnboardingStep = "welcome" | "business" | "categories" | "branches" | "complete";
export function OnboardingScreen({ step }: { step: OnboardingStep }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [additionalBranches, setAdditionalBranches] = useState<number[]>([]);
  const [notice, setNotice] = useState("");
  const steps = [{ id: "business", label: "Business profile" },{ id: "categories", label: "Categories" },{ id: "branches", label: "Branches" }];
  const current = steps.findIndex((item) => item.id === step);
  const progress = step === "welcome" ? 0 : step === "complete" ? 100 : Math.round(((current + 1) / 3) * 100);
  const titles: Record<OnboardingStep,string> = { welcome: "Let’s set up your workspace", business: "Tell us about your business", categories: "What kind of business do you run?", branches: "Set up your branches", complete: "Your workspace is ready to review" };
  const descriptions: Record<OnboardingStep,string> = { welcome: "A few details will help shape your workspace. Review your choices before connecting an account.", business: "Add your business details. You can review everything before the approved account connection is enabled.", categories: "Choose at least one category that describes your business. The final category list and IDs will come from the approved categories service.", branches: "Set up your main branch and add any additional locations. Branch codes help identify each location.", complete: "You have completed the onboarding preview. Nothing has been saved to a server." };
  const next = step === "welcome" ? "/onboarding/business" : step === "business" ? "/onboarding/categories" : step === "categories" ? "/onboarding/branches" : "/onboarding/complete";
  const toggle = (value: string) => setSelected((items) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
  const stepNumber = current + 1;
  const addBranch = () => setAdditionalBranches((items) => items.length >= 20 ? items : [...items, items.length ? Math.max(...items) + 1 : 1]);
  const removeBranch = () => setAdditionalBranches((items) => items.slice(0, -1));
  const goNext = () => {
    if (step === "categories" && selected.length === 0) { setNotice("Select at least one business category to continue, or choose Skip for now."); return; }
    setNotice("Step completed locally. No business or branch data was saved.");
    window.location.href = next;
  };
  return <Frame><div className="mb-7 flex items-center justify-between"><Link href="/auth/register" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)]"><ArrowLeft size={15}/> Exit setup</Link><span className="text-xs font-medium text-[var(--muted)]">Preview setup</span></div>
    <div className="mb-8"><div className="mb-3 flex justify-between text-xs text-[var(--muted)]"><span>{step === "welcome" || step === "complete" ? "Getting started" : "Step " + stepNumber + " of 3"}</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[var(--brand)] transition-all" style={{ width: progress + "%" }}/></div></div>
    <div className="mb-8"><span className="mb-4 grid size-12 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]"><Building2 size={22}/></span><h1 className="text-3xl font-semibold tracking-tight">{titles[step]}</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{descriptions[step]}</p></div>
    {step === "welcome" && <div className="space-y-3">{["Business details","Categories and services","Branches and locations"].map((item,i) => <div key={item} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white p-4"><span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-sm font-semibold">{i+1}</span><span className="text-sm font-medium">{item}</span><ChevronRight className="ml-auto text-slate-400" size={17}/></div>)}</div>}
    {step === "business" && <form id="onboarding-form" className="space-y-4" onSubmit={(event) => { event.preventDefault(); window.location.href = next; }}><Field label="Business name" placeholder="e.g. Covenant Stores" minLength={2}/><Field label="Business email" type="email" placeholder="business@example.com"/><Field label="Business phone" type="tel" placeholder="+234 800 000 0000" autoComplete="tel"/><Field label="Business address" placeholder="Street, city, state"/><div className="grid gap-4 sm:grid-cols-2"><Field label="Currency code" placeholder="NGN" defaultValue={undefined} pattern="[A-Z]{3}"/><Field label="Time zone" placeholder="Africa/Lagos"/></div></form>}
    {step === "categories" && <div className="grid gap-3 sm:grid-cols-2">{categories.map((category) => { const active = selected.includes(category); return <button type="button" key={category} aria-pressed={active} onClick={() => toggle(category)} className={"flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition " + (active ? "border-blue-400 bg-blue-50 text-[var(--brand)]" : "border-[var(--border)] bg-white text-slate-700 hover:border-slate-300")}>{category}{active && <Check size={17}/>}</button>; })}</div>}
    {step === "branches" && <form id="onboarding-form" className="space-y-5" onSubmit={(event) => { event.preventDefault(); window.location.href = next; }}><div className="rounded-2xl border border-[var(--border)] bg-white p-5"><div className="mb-4 flex items-center justify-between"><div><p className="font-semibold">Main branch</p><p className="mt-1 text-xs text-[var(--muted)]">Your primary business location</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">Primary</span></div><div className="space-y-4"><Field label="Branch name" placeholder="Main branch"/><Field label="Branch code" placeholder="MAIN" pattern="[A-Za-z0-9_-]{2,20}"/><Field label="Branch address" placeholder="Street, city, state"/></div></div>
      {additionalBranches.map((id,index) => <div key={id} className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-5"><div className="flex items-center justify-between"><p className="font-semibold">Additional branch {index + 1}</p><button type="button" onClick={() => setAdditionalBranches((items) => items.filter((item) => item !== id))} className="text-xs font-semibold text-rose-600">Remove</button></div><Field label="Branch name" placeholder="e.g. Rumuokoro outlet"/><Field label="Branch code" placeholder="RUMU" pattern="[A-Za-z0-9_-]{2,20}"/><Field label="Branch address" placeholder="Street, city, state"/></div>)}
      <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white p-4"><div><p className="text-sm font-medium">Additional branches</p><p className="mt-1 text-xs text-[var(--muted)]">{additionalBranches.length} added · Up to 20 additional locations in this preview</p></div><div className="flex items-center gap-3"><button type="button" aria-label="Remove last branch" disabled={additionalBranches.length === 0} onClick={removeBranch} className="grid size-8 place-items-center rounded-lg border disabled:opacity-40">−</button><span className="min-w-4 text-center text-sm tabular-nums">{additionalBranches.length}</span><button type="button" aria-label="Add branch" disabled={additionalBranches.length >= 20} onClick={addBranch} className="grid size-8 place-items-center rounded-lg border disabled:opacity-40">+</button></div></div></form>}
    {step === "complete" && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"><span className="grid size-11 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={22}/></span><h2 className="mt-4 text-lg font-semibold text-emerald-950">Setup preview complete</h2><p className="mt-2 text-sm leading-6 text-emerald-800">Your choices have not been submitted or stored. Connect this flow after the approved onboarding contract and account configuration are ready.</p><Link href="/auth/login" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)]">Continue to sign in <ArrowRight size={16}/></Link></div>}
    {notice && <Notice>{notice}</Notice>}
    {step !== "complete" && <div className="mt-8 flex items-center justify-between gap-3"><div>{(step === "categories" || step === "branches") && <button type="button" onClick={() => { window.location.href = step === "categories" ? "/onboarding/branches" : "/onboarding/complete"; }} className="text-sm font-medium text-[var(--muted)]">Skip for now</button>}</div><button type={step === "business" || step === "branches" ? "submit" : "button"} form={step === "business" || step === "branches" ? "onboarding-form" : undefined} onClick={step === "business" || step === "branches" ? undefined : goNext} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-strong)]">{step === "welcome" ? "Start setup" : step === "branches" ? "Finish setup" : "Save and continue"}<ArrowRight size={16}/></button></div>}
    <p className="mt-7 flex items-center gap-2 text-xs text-[var(--muted)]"><ShieldCheck size={14}/> This setup is presentation-only and is not connected to a backend.</p>
  </Frame>;
}
