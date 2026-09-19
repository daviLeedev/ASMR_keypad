import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  keyboardLayout,
  motion,
  type KeyboardTheme,
} from "../design-system/theme";

export interface KeycapProps {
  label: string;
  accessibilityLabel: string;
  testID: string;
  flex?: number;
  disabled?: boolean;
  glidePressed?: boolean;
  touchManaged?: boolean;
  reducedMotion: boolean;
  theme: KeyboardTheme;
  onTrigger: () => void;
  onRelease?: () => void;
  onVisualPress?: () => void;
  onFrame?: (
    frame: { x: number; y: number; width: number; height: number } | null,
  ) => void;
}
export const keycapPressDelay = 0;

export function Keycap({
  label,
  accessibilityLabel,
  testID,
  flex = 1,
  disabled = false,
  glidePressed = false,
  touchManaged = false,
  reducedMotion,
  theme,
  onTrigger,
  onRelease,
  onVisualPress,
  onFrame,
}: KeycapProps) {
  const pressed = useSharedValue(0);
  const pressStarted = useRef(false);
  const slot = useRef<View>(null);
  const onFrameRef = useRef(onFrame);
  const topStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      pressed.value,
      [0, 1],
      [theme.surface.keyTop, theme.surface.pressedTop],
    ),
    transform: [
      {
        translateY: reducedMotion ? 0 : pressed.value * motion.keyTravel,
      },
      { scale: reducedMotion ? 1 : 1 - pressed.value * 0.015 },
    ],
  }));
  const sideStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      pressed.value,
      [0, 1],
      [theme.surface.keySide, theme.surface.pressedSide],
    ),
    opacity: reducedMotion ? 1 : 1 - pressed.value * 0.82,
  }));

  useEffect(() => {
    // Reanimated shared values are intentionally mutable UI-thread handles.
    // eslint-disable-next-line react-hooks/immutability
    pressed.value = withTiming(glidePressed ? 1 : 0, {
      duration: reducedMotion
        ? 0
        : glidePressed
          ? motion.pressMs
          : motion.releaseMs,
    });
  }, [glidePressed, pressed, reducedMotion]);
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);
  useEffect(
    () => () => {
      onFrameRef.current?.(null);
    },
    [],
  );

  const reportFrame = () => {
    requestAnimationFrame(() => {
      slot.current?.measureInWindow((x, y, width, height) => {
        onFrameRef.current?.({ x, y, width, height });
      });
    });
  };

  const pressIn = () => {
    if (disabled) return;
    pressStarted.current = true;
    // Reanimated shared values are intentionally mutable UI-thread handles.
    // eslint-disable-next-line react-hooks/immutability
    pressed.value = withTiming(1, {
      duration: reducedMotion ? 0 : motion.pressMs,
    });
    if (!touchManaged) {
      onTrigger();
      if (!reducedMotion) onVisualPress?.();
    }
  };
  const press = () => {
    if (disabled) return;
    if (!pressStarted.current) {
      onTrigger();
      if (!reducedMotion) onVisualPress?.();
    }
    pressStarted.current = false;
  };
  const release = () => {
    if (disabled) return;
    // eslint-disable-next-line react-hooks/immutability
    pressed.value = withTiming(0, {
      duration: reducedMotion ? 0 : motion.releaseMs,
    });
    if (!touchManaged) onRelease?.();
  };

  return (
    <View
      ref={slot}
      onLayout={reportFrame}
      style={[styles.slot, { flex, opacity: disabled ? 0.58 : 1 }]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.switchLayer,
          { backgroundColor: theme.surface.deckSide },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.sideLayer, sideStyle]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        aria-pressed={glidePressed}
        testID={testID}
        disabled={disabled}
        unstable_pressDelay={keycapPressDelay}
        onPressIn={pressIn}
        onPress={press}
        onPressOut={release}
        style={styles.hitArea}
      >
        <Animated.View
          testID={`${testID}-top`}
          style={[
            styles.topLayer,
            {
              shadowColor: theme.surface.deckSide,
              borderColor: theme.surface.keySide,
            },
            topStyle,
          ]}
        >
          <View pointerEvents="none" style={styles.highlight} />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              styles.legend,
              {
                color: theme.surface.legend,
                fontSize: label.length > 2 ? 11 : 16,
              },
            ]}
          >
            {label}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    minWidth: 0,
    height: keyboardLayout.keyHeight + motion.keyTravel,
    position: "relative",
  },
  switchLayer: {
    position: "absolute",
    left: 4,
    right: 4,
    top: motion.keyTravel + 4,
    height: keyboardLayout.keyHeight - 5,
    borderRadius: 7,
  },
  sideLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: motion.keyTravel,
    height: keyboardLayout.keyHeight,
    borderRadius: 8,
  },
  hitArea: {
    position: "absolute",
    inset: 0,
    height: keyboardLayout.keyHeight + motion.keyTravel,
  },
  topLayer: {
    height: keyboardLayout.keyHeight,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  highlight: {
    position: "absolute",
    top: 3,
    left: 5,
    right: 5,
    height: 1,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  legend: {
    fontWeight: "700",
    textAlign: "center",
  },
});
