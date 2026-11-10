import Link from "next/link";
import { ArrowLeft, CircleHelp } from "lucide-react";

export default function NotFound() {
  return (
    <section className="flex min-h-[55vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]"><CircleHelp size={25} aria-hidden="true" /></div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">404 · Page not found</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">We couldn’t find that page.</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">The address may be incorrect, or the page may not be part of this workspace preview.</p>
      <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-strong)]"><ArrowLeft size={15} />Back to overview</Link>
    </section>
  );
}
