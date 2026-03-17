import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme";
import { Toaster } from "@/components/ui/sonner";
import { TimezoneProvider } from "@/lib/timezone";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const brierBold = localFont({
  src: "../public/fonts/Brier-Bold.woff2",
  variable: "--font-brier",
  weight: "700",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Unregister any old service workers */}
        <script src="/unregister-sw.js" defer />
      </head>
      <body
        className={`${inter.variable} ${spaceMono.variable} ${brierBold.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <TimezoneProvider>
            {children}
          </TimezoneProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
