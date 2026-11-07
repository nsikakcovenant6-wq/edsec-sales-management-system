import { ArrowUpRight, Boxes, ChartNoAxesCombined, CreditCard, Package, ShoppingCart, Users } from "lucide-react";

const modules = [
  { title: "Point of sale", description: "Start and manage in-store sales.", icon: ShoppingCart, status: "Foundation" },
  { title: "Products & inventory", description: "Organise products, pricing and stock.", icon: Package, status: "Foundation" },
  { title: "Customers", description: "Keep customer records and activity together.", icon: Users, status: "Planned" },
  { title: "Purchasing", description: "Manage suppliers and incoming stock.", icon: Boxes, status: "Planned" },
  { title: "Reports & analytics", description: "Understand sales and business performance.", icon: ChartNoAxesCombined, status: "Planned" },
  { title: "Payments & billing", description: "Review subscription and payment activity.", icon: CreditCard, status: "Planned" },
];

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-[var(--brand)] text-lg font-bold text-white">E</div><div><p className="font-semibold tracking-tight">EDSEC</p><p className="text-xs text-[var(--muted)]">Sales Management System</p></div></div>
        <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--muted)]">Foundation workspace</span>
      </header>
      <section className="py-12 sm:py-16"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">Business workspace</p><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div className="max-w-2xl"><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Run your business with clarity.</h1><p className="mt-3 max-w-xl text-base leading-7 text-[var(--muted)]">A connected workspace for sales, inventory and everyday business operations. Your business tools will live here.</p></div><button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-2 self-start rounded-lg bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white opacity-60">Workspace setup <ArrowUpRight size={16} /></button></div></section>
      <section aria-labelledby="modules-heading"><div className="mb-5 flex items-center justify-between"><div><h2 id="modules-heading" className="text-lg font-semibold">Your workspace</h2><p className="mt-1 text-sm text-[var(--muted)]">The product modules being established.</p></div><span className="text-xs text-[var(--muted)]">Phase 0</span></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{modules.map(({ title, description, icon: Icon, status }) => <article key={title} className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm shadow-slate-950/[0.02]"><div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]"><Icon size={19} /></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{status}</span></div><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p></article>)}</div></section>
      <footer className="mt-16 border-t border-[var(--border)] py-6 text-xs text-[var(--muted)]">EDSEC ICT Institute · Innovate. Educate. Elevate.</footer>
    </main>
  );
}
