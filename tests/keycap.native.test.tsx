import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Keycap, keycapPressDelay } from "../src/components/Keycap";
import { getTheme } from "../src/design-system/theme";

jest.mock("react-native-reanimated", () => {
  // The mock factory must load React Native after Jest has initialized modules.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactNative = require("react-native");
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    interpolateColor: (value: number, _input: number[], output: string[]) =>
      output[value >= 1 ? 1 : 0],
    useAnimatedStyle: (factory: () => object) => factory(),
    useSharedValue: (value: number) => ({ value }),
    withTiming: (value: number) => value,
  };
});

test("press-in triggers one character and preserves the accessible label", () => {
  const onTrigger = jest.fn();
  const onRelease = jest.fn();
  render(
    <Keycap
      label="a"
      accessibilityLabel="Letter a"
      testID="key-a"
      reducedMotion={false}
      theme={getTheme("starter")}
      onTrigger={onTrigger}
      onRelease={onRelease}
    />,
  );

  fireEvent(screen.getByTestId("key-a"), "pressIn");
  fireEvent.press(screen.getByTestId("key-a"));
  fireEvent(screen.getByTestId("key-a"), "pressOut");

  expect(onTrigger).toHaveBeenCalledTimes(1);
  expect(onRelease).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Letter a")).toBeTruthy();
  expect(keycapPressDelay).toBe(0);
});

test("disabled keycap emits neither input nor a visual event", () => {
  const onTrigger = jest.fn();
  const onVisualPress = jest.fn();
  const onRelease = jest.fn();
  render(
    <Keycap
      label="a"
      accessibilityLabel="Letter a"
      testID="key-a"
      disabled
      reducedMotion={false}
      theme={getTheme("starter")}
      onTrigger={onTrigger}
      onVisualPress={onVisualPress}
      onRelease={onRelease}
    />,
  );

  fireEvent(screen.getByTestId("key-a"), "pressIn");
  fireEvent(screen.getByTestId("key-a"), "pressOut");

  expect(onTrigger).not.toHaveBeenCalled();
  expect(onVisualPress).not.toHaveBeenCalled();
  expect(onRelease).not.toHaveBeenCalled();
});

test("a cancelled press releases once", () => {
  const onRelease = jest.fn();
  render(
    <Keycap
      label="a"
      accessibilityLabel="Letter a"
      testID="key-a"
      reducedMotion={false}
      theme={getTheme("starter")}
      onTrigger={() => {}}
      onRelease={onRelease}
    />,
  );

  fireEvent(screen.getByTestId("key-a"), "pressIn");
  fireEvent(screen.getByTestId("key-a"), "pressOut");
  expect(onRelease).toHaveBeenCalledTimes(1);
});

test("reduced motion keeps input but suppresses popup animation", () => {
  const onTrigger = jest.fn();
  const onVisualPress = jest.fn();
  render(
    <Keycap
      label="a"
      accessibilityLabel="Letter a"
      testID="key-a"
      reducedMotion
      theme={getTheme("starter")}
      onTrigger={onTrigger}
      onVisualPress={onVisualPress}
    />,
  );

  fireEvent(screen.getByTestId("key-a"), "pressIn");

  expect(onTrigger).toHaveBeenCalledTimes(1);
  expect(onVisualPress).not.toHaveBeenCalled();
});

test("glide press exposes the pressed state for visuals and accessibility", () => {
  render(
    <Keycap
      label="w"
      accessibilityLabel="Letter w"
      testID="key-w"
      reducedMotion={false}
      theme={getTheme("starter")}
      onTrigger={() => {}}
      glidePressed
    />,
  );

  expect(screen.getByLabelText("Letter w").props["aria-pressed"]).toBe(true);
});

test("touch-managed key leaves physical input to the keyboard surface but keeps accessible press", () => {
  const onTrigger = jest.fn();
  const onVisualPress = jest.fn();
  render(
    <Keycap
      label="q"
      accessibilityLabel="Letter q"
      testID="key-q"
      reducedMotion={false}
      theme={getTheme("starter")}
      onTrigger={onTrigger}
      onVisualPress={onVisualPress}
      touchManaged
    />,
  );

  fireEvent(screen.getByTestId("key-q"), "pressIn");
  fireEvent.press(screen.getByTestId("key-q"));
  expect(onTrigger).not.toHaveBeenCalled();
  expect(onVisualPress).not.toHaveBeenCalled();

  fireEvent.press(screen.getByTestId("key-q"));
  expect(onTrigger).toHaveBeenCalledTimes(1);
  expect(onVisualPress).toHaveBeenCalledTimes(1);
});
