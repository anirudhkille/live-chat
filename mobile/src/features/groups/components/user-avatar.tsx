import { Image, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/theme/use-app-theme";

type UserAvatarProps = {
  uri?: string | null;
  name?: string | null;
  size?: number;
};

export function UserAvatar({ uri, name, size = 40 }: UserAvatarProps) {
  const { palette } = useAppTheme();
  const initial = name?.trim().charAt(0).toUpperCase() || "?";
  const shape = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.avatar, shape, { backgroundColor: palette.surface }]}
      />
    );
  }

  return (
    <View
      style={[styles.fallback, shape, { backgroundColor: palette.surface }]}
    >
      <Text
        style={[
          styles.initial,
          { color: palette.text, fontSize: Math.round(size * 0.4) },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { resizeMode: "cover" },
  fallback: { alignItems: "center", justifyContent: "center" },
  initial: { fontWeight: "600" },
});
