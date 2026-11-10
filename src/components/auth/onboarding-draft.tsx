"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type BranchDraft = { id: number; name: string; code: string; address: string };
type BusinessDraft = { name: string; email: string; phone: string; address: string; currency: string; timezone: string };
type OnboardingDraft = { business: BusinessDraft; categories: string[]; branches: BranchDraft[] };
type DraftContextValue = { draft: OnboardingDraft; updateBusiness: (field: keyof BusinessDraft, value: string) => void; toggleCategory: (category: string) => void; addBranch: () => void; updateBranch: (id: number, field: keyof Omit<BranchDraft, "id">, value: string) => void; removeBranch: (id: number) => void; replaceDraft: (draft: OnboardingDraft) => void };

const initialDraft: OnboardingDraft = { business: { name: "", email: "", phone: "", address: "", currency: "NGN", timezone: "Africa/Lagos" }, categories: [], branches: [] };
const STORAGE_KEY = "edsec.onboarding.draft.v1";
const DraftContext = createContext<DraftContextValue | null>(null);

export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(initialDraft);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<OnboardingDraft>;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft({
          business: { ...initialDraft.business, ...parsed.business },
          categories: Array.isArray(parsed.categories) ? parsed.categories.filter((item): item is string => typeof item === "string") : [],
          branches: Array.isArray(parsed.branches) ? parsed.branches.filter((item): item is BranchDraft => Boolean(item && typeof item.id === "number" && typeof item.name === "string" && typeof item.code === "string" && typeof item.address === "string")) : [],
        });
      }
    } catch { window.localStorage.removeItem(STORAGE_KEY); }
    finally { setHydrated(true); }
  }, []);
  useEffect(() => { if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); }, [draft, hydrated]);
  const value = useMemo<DraftContextValue>(() => ({
    draft,
    updateBusiness: (field, value) => setDraft(current => ({ ...current, business: { ...current.business, [field]: value } })),
    toggleCategory: category => setDraft(current => ({ ...current, categories: current.categories.includes(category) ? current.categories.filter(item => item !== category) : [...current.categories, category] })),
    addBranch: () => setDraft(current => ({ ...current, branches: [...current.branches, { id: current.branches.reduce((max, item) => Math.max(max, item.id), 0) + 1, name: "", code: "", address: "" }] })),
    updateBranch: (id, field, value) => setDraft(current => ({ ...current, branches: current.branches.map(item => item.id === id ? { ...item, [field]: value } : item) })),
    removeBranch: id => setDraft(current => ({ ...current, branches: current.branches.filter(item => item.id !== id) })),
    replaceDraft: (next) => setDraft(next),
  }), [draft]);
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}
export function useOnboardingDraft() {
  const context = useContext(DraftContext);
  if (!context) throw new Error("useOnboardingDraft must be used inside OnboardingDraftProvider");
  return context;
}
