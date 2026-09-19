"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { resolvedDark, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={resolvedDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(resolvedDark ? "light" : "dark")}
    >
      {resolvedDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
