export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "live-chat.theme";

const listeners = new Set<() => void>();

export function notifyThemeListeners(): void {
  listeners.forEach((listener) => listener());
}

export function getStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

export function getTheme(): ThemePreference {
  return getStoredTheme();
}

export function systemPrefersDark(): boolean {
  return typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

export function resolveDark(theme: ThemePreference): boolean {
  return theme === "dark" || (theme === "system" && systemPrefersDark());
}

export function applyTheme(theme: ThemePreference): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveDark(theme));
}

export function setTheme(theme: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
  applyTheme(theme);
  notifyThemeListeners();
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
