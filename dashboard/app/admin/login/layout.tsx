import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login - Valorant Schedule Bot",
  description: "Admin authentication",
};

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
