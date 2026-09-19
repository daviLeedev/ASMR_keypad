import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { colors } from "../design-system/theme";
import { Header, Label, styles } from "./ui";
import { Icon, type IconName } from "./Icon";
export function ShellHeader({ title = "KeyLingo" }: { title?: string }) {
  const { t } = useTranslation();
  return (
    <Header
      title={title}
      right={
        <Pressable
          testID="open-settings"
          accessibilityRole="button"
          accessibilityLabel={t("settings")}
          onPress={() => router.push("/settings")}
          style={shell.settings}
        >
          <Icon name="settings" size={22} />
        </Pressable>
      }
    />
  );
}
export function PageIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={shell.headline}>{title}</Text>
      {body && <Label muted>{body}</Label>}
    </View>
  );
}
export function Destination({
  title,
  body,
  mark,
  onPress,
  testID,
  note,
}: {
  title: string;
  body: string;
  mark: string;
  onPress: () => void;
  testID?: string;
  note?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [shell.destination, pressed && { opacity: 0.7 }]}
    >
      <View style={shell.key}>
        <Icon
          name={
            ({
              Aa: "book",
              "↺": "repeat",
              "↗": "speed",
              "≋": "rain",
              "◴": "settings",
            }[mark] ?? "play") as IconName
          }
        />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.subtitle}>{title}</Text>
        <Label muted>{body}</Label>
        {note && <Label style={{ fontSize: 12 }}>{note}</Label>}
      </View>
      <Icon name="arrow" size={20} color={colors.secondary} />
    </Pressable>
  );
}
export const shell = StyleSheet.create({
  headline: {
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -1.2,
    fontWeight: "700",
    color: colors.navy,
  },
  settings: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderRadius: 15,
  },
  destination: {
    flexDirection: "row",
    gap: 16,
    paddingVertical: 26,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  key: {
    width: 48,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 5,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: { fontSize: 22, fontWeight: "600", color: colors.navy },
  arrow: { fontSize: 22, color: colors.primaryStrong },
  divider: { height: 1, backgroundColor: colors.border },
  pill: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 22,
  },
});
