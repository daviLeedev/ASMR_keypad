import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import AudioCredits from "../app/audio-credits";
import Settings from "../app/settings";
import { createProfile } from "../src/state/model";
import "../src/localization";

const mockPush = jest.fn();
const profile = createProfile("en");
const mockState = {
  profile,
  setSettings: jest.fn(),
  update: jest.fn(),
  persist: jest.fn(),
};

jest.mock("expo-router", () => ({
  useFocusEffect: jest.fn(),
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: jest.fn(),
    canGoBack: () => false,
    back: jest.fn(),
  },
}));
jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isLoading: false }),
}));
jest.mock("../src/state/store", () => ({
  useApp: Object.assign(
    (selector: (state: typeof mockState) => unknown) => selector(mockState),
    { getState: () => mockState },
  ),
}));
jest.mock("../src/services", () => ({
  getPurchaseProvider: () => ({
    mode: "unavailable",
    loadOfferings: async () => [],
    purchase: async () => ({ status: "failed" }),
    restore: async () => ({ status: "failed", entitlements: [] }),
  }),
  scheduleReminder: async () => false,
  cancelReminder: async () => {},
}));
jest.mock("../src/analytics", () => ({ track: jest.fn() }));

test("credits list every physical switch identity, source, and license", async () => {
  render(<AudioCredits />);
  await act(async () => {});
  for (const identity of [
    "Brown Tactile",
    "Blue Click",
    "Cream Linear",
    "Deep Thock",
    "Buckling Spring",
    "Airy Linear",
    "Heavy Linear",
  ]) {
    expect(screen.getByText(identity)).toBeTruthy();
  }
  expect(screen.getAllByText(/kbsim/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/MIT/).length).toBeGreaterThan(0);
});

test("settings opens bundled audio credits", async () => {
  render(<Settings />);
  await act(async () => {});
  fireEvent.press(screen.getByTestId("open-audio-credits"));
  expect(mockPush).toHaveBeenCalledWith("/audio-credits");
});
