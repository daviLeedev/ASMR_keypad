import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  type GestureResponderEvent,
  type NativeTouchEvent,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  playKey,
  preloadTheme,
  type KeyCategory,
  type KeyPhase,
} from "../audio";
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

export class GlideTouchTracker {
  private readonly touches = new Map<string | number, string | null>();

  start(touchId: string | number, keyId: string | null): void {
    this.touches.set(touchId, keyId);
  }

  move(
    touchId: string | number,
    keyId: string | null,
  ): { entered: string | null; exited: string | null } {
    if (!this.touches.has(touchId)) {
      this.touches.set(touchId, keyId);
      return { entered: keyId, exited: null };
    }
    const previous = this.touches.get(touchId) ?? null;
    if (previous === keyId) return { entered: null, exited: null };
    this.touches.set(touchId, keyId);
    return { entered: keyId, exited: previous };
  }

  end(touchId: string | number): void {
    this.touches.delete(touchId);
  }

  keyForTouch(touchId: string | number): string | null {
    return this.touches.get(touchId) ?? null;
  }

  pressedKeys(): Set<string> {
    return new Set(
      [...this.touches.values()].filter(
        (keyId): keyId is string => keyId !== null,
      ),
    );
  }
}

export interface GlideKeyRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GlideKeyTarget {
  value: string;
  row: number;
  column: number;
  columns: number;
}

const GLIDE_HYSTERESIS = 4;

function containsPoint(
  region: GlideKeyRegion,
  x: number,
  y: number,
  inset = 0,
): boolean {
  return (
    x >= region.x - inset &&
    x <= region.x + region.width + inset &&
    y >= region.y - inset &&
    y <= region.y + region.height + inset
  );
}

export function findGlideKey(
  regions: readonly GlideKeyRegion[],
  x: number,
  y: number,
  currentKey: string | null,
): string | null {
  if (currentKey) {
    const current = regions.find((region) => region.id === currentKey);
    if (current && containsPoint(current, x, y, GLIDE_HYSTERESIS))
      return current.id;
  }
  return regions.find((region) => containsPoint(region, x, y))?.id ?? null;
}

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
  const glideTracker = useRef(new GlideTouchTracker());
  const keyRegions = useRef(new Map<string, GlideKeyRegion>());
  const [glidePressedKeys, setGlidePressedKeys] = useState<Set<string>>(
    () => new Set(),
  );

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
  useEffect(() => {
    if (!disabled) return;
    glideTracker.current = new GlideTouchTracker();
    const timer = setTimeout(() => setGlidePressedKeys(new Set()), 0);
    return () => clearTimeout(timer);
  }, [disabled]);

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
  const displayRows = useMemo(
    () => (sentence ? [...rows, [",", " ", ".", "?", "'"]] : rows),
    [rows, sentence],
  );
  const keyTargets = useMemo(() => {
    const targets = new Map<string, GlideKeyTarget>();
    displayRows.forEach((row, rowIndex) => {
      const hasModifiers = rowIndex === 2;
      const columns = row.length + (hasModifiers ? 2 : 0);
      if (hasModifiers)
        targets.set(`${rowIndex}:0`, {
          value: "⇧",
          row: rowIndex,
          column: 0,
          columns,
        });
      row.forEach((value, column) => {
        const actualColumn = column + (hasModifiers ? 1 : 0);
        targets.set(`${rowIndex}:${actualColumn}`, {
          value,
          row: rowIndex,
          column: actualColumn,
          columns,
        });
      });
      if (hasModifiers)
        targets.set(`${rowIndex}:${columns - 1}`, {
          value: "⌫",
          row: rowIndex,
          column: columns - 1,
          columns,
        });
    });
    return targets;
  }, [displayRows]);

  const categoryFor = (value: string): KeyCategory =>
    value === "⌫" ? "backspace" : value === " " ? "space" : "normal";
  const sound = (phase: KeyPhase, value: string) =>
    playKey(phase, categoryFor(value), settings);
  const hit = (value: string) => {
    if (disabled) return;
    sound("press", value);
    if (value === "⇧") setShift((current) => !current);
    else {
      onKey(value === "⌫" ? "BACKSPACE" : value);
      if (shift) setShift(false);
    }
  };
  const release = (value: string) => {
    if (disabled) return;
    sound("release", value);
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
  const keyAtTouch = (touch: NativeTouchEvent) =>
    findGlideKey(
      [...keyRegions.current.values()],
      touch.pageX,
      touch.pageY,
      glideTracker.current.keyForTouch(touch.identifier),
    );
  const syncGlidePressedKeys = () =>
    setGlidePressedKeys(glideTracker.current.pressedKeys());
  const triggerGlideKey = (keyId: string) => {
    const target = keyTargets.get(keyId);
    if (!target) return;
    hit(target.value);
    showFeedback(target.value, target.row, target.column, target.columns);
  };
  const releaseGlideKey = (keyId: string) => {
    const target = keyTargets.get(keyId);
    if (target) release(target.value);
  };
  const startGlide = (event: GestureResponderEvent) => {
    if (disabled) return;
    for (const touch of event.nativeEvent.changedTouches) {
      const startingKey = keyAtTouch(touch);
      glideTracker.current.start(touch.identifier, startingKey);
      if (Platform.OS !== "web" && startingKey) triggerGlideKey(startingKey);
    }
    syncGlidePressedKeys();
  };
  const moveGlide = (event: GestureResponderEvent) => {
    if (disabled) return;
    for (const touch of event.nativeEvent.changedTouches) {
      const { entered, exited } = glideTracker.current.move(
        touch.identifier,
        keyAtTouch(touch),
      );
      if (exited) releaseGlideKey(exited);
      if (entered) triggerGlideKey(entered);
    }
    syncGlidePressedKeys();
  };
  const endGlide = (event: GestureResponderEvent) => {
    for (const touch of event.nativeEvent.changedTouches) {
      const activeKey = glideTracker.current.keyForTouch(touch.identifier);
      if (activeKey) releaseGlideKey(activeKey);
      glideTracker.current.end(touch.identifier);
    }
    syncGlidePressedKeys();
  };
  const renderKey = (
    value: string,
    row: number,
    column: number,
    columns: number,
    flex = 1,
  ) => {
    const keyId = `${row}:${column}`;
    return (
      <Keycap
        key={keyId}
        label={value === " " ? t("space") : value}
        accessibilityLabel={accessibilityLabel(value)}
        testID={testID(value)}
        flex={value === " " ? 6 : flex}
        disabled={disabled}
        glidePressed={!disabled && glidePressedKeys.has(keyId)}
        touchManaged={Platform.OS !== "web"}
        reducedMotion={reducedMotion}
        theme={theme}
        onTrigger={() => hit(value)}
        onRelease={() => release(value)}
        onVisualPress={() => showFeedback(value, row, column, columns)}
        onFrame={(frame) => {
          if (frame) keyRegions.current.set(keyId, { id: keyId, ...frame });
          else keyRegions.current.delete(keyId);
        }}
      />
    );
  };

  return (
    <KeyboardDock theme={theme} height={height} bottomInset={bottomInset}>
      <View
        testID="keyboard-touch-surface"
        onTouchStart={startGlide}
        onTouchMove={moveGlide}
        onTouchEnd={endGlide}
        onTouchCancel={endGlide}
        style={styles.rows}
      >
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
