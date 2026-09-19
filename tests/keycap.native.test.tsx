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
  render(
    <Keycap
      label="a"
      accessibilityLabel="Letter a"
      testID="key-a"
      reducedMotion={false}
      theme={getTheme("starter")}
      onTrigger={onTrigger}
    />,
  );

  fireEvent(screen.getByTestId("key-a"), "pressIn");
  fireEvent.press(screen.getByTestId("key-a"));

  expect(onTrigger).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Letter a")).toBeTruthy();
  expect(keycapPressDelay).toBe(0);
});

test("disabled keycap emits neither input nor a visual event", () => {
  const onTrigger = jest.fn();
  const onVisualPress = jest.fn();
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
    />,
  );

  fireEvent(screen.getByTestId("key-a"), "pressIn");

  expect(onTrigger).not.toHaveBeenCalled();
  expect(onVisualPress).not.toHaveBeenCalled();
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
