"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  THEME_STORAGE_KEY,
  applyTheme,
  getTheme,
  notifyThemeListeners,
  setTheme as setStoredTheme,
  subscribeTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedDark: boolean;
  setTheme: (theme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function subscribeResolved(onChange: () => void) {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (getTheme() === "system") applyTheme("system");
    onChange();
  };
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  mql.addEventListener("change", onSystemChange);
  return () => {
    observer.disconnect();
    mql.removeEventListener("change", onSystemChange);
  };
}

function getResolvedDarkSnapshot() {
  return document.documentElement.classList.contains("dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getTheme,
    () => "system" as ThemePreference
  );
  const resolvedDark = useSyncExternalStore(
    subscribeResolved,
    getResolvedDarkSnapshot,
    () => false
  );

  useEffect(() => {
    applyTheme(getTheme());
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      applyTheme(getTheme());
      notifyThemeListeners();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setStoredTheme(next);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedDark, setTheme }),
    [theme, resolvedDark, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
