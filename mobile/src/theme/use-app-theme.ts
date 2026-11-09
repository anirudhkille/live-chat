import { useColorScheme } from "react-native";

import { useThemeStore } from "./theme-store";

export type { ThemePreference } from "./theme-store";

export type ThemePalette = {
  background: string;
  card: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  border: string;
  divider: string;
  primary: string;
  primaryText: string;
  danger: string;
};

const light: ThemePalette = {
  background: "#fff",
  card: "#fff",
  surface: "#f3f4f6",
  surfaceMuted: "#f9fafb",
  text: "#111827",
  textMuted: "#666",
  border: "#ddd",
  divider: "#eee",
  primary: "#111827",
  primaryText: "#fff",
  danger: "#dc2626",
};

const dark: ThemePalette = {
  background: "#0f172a",
  card: "#1e293b",
  surface: "#1f2937",
  surfaceMuted: "#111827",
  text: "#f9fafb",
  textMuted: "#cbd5e1",
  border: "#374151",
  divider: "#1e293b",
  primary: "#f9fafb",
  primaryText: "#111827",
  danger: "#dc2626",
};

export function useAppTheme() {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  const resolvedScheme: "light" | "dark" =
    preference === "system" ? (systemScheme ?? "light") : preference;

  return {
    scheme: resolvedScheme,
    preference,
    setPreference,
    palette: resolvedScheme === "dark" ? dark : light,
  };
}
