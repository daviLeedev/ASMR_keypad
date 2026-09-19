import React from "react";
import {
  Pressable,
  Text,
  View,
  ScrollView,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { colors as c } from "../design-system/theme";
export function Label({
  children,
  muted = false,
  style,
  testID,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: StyleProp<import("react-native").TextStyle>;
  testID?: string;
}) {
  return (
    <Text testID={testID} style={[styles.text, muted && styles.muted, style]}>
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  testID,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondaryButton,
        disabled && { opacity: 0.45 },
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.buttonText, secondary && { color: c.navy }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function ProgressRail({
  value,
  testID,
}: {
  value: number;
  testID?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={styles.progressTrack}
    >
      <View style={[styles.progressFill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}
export function Screen({
  children,
  scroll = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, { flex: 1 }]}>{children}</View>
        )}
      </View>
    </SafeAreaView>
  );
}
export function Header({
  title,
  back = false,
  right,
}: {
  title: string;
  back?: boolean;
  right?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          onPress={() => router.replace("/home")}
          style={styles.back}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
      )}
      <Text style={styles.brand}>{title}</Text>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}
export function Nav({
  active,
}: {
  active: "home" | "collection" | "settings";
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.nav}>
      {(["home", "collection", "settings"] as const).map((route) => (
        <Pressable
          key={route}
          accessibilityRole="button"
          accessibilityLabel={t(route)}
          onPress={() => router.replace(`/${route}`)}
          style={[styles.navItem, active === route && styles.navActive]}
        >
          <Text
            style={{
              color: active === route ? c.navy : c.secondary,
              fontWeight: active === route ? "700" : "500",
              fontSize: 13,
            }}
          >
            {t(route)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  container: { flex: 1, width: "100%", maxWidth: 560, alignSelf: "center" },
  content: { paddingHorizontal: 22, paddingBottom: 20, gap: 18 },
  text: { color: c.navy, fontSize: 15, lineHeight: 23 },
  muted: { color: c.secondary },
  title: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "700",
    color: c.navy,
    letterSpacing: -1,
  },
  subtitle: { fontSize: 18, fontWeight: "600", color: c.navy },
  eyebrow: {
    color: c.primaryStrong,
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: "700",
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: "#153975",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  button: {
    minHeight: 50,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: c.navy,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#091D43",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonPressed: {
    transform: [{ translateY: 2 }],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    elevation: 1,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  secondaryButton: { backgroundColor: "#E9F3FC", shadowOpacity: 0.08 },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brand: {
    color: c.navy,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  back: { width: 32, height: 44, justifyContent: "center" },
  backText: { fontSize: 34, color: c.navy },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  spread: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  nav: {
    flexDirection: "row",
    padding: 6,
    backgroundColor: "#EAF2FA",
    borderRadius: 17,
    gap: 4,
  },
  navItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
  },
  navActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#153975",
    shadowOpacity: 0.09,
    shadowRadius: 5,
    elevation: 2,
  },
  progressTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: "#C8DDED",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: c.primaryStrong,
  },
  badge: {
    fontSize: 12,
    color: c.primaryStrong,
    backgroundColor: "#E5F3FF",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
    overflow: "hidden",
    fontWeight: "600",
  },
});
