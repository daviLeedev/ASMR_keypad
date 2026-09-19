import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { playKey, preloadTheme } from "../audio";
import { getTheme, keyboardLayout, motion } from "../design-system/theme";
import type { Settings } from "../state/model";
import { Keycap } from "./Keycap";
import { KeyboardDock } from "./KeyboardDock";
import {
  KeyFeedbackLayer,
  type KeyFeedbackEvent,
  type KeyboardFeedbackMode,
} from "./KeyFeedbackLayer";

const EN = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const KO = ["ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ", "ㅁㄴㅇㄹㅎㅗㅓㅏㅣ", "ㅋㅌㅊㅍㅠㅜㅡ"];
const SHIFT: Record<string, string> = {
  ㅂ: "ㅃ",
  ㅈ: "ㅉ",
  ㄷ: "ㄸ",
  ㄱ: "ㄲ",
  ㅅ: "ㅆ",
  ㅐ: "ㅒ",
  ㅔ: "ㅖ",
};

export interface KeyboardProps {
  language: "en" | "ko";
  themeId: string;
  settings: Settings;
  onKey: (key: string) => void;
  sentence?: boolean;
  disabled?: boolean;
  height?: number;
  bottomInset?: number;
  feedbackMode?: KeyboardFeedbackMode;
}

export function Keyboard({
  language,
  themeId,
  settings,
  onKey,
  sentence = false,
  disabled = false,
  height = 245,
  bottomInset = 0,
  feedbackMode = "quiet",
}: KeyboardProps) {
  const [shift, setShift] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [feedbackEvents, setFeedbackEvents] = useState<KeyFeedbackEvent[]>([]);
  const { t } = useTranslation();
  const theme = getTheme(themeId);
  const eventId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    void preloadTheme(themeId);
  }, [themeId]);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(setSystemReducedMotion)
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setSystemReducedMotion,
    );
    return () => subscription.remove();
  }, []);
  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
    },
    [],
  );

  const reducedMotion = settings.reducedMotion || systemReducedMotion;
  const rows = useMemo(
    () =>
      (language === "ko" ? KO : EN).map((row) =>
        Array.from(row).map((key) =>
          shift
            ? language === "ko"
              ? (SHIFT[key] ?? key)
              : key.toUpperCase()
            : key,
        ),
      ),
    [language, shift],
  );
  const displayRows = sentence ? [...rows, [",", " ", ".", "?", "'"]] : rows;

  const hit = (value: string) => {
    if (disabled) return;
    playKey(
      value === "⌫" ? "backspace" : value === " " ? "space" : "normal",
      settings,
    );
    if (value === "⇧") setShift((current) => !current);
    else {
      onKey(value === "⌫" ? "BACKSPACE" : value);
      if (shift) setShift(false);
    }
  };
  const showFeedback = (
    value: string,
    row: number,
    column: number,
    columns: number,
  ) => {
    if (disabled || reducedMotion || value === "⇧" || value === "⌫") return;
    const next: KeyFeedbackEvent = {
      id: ++eventId.current,
      label: value === " " ? t("space") : value,
      row,
      column,
      columns,
      rows: displayRows.length,
    };
    setFeedbackEvents((current) => [...current, next].slice(-3));
    const timer = setTimeout(
      () =>
        setFeedbackEvents((current) =>
          current.filter((event) => event.id !== next.id),
        ),
      motion.feedbackMs,
    );
    timers.current.push(timer);
  };
  const accessibilityLabel = (value: string) =>
    value === "⌫"
      ? t("delete")
      : value === "⇧"
        ? t("shift")
        : value === " "
          ? t("space")
          : value;
  const testID = (value: string) =>
    value === "⌫"
      ? "key-backspace"
      : value === " "
        ? "key-space"
        : `key-${value}`;
  const renderKey = (
    value: string,
    row: number,
    column: number,
    columns: number,
    flex = 1,
  ) => (
    <Keycap
      key={`${row}-${column}-${value}`}
      label={value === " " ? t("space") : value}
      accessibilityLabel={accessibilityLabel(value)}
      testID={testID(value)}
      flex={value === " " ? 6 : flex}
      disabled={disabled}
      reducedMotion={reducedMotion}
      theme={theme}
      onTrigger={() => hit(value)}
      onVisualPress={() => showFeedback(value, row, column, columns)}
    />
  );

  return (
    <KeyboardDock theme={theme} height={height} bottomInset={bottomInset}>
      <View style={styles.rows}>
        {displayRows.map((row, rowIndex) => {
          const hasModifiers = rowIndex === 2;
          const columns = row.length + (hasModifiers ? 2 : 0);
          return (
            <View
              key={rowIndex}
              style={[styles.row, rowIndex === 1 && styles.homeRow]}
            >
              {hasModifiers ? renderKey("⇧", rowIndex, 0, columns, 1.5) : null}
              {row.map((value, column) =>
                renderKey(
                  value,
                  rowIndex,
                  column + (hasModifiers ? 1 : 0),
                  columns,
                ),
              )}
              {hasModifiers
                ? renderKey("⌫", rowIndex, columns - 1, columns, 1.5)
                : null}
            </View>
          );
        })}
      </View>
      <View style={styles.footer}>
        <Text style={[styles.wordmark, { color: theme.surface.legend }]}>
          KEYLINGO
        </Text>
        <Text style={[styles.pack, { color: theme.surface.legend }]}>
          {theme.name} / {language === "ko" ? "두벌식" : "QWERTY"}
        </Text>
      </View>
      <KeyFeedbackLayer
        events={feedbackEvents}
        mode={feedbackMode}
        theme={theme}
      />
    </KeyboardDock>
  );
}

const styles = StyleSheet.create({
  rows: { gap: keyboardLayout.rowGap },
  row: { flexDirection: "row", gap: keyboardLayout.columnGap },
  homeRow: { paddingHorizontal: 8 },
  footer: {
    minHeight: 21,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 5,
    marginTop: 3,
  },
  wordmark: {
    fontSize: 8,
    letterSpacing: 1.8,
    fontWeight: "800",
    opacity: 0.62,
  },
  pack: { fontSize: 9, opacity: 0.68 },
});
