import { describe, expect, test } from "@jest/globals";
import type { ContentItem } from "../src/content";
import { createMastery } from "../src/domain";
import { createRain, tickRain, typeRain } from "../src/state/rain";

const item = (
  id: string,
  answer = "apple",
  language: "en" | "ko" = "en",
): ContentItem => ({
  id,
  kind: "WORD",
  sourceLanguage: language === "en" ? "ko" : "en",
  targetLanguage: language,
  prompt: language === "en" ? "사과" : "apple",
  canonicalAnswer: answer,
  acceptedAnswers: [answer],
  difficulty: "A1",
  category: "test",
  contentPackId: "test",
});
const mastery = (ids: string[]) =>
  Object.fromEntries(
    ids.map((id) => [id, { ...createMastery(id), stage: "RECALL" as const }]),
  );
const now = new Date("2026-09-19T00:00:00Z");

describe("Word Rain session", () => {
  test("starts with an eligible prompt and excludes new or guided-only items", () => {
    const pool = [item("guided"), item("new"), item("recall"), item("speed")];
    const records = {
      ...mastery(["recall"]),
      guided: { ...createMastery("guided"), stage: "GUIDED" as const },
      speed: { ...createMastery("speed"), stage: "SPEED" as const },
    };
    let state = createRain(pool, records, () => 0, now);
    expect(state.falling.map((word) => word.item.id)).toEqual(["recall"]);
    for (let i = 0; i < 240; i++) {
      state = tickRain(state, 250, () => 0.99);
      expect(
        state.falling.every((word) =>
          ["recall", "speed"].includes(word.item.id),
        ),
      ).toBe(true);
    }
  });
  test("exactly 60 seconds ends the score attack and further ticks/typing do nothing", () => {
    let state = createRain([item("one")], mastery(["one"]), () => 0, now);
    for (let i = 0; i < 239; i++) state = tickRain(state, 250, () => 0);
    expect(state.done).toBe(false);
    state = tickRain(state, 250, () => 0);
    expect(state.elapsedMs).toBe(60000);
    expect(state.done).toBe(true);
    expect(tickRain(state, 250)).toBe(state);
    expect(typeRain(state, "a", "en")).toBe(state);
  });
  test("foreground delta caps background jumps and never allows more than eight objects", () => {
    let state = createRain([item("one")], mastery(["one"]), () => 0, now);
    state = tickRain(state, 60000, () => 0);
    expect(state.elapsedMs).toBe(250);
    let maxVisible = 0;
    for (let i = 0; i < 240; i++) {
      state = tickRain(state, 250, () => 0);
      maxVisible = Math.max(maxVisible, state.falling.length);
      expect(state.falling.length).toBeLessThanOrEqual(8);
    }
    expect(maxVisible).toBe(8);
  });
  test("matching a shared alias removes the lowest object and logs response/rank", () => {
    const one = {
      ...item("one", "color"),
      acceptedAnswers: ["color", "colour"],
    };
    let state = createRain([one], mastery(["one"]), () => 0, now);
    state = {
      ...state,
      elapsedMs: 3000,
      falling: [
        { ...state.falling[0], instanceId: "high", y: 0.2 },
        { ...state.falling[0], instanceId: "low", y: 0.8 },
      ],
    };
    for (const key of "colour") state = typeRain(state, key, "en");
    expect(state.falling.map((word) => word.instanceId)).toEqual(["high"]);
    expect(state.input).toBe("");
    expect(state.combo).toBe(1);
    expect(state.score).toBeGreaterThan(0);
    expect(state.answers).toEqual([
      expect.objectContaining({
        contentItemId: "one",
        correct: true,
        mistakes: 0,
        hintUsed: false,
        responseTimeMs: 3000,
        mode: "RAIN",
      }),
    ]);
  });
  test("passing the fail line logs a miss and resets combo without negative score", () => {
    const original = createRain([item("one")], mastery(["one"]), () => 0, now);
    const state = tickRain(
      {
        ...original,
        combo: 4,
        falling: [{ ...original.falling[0], y: 0.999 }],
      },
      250,
      () => 0,
    );
    expect(state.combo).toBe(0);
    expect(state.falling).toHaveLength(0);
    expect(state.score).toBe(0);
    expect(state.answers[0]).toEqual(
      expect.objectContaining({
        contentItemId: "one",
        correct: false,
        mode: "RAIN",
        rank: "F",
      }),
    );
    expect(original.answers).toHaveLength(0);
  });
  test("Hangul partial syllables, backspace and invalid transitions work during play", () => {
    let state = createRain(
      [item("one", "과자", "ko")],
      mastery(["one"]),
      () => 0,
      now,
    );
    state = typeRain(state, "ㄱ", "ko");
    state = typeRain(state, "ㅗ", "ko");
    expect(state.input).toBe("고");
    expect(state.mistakes).toBe(0);
    state = typeRain(state, "ㅏ", "ko");
    state = typeRain(state, "BACKSPACE", "ko");
    expect(state.input).toBe("고");
    state = typeRain(state, "ㅏ", "ko");
    state = typeRain(state, "ㄴ", "ko");
    expect(state.mistakes).toBe(1);
    state = typeRain(state, "BACKSPACE", "ko");
    state = typeRain(state, "ㅈ", "ko");
    state = typeRain(state, "ㅏ", "ko");
    expect(state.answers[0].correct).toBe(true);
    expect(state.answers[0].mistakes).toBe(1);
    expect(state.combo).toBe(0);
  });
  test("due and low mastery items receive greater sampling weight", () => {
    const pool = [item("future"), item("due")];
    const records = mastery(["future", "due"]);
    records.future.masteryScore = 95;
    records.future.nextReviewAt = "2026-10-01T00:00:00Z";
    records.due.masteryScore = 20;
    records.due.nextReviewAt = "2026-09-18T00:00:00Z";
    // 0.2 falls in the due item's range only when both weighting factors apply.
    expect(createRain(pool, records, () => 0.2, now).falling[0].item.id).toBe(
      "due",
    );
  });
  test("empty pools, invalid deltas and empty backspace are safe", () => {
    let state = createRain([], {}, () => 0, now);
    expect(state.falling).toEqual([]);
    expect(tickRain(state, NaN)).toBe(state);
    expect(tickRain(state, -1)).toBe(state);
    state = typeRain(state, "BACKSPACE", "en");
    expect(state.input).toBe("");
    for (let i = 0; i < 240; i++) state = tickRain(state, 250, () => 0);
    expect(state.done).toBe(true);
    expect(state.answers).toHaveLength(0);
  });
});
