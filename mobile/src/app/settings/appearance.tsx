import type { ComponentProps } from "react";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";

import {
  SettingsRow,
  SettingsSection,
} from "@/features/settings/components/settings-row";
import { useAppTheme, type ThemePreference } from "@/theme/use-app-theme";

type ThemeOption = {
  value: ThemePreference;
  label: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>["name"];
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "system",
    label: "System",
    description: "Automatically match your device appearance",
    icon: "phone-portrait-outline",
  },
  {
    value: "light",
    label: "Light",
    description: "Always use the light theme",
    icon: "sunny-outline",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always use the dark theme",
    icon: "moon-outline",
  },
];

export default function AppearanceScreen() {
  const { palette, preference, setPreference } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: "Appearance" }} />

      <SettingsSection title="Theme">
        {THEME_OPTIONS.map((option, index) => {
          const selected = option.value === preference;

          return (
            <SettingsRow
              key={option.value}
              icon={option.icon}
              label={option.label}
              description={option.description}
              onPress={() => setPreference(option.value)}
              showDivider={index < THEME_OPTIONS.length - 1}
              right={
                <Ionicons
                  name={selected ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={selected ? palette.primary : palette.textMuted}
                />
              }
            />
          );
        })}
      </SettingsSection>

      <Text style={styles.note}>
        System follows the light or dark appearance set on your device. Your
        choice is saved on this device.
      </Text>
    </ScrollView>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    content: { padding: 16, paddingBottom: 32, gap: 16 },
    note: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
  });
