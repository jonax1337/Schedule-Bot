"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Only render after mounting to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    // Use resolvedTheme to get the actual active theme (even if user has "system" selected)
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-smooth"
      aria-label="Toggle theme"
    >
      <Sun className={`h-5 w-5 rotate-0 scale-100 dark:-rotate-90 dark:scale-0 ${mounted ? 'transition-all duration-300' : ''}`} />
      <Moon className={`absolute h-5 w-5 rotate-90 scale-0 dark:rotate-0 dark:scale-100 ${mounted ? 'transition-all duration-300' : ''}`} />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
