import { useMemo } from "react";
import type { ColorValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { useAppTheme } from "@/theme/use-app-theme";

type TabIconProps = {
  color: ColorValue;
  size: number;
};

function ChatsIcon({ color, size }: TabIconProps) {
  return (
    <Ionicons name="chatbubbles-outline" color={color as string} size={size} />
  );
}

function SettingsIcon({ color, size }: TabIconProps) {
  return (
    <Ionicons name="settings-outline" color={color as string} size={size} />
  );
}

export default function TabsLayout() {
  const { palette } = useAppTheme();
  const styles = useMemo(
    () => ({
      header: { backgroundColor: palette.background },
      tabBar: {
        backgroundColor: palette.card,
        borderTopColor: palette.divider,
      },
    }),
    [palette],
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: styles.header,
        headerTintColor: palette.text,
        headerTitleStyle: { color: palette.text, fontWeight: "600" },
        headerShadowVisible: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Chats", tabBarIcon: ChatsIcon }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", tabBarIcon: SettingsIcon }}
      />
    </Tabs>
  );
}
