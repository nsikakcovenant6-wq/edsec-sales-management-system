import Link from "next/link";
import { ArrowUpRight, Boxes, ChartNoAxesCombined, Package, ShoppingCart, Users } from "lucide-react";

const modules = [
  { title: "Point of sale", description: "A focused workspace for recording in-store sales.", href: "/pos", icon: ShoppingCart, status: "UI preview" },
  { title: "Products", description: "A home for the product catalogue and product details.", href: "/products", icon: Package, status: "UI preview" },
  { title: "Inventory", description: "A workspace for stock and inventory workflows.", href: "/inventory", icon: Boxes, status: "UI preview" },
  { title: "Customers", description: "A workspace for customer records and account history.", href: "/customers", icon: Users, status: "Planned" },
  { title: "Reports", description: "A workspace for business reporting and analytics.", href: "/reports", icon: ChartNoAxesCombined, status: "Planned" },
];

export default function HomePage() {
  return (
    <div className="space-y-9">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-2xl"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">Business workspace</p><h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Run your business with clarity.</h2><p className="mt-3 max-w-xl text-base leading-7 text-[var(--muted)]">A connected workspace for sales, inventory and everyday business operations. This preview contains no live business data.</p></div>
        <span className="inline-flex items-center gap-2 self-start rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium text-[var(--muted)]">Foundation preview <ArrowUpRight size={14} /></span>
      </section>
      <section aria-labelledby="modules-heading"><div className="mb-5"><h3 id="modules-heading" className="text-lg font-semibold">Workspace modules</h3><p className="mt-1 text-sm text-[var(--muted)]">Explore the frontend areas currently being prepared.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{modules.map(({ title, description, href, icon: Icon, status }) => <Link key={href} href={href} className="group rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm shadow-slate-950/[0.02] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]"><Icon size={19} /></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{status}</span></div><h4 className="mt-5 flex items-center gap-2 font-semibold">{title}<ArrowUpRight size={15} className="text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></h4><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p></Link>)}</div></section>
      <footer className="border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)]">EDSEC ICT Institute · Innovate. Educate. Elevate.</footer>
    </div>
  );
}
