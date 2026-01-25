import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Valorant Schedule Bot",
  description: "Sign in to access your schedule",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
