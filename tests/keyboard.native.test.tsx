import React, { useState } from "react";
import { Text } from "react-native";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import {
  findGlideKey,
  GlideTouchTracker,
  Keyboard,
} from "../src/components/Keyboard";
import { Keycap } from "../src/components/Keycap";
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
const audioEvents: ["press" | "release", string][] = [];
jest.mock("../src/audio", () => ({
  preloadTheme: async () => {},
  playKey: (phase: "press" | "release", category: string) =>
    audioEvents.push([phase, category]),
}));

beforeEach(() => {
  jest.useFakeTimers();
  audioEvents.length = 0;
});
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

test("accessible presses compose Hangul and backspace reverses the vowel", async () => {
  render(<TypingHarness />);
  await flushAccessibilityEffect();
  for (const key of ["ㅅ", "ㅏ", "ㄱ", "ㅗ", "ㅏ"]) {
    fireEvent.press(screen.getByTestId(`key-${key}`));
  }
  expect(screen.getByTestId("typed").props.children).toBe("사과");
  fireEvent.press(screen.getByTestId("key-backspace"));
  expect(screen.getByTestId("typed").props.children).toBe("사고");
});

test("five rapid accessible presses emit exactly five characters", async () => {
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

  for (let i = 0; i < 5; i++) fireEvent.press(screen.getByTestId("key-a"));

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

  fireEvent.press(screen.getByTestId("key-a"));

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
    fireEvent.press(screen.getByTestId(`key-${key}`));

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

  fireEvent.press(screen.getByTestId("key-a"));

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

  fireEvent.press(screen.getByTestId("key-⇧"));
  fireEvent.press(screen.getByTestId("key-A"));

  expect(onKey).toHaveBeenCalledTimes(1);
  expect(onKey).toHaveBeenCalledWith("A");
});

test("glide touch emits each newly crossed key once and tracks two fingers independently", () => {
  const tracker = new GlideTouchTracker();

  tracker.start(1, "q");
  expect(tracker.move(1, "q")).toEqual({ entered: null, exited: null });
  expect(tracker.move(1, "w")).toEqual({ entered: "w", exited: "q" });
  expect(tracker.move(1, "w")).toEqual({ entered: null, exited: null });
  expect(tracker.keyForTouch(1)).toBe("w");

  tracker.start(2, "a");
  expect(tracker.move(1, "e")).toEqual({ entered: "e", exited: "w" });
  expect(tracker.move(2, "s")).toEqual({ entered: "s", exited: "a" });
  expect([...tracker.pressedKeys()].sort()).toEqual(["e", "s"]);

  tracker.end(1);
  expect([...tracker.pressedKeys()]).toEqual(["s"]);
});

test("glide hit testing keeps the current key through a small boundary wobble", () => {
  const regions = [
    { id: "q", x: 0, y: 0, width: 40, height: 48 },
    { id: "w", x: 44, y: 0, width: 40, height: 48 },
  ];

  expect(findGlideKey(regions, 43, 20, "q")).toBe("q");
  expect(findGlideKey(regions, 50, 20, "q")).toBe("w");
  expect(findGlideKey(regions, 50, 60, "w")).toBeNull();
});

test("keyboard touch surface enters the starting key and each crossed key", async () => {
  const onKey = jest.fn();
  const view = render(
    <Keyboard
      language="en"
      themeId="starter"
      settings={createProfile("en").settings}
      onKey={onKey}
      feedbackMode="score"
    />,
  );
  await flushAccessibilityEffect();
  const keycaps = view.UNSAFE_getAllByType(Keycap);
  act(() => {
    keycaps
      .find((keycap) => keycap.props.label === "q")!
      .props.onFrame?.({
        x: 0,
        y: 0,
        width: 40,
        height: 48,
      });
    keycaps
      .find((keycap) => keycap.props.label === "w")!
      .props.onFrame?.({
        x: 44,
        y: 0,
        width: 40,
        height: 48,
      });
  });
  const surface = screen.getByTestId("keyboard-touch-surface");
  const touch = (pageX: number) => ({
    identifier: "finger-1",
    pageX,
    pageY: 20,
  });

  fireEvent(surface, "touchStart", {
    nativeEvent: { changedTouches: [touch(20)] },
  });
  expect(onKey).toHaveBeenLastCalledWith("q");

  fireEvent(surface, "touchMove", {
    nativeEvent: { changedTouches: [touch(60)] },
  });
  expect(onKey).toHaveBeenLastCalledWith("w");
  expect(onKey).toHaveBeenCalledTimes(2);
  expect(screen.getAllByTestId("key-feedback-event")).toHaveLength(2);

  fireEvent(surface, "touchEnd", {
    nativeEvent: { changedTouches: [touch(60)] },
  });
  expect(audioEvents).toEqual([
    ["press", "normal"],
    ["release", "normal"],
    ["press", "normal"],
    ["release", "normal"],
  ]);
  expect(onKey).toHaveBeenCalledTimes(2);
});

test("cancel outside releases the active key once without extra input", async () => {
  const onKey = jest.fn();
  const view = render(
    <Keyboard
      language="en"
      themeId="starter"
      settings={createProfile("en").settings}
      onKey={onKey}
    />,
  );
  await flushAccessibilityEffect();
  act(() => {
    view.UNSAFE_getAllByType(Keycap)
      .find((keycap) => keycap.props.label === "q")!
      .props.onFrame?.({ x: 0, y: 0, width: 40, height: 48 });
  });
  const surface = screen.getByTestId("keyboard-touch-surface");
  const touch = (pageX: number, pageY = 20) => ({
    identifier: "finger-1",
    pageX,
    pageY,
  });

  fireEvent(surface, "touchStart", {
    nativeEvent: { changedTouches: [touch(20)] },
  });
  fireEvent(surface, "touchMove", {
    nativeEvent: { changedTouches: [touch(200, 200)] },
  });
  fireEvent(surface, "touchCancel", {
    nativeEvent: { changedTouches: [touch(200, 200)] },
  });

  expect(audioEvents).toEqual([
    ["press", "normal"],
    ["release", "normal"],
  ]);
  expect(onKey).toHaveBeenCalledTimes(1);
});

test("two touches keep independent press and release lifecycles", async () => {
  const onKey = jest.fn();
  const view = render(
    <Keyboard
      language="en"
      themeId="starter"
      settings={createProfile("en").settings}
      onKey={onKey}
    />,
  );
  await flushAccessibilityEffect();
  const keycaps = view.UNSAFE_getAllByType(Keycap);
  act(() => {
    keycaps
      .find((keycap) => keycap.props.label === "q")!
      .props.onFrame?.({ x: 0, y: 0, width: 40, height: 48 });
    keycaps
      .find((keycap) => keycap.props.label === "w")!
      .props.onFrame?.({ x: 44, y: 0, width: 40, height: 48 });
  });
  const surface = screen.getByTestId("keyboard-touch-surface");
  const q = { identifier: "left", pageX: 20, pageY: 20 };
  const w = { identifier: "right", pageX: 60, pageY: 20 };

  fireEvent(surface, "touchStart", {
    nativeEvent: { changedTouches: [q, w] },
  });
  fireEvent(surface, "touchEnd", {
    nativeEvent: { changedTouches: [q, w] },
  });

  expect(audioEvents).toEqual([
    ["press", "normal"],
    ["press", "normal"],
    ["release", "normal"],
    ["release", "normal"],
  ]);
  expect(onKey).toHaveBeenCalledTimes(2);
});
