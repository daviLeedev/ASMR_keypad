import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { KeyboardTheme } from "../design-system/theme";

/** Silent product illustration; interactive trials live on the detail screen. */
export function KeyboardExhibit({
  theme,
  compact = false,
}: {
  theme: KeyboardTheme;
  compact?: boolean;
}) {
  const s = theme.surface;
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[art.stage, compact && { paddingVertical: 16 }]}
    >
      <View
        style={[
          art.board,
          { backgroundColor: s.deckTop, borderBottomColor: s.deckSide },
        ]}
      >
        <View style={art.brand}>
          <Text style={[art.tiny, { color: s.legend }]}>K / L</Text>
          <View style={[art.light, { backgroundColor: theme.accent }]} />
        </View>
        {["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].map((row, index) => (
          <View key={row} style={[art.row, { paddingHorizontal: index * 5 }]}>
            {[...row].map((key, i) => (
              <View
                key={key}
                style={[
                  art.key,
                  compact && { height: 20 },
                  {
                    backgroundColor:
                      i === 0 && index === 0 ? theme.accent : s.keyTop,
                    borderBottomColor: s.keySide,
                  },
                ]}
              >
                <Text style={[art.legend, { color: s.legend }]}>{key}</Text>
              </View>
            ))}
          </View>
        ))}
        <View style={art.row}>
          {[1, 1, 5, 1, 1].map((flex, i) => (
            <View
              key={i}
              style={[
                art.key,
                {
                  flex,
                  height: 18,
                  backgroundColor: i === 4 ? theme.accent : s.keyTop,
                  borderBottomColor: s.keySide,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
const art = StyleSheet.create({
  stage: { paddingHorizontal: 12, paddingVertical: 28, alignItems: "center" },
  board: {
    width: "100%",
    maxWidth: 380,
    padding: 9,
    borderRadius: 13,
    borderBottomWidth: 9,
    gap: 5,
    transform: [{ rotate: "-4deg" }],
    shadowColor: "#153975",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
  },
  row: { flexDirection: "row", gap: 4 },
  key: {
    flex: 1,
    height: 26,
    borderRadius: 4,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  legend: { fontSize: 8, fontWeight: "600" },
  brand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 3,
    marginBottom: 2,
  },
  tiny: { fontSize: 7, fontWeight: "800", letterSpacing: 2 },
  light: { width: 16, height: 3, borderRadius: 2 },
});
