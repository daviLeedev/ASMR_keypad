import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion } from "../src/components/useReducedMotion";

let mockPreference = false;
jest.mock("../src/state/store", () => ({
  useApp: (selector: (s: unknown) => unknown) =>
    selector({ profile: { settings: { reducedMotion: mockPreference } } }),
}));

afterEach(() => {
  jest.restoreAllMocks();
  mockPreference = false;
});

test("motion follows OS changes, honors app preference, and removes its listener", async () => {
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockResolvedValue(false);
  let changed: (value: boolean) => void = () => {};
  const remove = jest.fn();
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(((
    _event: string,
    listener: (value: boolean) => void,
  ) => {
    changed = listener;
    return { remove };
  }) as unknown as typeof AccessibilityInfo.addEventListener);
  const { result, rerender, unmount } = renderHook(useReducedMotion);
  await waitFor(() => expect(result.current).toBe(false));
  act(() => changed(true));
  expect(result.current).toBe(true);
  act(() => changed(false));
  expect(result.current).toBe(false);
  mockPreference = true;
  rerender({});
  expect(result.current).toBe(true);
  unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});
