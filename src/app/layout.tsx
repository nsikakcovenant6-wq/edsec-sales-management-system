import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EDSEC | Business Management",
  description: "EDSEC Sales Management System — retail, point-of-sale and business operations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
