import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TimezoneProvider } from "@/lib/timezone";

const inter = localFont({
  src: "../public/fonts/Inter.woff2",
  variable: "--font-sans",
  display: "swap",
});

const spaceMono = localFont({
  src: "../public/fonts/SpaceMono-Regular.woff2",
  variable: "--font-space-mono",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Team Calendar - Valorant Schedule Bot",
  description: "View and manage team availability",
  other: {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceMono.variable}`}>
      <head>
        {/* Unregister any old service workers */}
        <script src="/unregister-sw.js" defer />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <TooltipProvider>
            <TimezoneProvider>
              {children}
            </TimezoneProvider>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
