"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { navigationItems, getNavigationTitle } from "@/lib/nav";
import { Can, PermissionProvider } from "@/lib/permissions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { api } from "@/lib/api/client";

const mobileItems = navigationItems.filter((item) => ["/", "/products", "/products/import", "/inventory"].includes(item.href));
function isActive(pathname: string, href: string) { return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`); }

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const isAccountFlow = pathname.startsWith("/auth/") || pathname.startsWith("/onboarding/");
  useEffect(() => {
    if (isAccountFlow) return;
    let active = true;
    async function load() {
      try {
        const { data } = await getSupabaseBrowserClient().auth.getSession();
        if (!data.session) { if (active) { setAuthenticated(false); setChecking(false); } return; }
        const me = await api.me();
        const selectedId = window.localStorage.getItem("edsec.activeBusinessId");
        const membership = me.memberships.find((item) => item.business_id === selectedId) ?? me.memberships[0];
        if (active) { setAuthenticated(true); setPermissions(membership?.permissions ?? []); setChecking(false); }
      } catch { if (active) { setAuthenticated(false); setChecking(false); } }
    }
    void load();
    return () => { active = false; };
  }, [isAccountFlow, pathname]);
  useEffect(() => {
    if (!isAccountFlow && !checking && !authenticated && pathname !== "/") router.replace("/auth/login");
  }, [isAccountFlow, checking, authenticated, pathname, router]);
  if (isAccountFlow) return <>{children}</>;
  if (!checking && !authenticated && pathname !== "/") return null;
  const pageTitle = getNavigationTitle(pathname);
  async function signOut() {
    try { await getSupabaseBrowserClient().auth.signOut(); } finally {
      window.localStorage.removeItem("edsec.activeBusinessId");
      setAuthenticated(false); setPermissions([]); router.replace("/auth/login");
    }
  }
  return (
    <PermissionProvider permissions={permissions}>
      <div className="min-h-screen bg-[var(--background)] lg:flex">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--border)] bg-white lg:flex">
          <div className="flex h-20 items-center gap-3 border-b border-[var(--border)] px-6"><div className="grid size-10 place-items-center rounded-xl bg-[var(--brand)] text-lg font-bold text-white">E</div><div><p className="font-semibold tracking-tight">EDSEC</p><p className="text-xs text-[var(--muted)]">Sales Management</p></div></div>
          <div className="px-4 pt-6"><p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Workspace</p><nav aria-label="Main navigation" className="mt-3 space-y-1">
            {navigationItems.map(({ label, href, icon: Icon, permission }) => { const active = isActive(pathname, href); const link = <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}><Icon size={18} aria-hidden="true"/>{label}</Link>; return permission ? <Can key={href} permission={permission}>{link}</Can> : link; })}
          </nav></div>
          <div className="mt-auto border-t border-[var(--border)] p-4"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-700">Connected workspace</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Business data and access are loaded from the EDSEC API.</p></div></div>
        </aside>
        <div className="min-w-0 flex-1 lg:pl-64">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--border)] bg-white/95 px-5 backdrop-blur sm:px-8">
            <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-[var(--brand)] text-sm font-bold text-white lg:hidden">E</div><div><p className="text-xs text-[var(--muted)] lg:hidden">EDSEC workspace</p><h1 className="text-sm font-semibold">{pageTitle}</h1></div></div>
            <div className="flex items-center gap-3">{checking ? <span className="text-xs text-[var(--muted)]">Checking session…</span> : authenticated ? <button type="button" onClick={signOut} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Sign out</button> : <Link href="/auth/login" className="rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white">Sign in</Link>}</div>
          </header>
          <main className="mx-auto w-full max-w-7xl px-5 py-7 pb-28 sm:px-8 lg:px-10 lg:py-9">{children}</main>
        </div>
        <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[var(--border)] bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur lg:hidden">
          {mobileItems.map(({ label, href, icon: Icon, permission }) => { const active = isActive(pathname, href); const link = <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium ${active ? "text-[var(--brand)]" : "text-slate-500"}`}><Icon size={19} aria-hidden="true"/><span>{label === "Point of sale" ? "POS" : label}</span></Link>; return permission ? <Can key={href} permission={permission}>{link}</Can> : link; })}
        </nav>
      </div>
    </PermissionProvider>
  );
}
