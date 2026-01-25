import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel - Valorant Schedule Bot",
  description: "Admin dashboard for bot configuration and management",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
