import React from "react";
import { StyleSheet, View } from "react-native";
import { keyboardLayout, type KeyboardTheme } from "../design-system/theme";

export function KeyboardDock({
  children,
  theme,
  height,
  bottomInset = 0,
}: {
  children: React.ReactNode;
  theme: KeyboardTheme;
  height: number;
  bottomInset?: number;
}) {
  return (
    <View
      testID="virtual-keyboard"
      style={[styles.shell, { backgroundColor: theme.surface.deckSide }]}
    >
      <View
        style={[
          styles.deck,
          { height, backgroundColor: theme.surface.deckTop },
        ]}
      >
        {children}
      </View>
      <View
        style={{
          height: 13 + bottomInset,
          backgroundColor: theme.surface.deckSide,
        }}
        testID="keyboard-safe-area"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: "100%",
    maxWidth: keyboardLayout.maxWidth,
    alignSelf: "center",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 27,
    borderBottomRightRadius: 27,
    shadowColor: "#163C66",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 12,
  },
  deck: {
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingTop: 12,
    paddingBottom: 4,
    overflow: "hidden",
  },
});
