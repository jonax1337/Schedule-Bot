import type { Metadata } from "next";
import { Chakra_Petch, Space_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme";
import { Toaster } from "@/components/ui/sonner";
import { TimezoneProvider } from "@/lib/timezone";

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
        className={`${chakraPetch.variable} ${spaceMono.variable} ${brierBold.variable} font-sans antialiased`}
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
