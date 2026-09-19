import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../design-system/theme";

export interface PracticeLayoutProps {
  header: React.ReactNode;
  progress: React.ReactNode;
  body: React.ReactNode;
  actions?: React.ReactNode;
  keyboard: React.ReactNode;
  overlay?: React.ReactNode;
}

export function PracticeLayout({
  header,
  progress,
  body,
  actions,
  keyboard,
  overlay,
}: PracticeLayoutProps) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={layout.safe}>
      <View style={layout.frame}>
        <View style={layout.content}>
          {header}
          {progress}
          <View style={layout.body}>{body}</View>
          {actions ? <View style={layout.actions}>{actions}</View> : null}
        </View>
        <View style={layout.keyboard}>{keyboard}</View>
        {overlay}
      </View>
    </SafeAreaView>
  );
}

const layout = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    position: "relative",
  },
  content: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 22,
    gap: 10,
  },
  body: { flex: 1, minHeight: 0 },
  actions: { minHeight: 46 },
  keyboard: { paddingHorizontal: 8 },
});
