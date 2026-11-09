import type { ComponentProps, ReactNode } from "react";
import { useMemo } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/theme/use-app-theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

type SettingsRowProps = {
  icon: IconName;
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  showDivider?: boolean;
  destructive?: boolean;
};

export function SettingsRow({
  icon,
  label,
  description,
  value,
  onPress,
  right,
  showDivider = true,
  destructive = false,
}: SettingsRowProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const content = (
    <>
      <View style={styles.iconWrap}>
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? palette.danger : palette.textMuted}
        />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, destructive && styles.destructive]}>
          {label}
        </Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      {value ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right ??
        (onPress ? (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={palette.textMuted}
          />
        ) : null)}
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.row, showDivider && styles.divider]}>{content}</View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.row, showDivider && styles.divider]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.7}
    >
      {content}
    </TouchableOpacity>
  );
}

type SettingsSwitchRowProps = {
  icon: IconName;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  showDivider?: boolean;
};

export function SettingsSwitchRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  disabled,
  showDivider = true,
}: SettingsSwitchRowProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={[styles.row, showDivider && styles.divider]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={18} color={palette.textMuted} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: palette.border, true: palette.primary }}
        thumbColor={palette.card}
        ios_backgroundColor={palette.border}
        accessibilityLabel={label}
      />
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof useAppTheme>["palette"]) =>
  StyleSheet.create({
    section: { gap: 8 },
    sectionTitle: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      paddingHorizontal: 4,
    },
    card: {
      borderWidth: 1,
      borderColor: palette.divider,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: palette.card,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: palette.card,
    },
    divider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.divider,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surface,
    },
    body: { flex: 1, gap: 2 },
    label: { color: palette.text, fontSize: 15, fontWeight: "500" },
    destructive: { color: palette.danger },
    description: { color: palette.textMuted, fontSize: 12, lineHeight: 16 },
    value: { color: palette.textMuted, fontSize: 13, maxWidth: 120 },
  });
