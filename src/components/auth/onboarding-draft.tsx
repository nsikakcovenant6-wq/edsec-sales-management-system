"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type BranchDraft = { id: number; name: string; code: string; address: string };
type BusinessDraft = { name: string; email: string; phone: string; address: string; currency: string; timezone: string };
type OnboardingDraft = { business: BusinessDraft; categories: string[]; branches: BranchDraft[] };
type DraftContextValue = { draft: OnboardingDraft; updateBusiness: (field: keyof BusinessDraft, value: string) => void; toggleCategory: (category: string) => void; addBranch: () => void; updateBranch: (id: number, field: keyof Omit<BranchDraft, "id">, value: string) => void; removeBranch: (id: number) => void };

const initialDraft: OnboardingDraft = { business: { name: "", email: "", phone: "", address: "", currency: "NGN", timezone: "Africa/Lagos" }, categories: [], branches: [] };
const DraftContext = createContext<DraftContextValue | null>(null);

export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(initialDraft);
  const value = useMemo<DraftContextValue>(() => ({
    draft,
    updateBusiness: (field, value) => setDraft(current => ({ ...current, business: { ...current.business, [field]: value } })),
    toggleCategory: category => setDraft(current => ({ ...current, categories: current.categories.includes(category) ? current.categories.filter(item => item !== category) : [...current.categories, category] })),
    addBranch: () => setDraft(current => ({ ...current, branches: [...current.branches, { id: current.branches.reduce((max, item) => Math.max(max, item.id), 0) + 1, name: "", code: "", address: "" }] })),
    updateBranch: (id, field, value) => setDraft(current => ({ ...current, branches: current.branches.map(item => item.id === id ? { ...item, [field]: value } : item) })),
    removeBranch: id => setDraft(current => ({ ...current, branches: current.branches.filter(item => item.id !== id) }))
  }), [draft]);
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useOnboardingDraft() {
  const context = useContext(DraftContext);
  if (!context) throw new Error("useOnboardingDraft must be used inside OnboardingDraftProvider");
  return context;
}
