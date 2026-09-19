import React, { useState } from "react";
import { Text } from "react-native";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import { Keyboard } from "../src/components/Keyboard";
import { createProfile } from "../src/state/model";
import { compose } from "../src/domain";
import "../src/localization";
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
jest.mock("../src/audio", () => ({
  preloadTheme: async () => {},
  playKey: () => {},
}));

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  act(() => jest.runOnlyPendingTimers());
  cleanup();
  jest.useRealTimers();
});
function TypingHarness() {
  const [keys, setKeys] = useState<string[]>([]);
  return (
    <>
      <Text testID="typed">{compose(keys)}</Text>
      <Keyboard
        language="ko"
        themeId="starter"
        settings={createProfile("en").settings}
        onKey={(key) =>
          setKeys((old) =>
            key === "BACKSPACE" ? old.slice(0, -1) : [...old, key],
          )
        }
      />
    </>
  );
}
async function flushAccessibilityEffect() {
  await act(async () => {});
}

test("native press-in composes Hangul, press does not duplicate, and backspace reverses the vowel", async () => {
  render(<TypingHarness />);
  await flushAccessibilityEffect();
  for (const key of ["ㅅ", "ㅏ", "ㄱ", "ㅗ", "ㅏ"]) {
    fireEvent(screen.getByTestId(`key-${key}`), "pressIn");
    fireEvent.press(screen.getByTestId(`key-${key}`));
  }
  expect(screen.getByTestId("typed").props.children).toBe("사과");
  fireEvent(screen.getByTestId("key-backspace"), "pressIn");
  fireEvent.press(screen.getByTestId("key-backspace"));
  expect(screen.getByTestId("typed").props.children).toBe("사고");
});

test("five rapid press-in events emit exactly five characters", async () => {
  const onKey = jest.fn();
  render(
    <Keyboard
      language="en"
      themeId="starter"
      settings={createProfile("en").settings}
      onKey={onKey}
    />,
  );
  await flushAccessibilityEffect();

  for (let i = 0; i < 5; i++) fireEvent(screen.getByTestId("key-a"), "pressIn");

  expect(onKey).toHaveBeenCalledTimes(5);
  expect(onKey).toHaveBeenNthCalledWith(5, "a");
});

test("disabled keyboard emits no character and no feedback", async () => {
  const onKey = jest.fn();
  render(
    <Keyboard
      language="en"
      themeId="starter"
      settings={createProfile("en").settings}
      onKey={onKey}
      disabled
      feedbackMode="score"
    />,
  );
  await flushAccessibilityEffect();

  fireEvent(screen.getByTestId("key-a"), "pressIn");

  expect(onKey).not.toHaveBeenCalled();
  expect(screen.queryAllByTestId("key-feedback-event")).toHaveLength(0);
});

test("feedback layer keeps only the three most recent score events", async () => {
  const onKey = jest.fn();
  render(
    <Keyboard
      language="en"
      themeId="starter"
      settings={createProfile("en").settings}
      onKey={onKey}
      feedbackMode="score"
    />,
  );
  await flushAccessibilityEffect();

  for (const key of ["a", "s", "d", "f", "g"])
    fireEvent(screen.getByTestId(`key-${key}`), "pressIn");

  const events = screen.getAllByTestId("key-feedback-event");
  expect(events).toHaveLength(3);
  expect(events.map((event) => event.props.children)).toEqual([
    "+1",
    "+1",
    "+1",
  ]);
});

test("reduced motion keeps input and suppresses score popups", async () => {
  const onKey = jest.fn();
  const settings = createProfile("en").settings;
  settings.reducedMotion = true;
  render(
    <Keyboard
      language="en"
      themeId="starter"
      settings={settings}
      onKey={onKey}
      feedbackMode="score"
    />,
  );
  await flushAccessibilityEffect();

  fireEvent(screen.getByTestId("key-a"), "pressIn");

  expect(onKey).toHaveBeenCalledWith("a");
  expect(screen.queryAllByTestId("key-feedback-event")).toHaveLength(0);
});

test("shift emits one uppercase character", async () => {
  const onKey = jest.fn();
  render(
    <Keyboard
      language="en"
      themeId="starter"
      settings={createProfile("en").settings}
      onKey={onKey}
    />,
  );
  await flushAccessibilityEffect();

  fireEvent(screen.getByTestId("key-⇧"), "pressIn");
  fireEvent(screen.getByTestId("key-A"), "pressIn");

  expect(onKey).toHaveBeenCalledTimes(1);
  expect(onKey).toHaveBeenCalledWith("A");
});
