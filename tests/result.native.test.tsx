import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { seedItems } from "../src/content";
import { createProfile, type SessionSummary } from "../src/state/model";
import Result from "../app/result";
import "../src/localization";

const mockReplace = jest.fn();
const sentence = seedItems.find((item) => item.kind === "SENTENCE")!;
const mockProfile = createProfile("en");
const mockResult: SessionSummary = {
  id: "sentence-result",
  mode: "GUIDED",
  tutorial: false,
  startedAt: "2026-09-19T00:00:00.000Z",
  endedAt: "2026-09-19T00:00:10.000Z",
  durationMs: 10000,
  answers: [
    {
      contentItemId: sentence.id,
      correct: true,
      mistakes: 0,
      hintUsed: false,
      responseTimeMs: 10000,
      rank: "A",
      mode: "GUIDED",
      wpm: 32,
    },
  ],
  correct: 1,
  total: 1,
  mistakes: 0,
  hints: 0,
  xp: 10,
  tokens: 2,
  rank: "A",
};
const mockState = { lastResult: mockResult, profile: mockProfile };

jest.mock("expo-router", () => ({
  useFocusEffect: jest.fn(),
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    dismissTo: (...args: unknown[]) => mockReplace(...args),
  },
}));
jest.mock("../src/state/store", () => ({
  useApp: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));
jest.mock("../src/services", () => ({
  getAdProvider: () => ({ mode: "unavailable", showRewardedAd: jest.fn() }),
}));
jest.mock("../src/analytics", () => ({ track: jest.fn() }));

test("sentence results show WPM and separate retry from home", async () => {
  render(<Result />);
  await act(async () => {
    await Promise.resolve();
  });

  expect(screen.getByTestId("result-wpm").props.children).toEqual([32, " WPM"]);
  fireEvent.press(screen.getByTestId("retry-session"));
  expect(mockReplace).toHaveBeenCalledWith(
    "/practice?mode=GUIDED&kind=SENTENCE",
  );
  fireEvent.press(screen.getByTestId("result-home"));
  expect(mockReplace).toHaveBeenLastCalledWith("/home");
});
