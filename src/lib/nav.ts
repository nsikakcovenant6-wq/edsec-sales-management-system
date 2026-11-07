import { BarChart3, Boxes, CreditCard, LayoutDashboard, Package, ShoppingCart, Users, type LucideIcon } from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  /** Optional permission identifier supplied by the approved backend contract. */
  permission?: string;
};

export const navigationItems: NavigationItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard, description: "Workspace overview" },
  { label: "Products", href: "/products", icon: Package, description: "Product catalogue" },
  { label: "Inventory", href: "/inventory", icon: Boxes, description: "Stock and inventory" },
  { label: "Point of sale", href: "/pos", icon: ShoppingCart, description: "Sales workspace" },
  { label: "Customers", href: "/customers", icon: Users, description: "Customer records" },
  { label: "Reports", href: "/reports", icon: BarChart3, description: "Business reporting" },
  { label: "Billing", href: "/billing", icon: CreditCard, description: "Plans and billing" },
];

export function getNavigationTitle(pathname: string): string {
  const match = navigationItems.find((item) =>
    item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.label ?? "Workspace";
}
