import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { KeyboardTheme } from "../design-system/theme";

export type KeyboardFeedbackMode = "quiet" | "score";
export interface KeyFeedbackEvent {
  id: number;
  label: string;
  row: number;
  column: number;
  columns: number;
  rows: number;
}

export function KeyFeedbackLayer({
  events,
  mode,
  theme,
}: {
  events: KeyFeedbackEvent[];
  mode: KeyboardFeedbackMode;
  theme: KeyboardTheme;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {events.map((event) => {
        const left = Math.max(
          8,
          Math.min(92, ((event.column + 0.5) / event.columns) * 100),
        );
        const top = Math.max(
          8,
          Math.min(82, ((event.row + 0.35) / event.rows) * 100),
        );
        return (
          <Text
            key={event.id}
            testID="key-feedback-event"
            style={[
              styles.event,
              {
                left: `${left}%`,
                top: `${top}%`,
                color: theme.surface.legend,
                backgroundColor: theme.surface.glow,
              },
            ]}
          >
            {mode === "score" ? "+1" : event.label.toUpperCase()}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  event: {
    position: "absolute",
    minWidth: 26,
    minHeight: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 11,
    overflow: "hidden",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "900",
    transform: [{ translateX: -13 }, { translateY: -18 }],
    opacity: 0.92,
  },
});
