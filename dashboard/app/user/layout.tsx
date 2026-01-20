import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Schedule - Valorant Schedule Bot",
  description: "Manage your personal availability",
};

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
