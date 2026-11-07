import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { navigationItems } from "@/lib/nav";
import { Construction } from "lucide-react";

const sectionDescriptions: Record<string, string> = {
  products: "The product catalogue interface will be implemented here. No products are loaded in this preview.",
  inventory: "Stock balances, adjustments and movement history will be implemented here after the relevant workflows are agreed.",
  pos: "The checkout workspace will be implemented here. Sales are not created or stored in this preview.",
  customers: "Customer records and account history will be implemented here when the frontend workflows are ready.",
  reports: "Business reports and analytics will be implemented here when approved reporting definitions are available.",
  billing: "Plan comparison and billing screens will be implemented here after subscription rules are confirmed.",
};

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const item = navigationItems.find((entry) => entry.href === `/${section}`);
  const description = sectionDescriptions[section];
  if (!item || !description) notFound();

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-medium text-[var(--brand)]">Workspace module</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{item.label}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">This screen is part of the UI foundation and is not connected to backend services.</p></div>
      <EmptyState icon={Construction} title={`${item.label} is being prepared`} description={description} />
    </div>
  );
}
