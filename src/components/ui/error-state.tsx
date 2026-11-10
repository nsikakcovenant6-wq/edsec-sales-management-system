import { AlertCircle, RefreshCw } from "lucide-react";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  description = "This screen could not be displayed. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <section role="alert" className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-white px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-700"><AlertCircle size={22} aria-hidden="true" /></div>
      <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p>
      {onRetry ? <button type="button" onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><RefreshCw size={15} aria-hidden="true" />Try again</button> : null}
    </section>
  );
}
