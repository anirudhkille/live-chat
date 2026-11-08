import { useColorScheme } from "react-native";

export type ThemePalette = {
  background: string;
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
  const scheme = useColorScheme();
  const palette = scheme === "dark" ? dark : light;
  return { scheme: scheme ?? "light", palette };
}
