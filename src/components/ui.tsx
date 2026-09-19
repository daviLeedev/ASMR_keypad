import React, { useCallback, useState } from "react";
import {
  Pressable,
  Text,
  View,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { colors as c } from "../design-system/theme";
import { Icon, type IconName } from "./Icon";
import { useReducedMotion } from "./useReducedMotion";
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
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
  const reducedMotion = useReducedMotion();
  const [press] = useState(() => new Animated.Value(0));
  const animatePress = (value: number) =>
    Animated.timing(press, {
      toValue: value,
      duration: reducedMotion ? 0 : value ? 80 : 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => animatePress(1)}
      onPressOut={() => animatePress(0)}
      style={[
        styles.button,
        secondary && styles.secondaryButton,
        disabled && { opacity: 0.45 },
        {
          transform: [
            {
              scale: reducedMotion
                ? 1
                : press.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.98],
                  }),
            },
            {
              translateY: reducedMotion
                ? 0
                : press.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 2],
                  }),
            },
          ],
        },
      ]}
    >
      <Text style={[styles.buttonText, secondary && { color: c.navy }]}>
        {title}
      </Text>
    </AnimatedPressable>
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
  active,
  compact = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  active?: "home" | "play" | "collection" | "progress";
  compact?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const [entrance] = useState(() => new Animated.Value(1));
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "web" || reducedMotion) {
        entrance.setValue(1);
        return;
      }
      entrance.setValue(0);
      const animation = Animated.timing(entrance, {
        toValue: 1,
        duration: active ? 180 : 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      animation.start();
      return () => animation.stop();
    }, [active, entrance, reducedMotion]),
  );
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Animated.View
          testID="screen-content"
          style={{
            flex: 1,
            opacity: entrance,
            transform: [
              {
                translateY:
                  active || reducedMotion
                    ? 0
                    : entrance.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
              },
            ],
          }}
        >
          {scroll ? (
            <ScrollView
              contentContainerStyle={[
                styles.content,
                compact && { gap: 12, paddingBottom: 14 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.content, { flex: 1 }]}>{children}</View>
          )}
        </Animated.View>
        {active && <Nav active={active} />}
      </View>
    </SafeAreaView>
  );
}
export function Header({
  title,
  back = false,
  right,
  parent = "/home",
}: {
  title: string;
  back?: boolean;
  right?: React.ReactNode;
  parent?: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace(parent)
          }
          style={styles.back}
        >
          <Icon name="back" size={23} />
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
  active: "home" | "play" | "collection" | "progress";
}) {
  const { t } = useTranslation();
  return (
    <View testID="bottom-navigation" style={styles.nav}>
      {(["home", "play", "collection", "progress"] as const).map(
        (route, index) => (
          <Pressable
            key={route}
            accessibilityRole="button"
            accessibilityLabel={t(route === "progress" ? "journal" : route)}
            accessibilityState={{ selected: active === route }}
            testID={`nav-${route}`}
            onPress={() => router.navigate(`/${route}`)}
            style={({ pressed }) => [
              styles.navItem,
              pressed && { opacity: 0.65 },
            ]}
          >
            <View
              style={[styles.navIcon, active === route && styles.navActive]}
            >
              <Icon
                name={
                  (["home", "play", "keyboard", "chart"] as IconName[])[index]
                }
                color={active === route ? c.navy : c.secondary}
                size={22}
              />
            </View>
            <Text
              style={{
                color: active === route ? c.navy : c.secondary,
                fontWeight: active === route ? "700" : "500",
                fontSize: 11,
              }}
            >
              {t(route === "progress" ? "journal" : route)}
            </Text>
          </Pressable>
        ),
      )}
    </View>
  );
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.surface },
  container: { flex: 1, width: "100%", maxWidth: 560, alignSelf: "center" },
  content: { paddingHorizontal: 24, paddingBottom: 28, gap: 22 },
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
    shadowOpacity: 0.03,
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
  back: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: c.background,
  },
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
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
    gap: 4,
  },
  navItem: {
    flex: 1,
    paddingVertical: 4,
    gap: 4,
    alignItems: "center",
    borderRadius: 12,
  },
  navIcon: {
    width: 52,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  navActive: {
    backgroundColor: "#E3F2FF",
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
