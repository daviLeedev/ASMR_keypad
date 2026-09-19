import { describe, expect, test } from "@jest/globals";
import {
  compose,
  decomposeKeystrokes,
  dubeolsikKey,
  normalizeAnswer,
  matchesAnswer,
  isValidPrefix,
  updateTyping,
  scoreAnswer,
  updateCombo,
  DEFAULT_TUNING,
  createMastery,
  updateMastery,
  createEconomy,
  transact,
  grantRewardedAd,
  unlockTheme,
  sessionReward,
  levelForXp,
  localDateKey,
  addStudyTime,
  completeDay,
  eligibleForRain,
  selectRainMatch,
  rainWeight,
  selectWeightedRain,
} from "../src/domain";

describe("Hangul composition", () => {
  test.each([
    ["ㄱㅏ", "가"],
    ["ㄱㅏㄴ", "간"],
    ["ㄱㅗㅏ", "과"],
    ["ㄱㅜㅓ", "궈"],
    ["ㅇㅡㅣ", "의"],
    ["ㄷㅏㄹㄱ", "닭"],
    ["ㄷㅏㄹㄱㅏ", "달가"],
    ["ㄱㅏㄴㅏ", "가나"],
    ["ㅇㅣㄹㄱㅇㅓ", "읽어"],
    ["ㅂㅏㅂㅅ", "밦"],
    ["ㅎㅏㄴ ㄱㅡㄹ", "한 글"],
    ["ㅗㅏ", "ㅘ"],
    ["ㄲㅏ", "까"],
  ])("%s becomes %s", (keys, expected) =>
    expect(compose([...keys])).toBe(expected),
  );
  test("backspace removes one physical composition stroke", () => {
    const keys = decomposeKeystrokes("괜찮아");
    expect(compose(keys)).toBe("괜찮아");
    expect(compose(decomposeKeystrokes("닭").slice(0, -1))).toBe("달");
    expect(compose(decomposeKeystrokes("과").slice(0, -1))).toBe("고");
    expect(compose(["ㄱ", "ㅏ", "ㄴ", "Backspace"])).toBe("가");
  });
  test("decomposes NFC, NFD and keyboard shift correctly", () => {
    expect(decomposeKeystrokes("괜")).toEqual(["ㄱ", "ㅗ", "ㅐ", "ㄴ"]);
    expect(decomposeKeystrokes("한".normalize("NFD"))).toEqual([
      "ㅎ",
      "ㅏ",
      "ㄴ",
    ]);
    expect(dubeolsikKey("r")).toBe("ㄱ");
    expect(dubeolsikKey("R")).toBe("ㄲ");
  });
});

describe("Answer comparison and typing accuracy", () => {
  test("normalizes Unicode/case while preserving lexical punctuation", () => {
    expect(normalizeAnswer("  APPLE  ")).toBe("apple");
    expect(matchesAnswer("한글".normalize("NFD"), ["한글"])).toBe(true);
    expect(matchesAnswer("colour", ["color", "colour"])).toBe(true);
    expect(matchesAnswer("cant", ["can't"])).toBe(false);
    expect(
      matchesAnswer("hello!", ["hello"], { punctuation: "ignore-terminal" }),
    ).toBe(true);
  });
  test("partial syllables remain valid prefixes including final migration", () => {
    for (const prefix of ["ㄱ", "고", "괘", "괜"])
      expect(isValidPrefix(prefix, ["괜찮아"])).toBe(true);
    expect(isValidPrefix("간", ["가나"])).toBe(true);
    expect(isValidPrefix("걱", ["과자"])).toBe(false);
    expect(isValidPrefix("col", ["color", "colour"])).toBe(true);
  });
  test("counts transitions into invalid input, never correction itself", () => {
    let state = { input: "", mistakes: 0, invalid: false };
    for (const input of ["a", "ax", "axy", "ax", "a", "ap", "apx"])
      state = updateTyping(state, input, ["apple"]);
    expect(state.mistakes).toBe(2);
    expect(updateTyping(state, "app", ["apple"]).mistakes).toBe(2);
  });
});

describe("Scoring and progression", () => {
  test("ranks use configurable time ratios and accuracy", () => {
    const clean = {
      correct: true,
      expectedKeystrokes: 5,
      elapsedMs: 1200,
      mistakes: 0,
      hintUsed: false,
    };
    expect(scoreAnswer(clean).rank).toBe("S+");
    expect(scoreAnswer({ ...clean, mistakes: 1 }).rank).not.toBe("S+");
    expect(scoreAnswer({ ...clean, correct: false }).rank).toBe("F");
    expect(
      scoreAnswer(clean, {
        ...DEFAULT_TUNING,
        baseTimeMs: 100,
        perKeyTimeMs: 100,
      }).rank,
    ).toBe("C");
    expect(scoreAnswer({ ...clean, mistakes: 100 }).accuracy).toBe(0);
    expect(
      scoreAnswer({ ...clean, elapsedMs: 60000, expectedKeystrokes: 25 }).wpm,
    ).toBe(5);
  });
  test("perfect increments combo, mistakes or hints preserve it, wrong resets", () => {
    expect(
      updateCombo(4, { correct: true, mistakes: 0, hintUsed: false }),
    ).toEqual({ combo: 5, milestone: 5 });
    expect(
      updateCombo(4, { correct: true, mistakes: 1, hintUsed: false }).combo,
    ).toBe(4);
    expect(
      updateCombo(4, { correct: false, mistakes: 0, hintUsed: false }).combo,
    ).toBe(0);
  });
  test("guidance cannot produce mastery or rain eligibility", () => {
    let record = createMastery("apple");
    for (let i = 0; i < 50; i++)
      record = updateMastery(record, {
        mode: "GUIDED",
        correct: true,
        mistakes: 0,
        hintUsed: false,
        elapsedMs: 1000,
        at: "2026-09-19T10:00:00Z",
        sessionId: "same",
      });
    expect(record.stage).toBe("GUIDED");
    expect(eligibleForRain(record)).toBe(false);
  });
  test("recall promotes stages but mastery needs separated days and sessions", () => {
    let record = createMastery("apple");
    const answer = {
      mode: "RECALL" as const,
      correct: true,
      mistakes: 0,
      hintUsed: false,
      elapsedMs: 1000,
      at: "2026-09-19T10:00:00Z",
      sessionId: "same",
      rank: "S" as const,
    };
    for (let i = 0; i < 30; i++) record = updateMastery(record, answer);
    expect(record.stage).toBe("SPEED");
    for (const [day, id] of [
      [20, "two"],
      [21, "three"],
      [22, "four"],
    ] as const)
      record = updateMastery(record, {
        ...answer,
        mode: "SPEED",
        at: `2026-09-${day}T10:00:00Z`,
        sessionId: id,
      });
    expect(record.stage).toBe("MASTERED");
    expect(record.nextReviewAt).toBe("2026-10-06T10:00:00.000Z");
  });
  test("hints earn less mastery and failure schedules an earlier review", () => {
    const record = { ...createMastery("apple"), masteryScore: 90 };
    const attempt = {
      mode: "RECALL" as const,
      correct: true,
      mistakes: 0,
      hintUsed: false,
      elapsedMs: 1000,
      at: "2026-09-19T10:00:00Z",
      sessionId: "one",
    };
    expect(
      updateMastery(record, { ...attempt, hintUsed: true }).masteryScore,
    ).toBeLessThan(updateMastery(record, attempt).masteryScore);
    expect(
      updateMastery(record, { ...attempt, correct: false }).nextReviewAt,
    ).toBe("2026-09-19T10:10:00.000Z");
  });
});

describe("Economy", () => {
  test("ledger grants are immutable and idempotent with balance enforcement", () => {
    const original = createEconomy();
    const credited = transact(original, {
      id: "reward:1",
      amount: 20,
      reason: "SESSION",
      at: "2026-09-19T00:00:00Z",
    });
    expect(original.balance).toBe(0);
    expect(credited.balance).toBe(20);
    expect(
      transact(credited, {
        id: "reward:1",
        amount: 20,
        reason: "SESSION",
        at: "2026-09-19T00:00:00Z",
      }),
    ).toEqual(credited);
    expect(() =>
      transact(credited, {
        id: "spend",
        amount: -21,
        reason: "UNLOCK",
        at: "2026-09-19T00:00:00Z",
      }),
    ).toThrow("INSUFFICIENT_BALANCE");
  });
  test("successful rewarded ads cap at three per local day and reject duplicate receipts", () => {
    let state = createEconomy();
    for (let i = 0; i < 3; i++)
      state = grantRewardedAd(state, {
        receiptId: `ad${i}`,
        completed: true,
        date: "2026-09-19",
        at: "2026-09-19T10:00:00Z",
      });
    expect(state.balance).toBe(30);
    expect(
      grantRewardedAd(state, {
        receiptId: "ad0",
        completed: true,
        date: "2026-09-20",
        at: "2026-09-20T10:00:00Z",
      }).balance,
    ).toBe(30);
    expect(
      grantRewardedAd(state, {
        receiptId: "ad4",
        completed: true,
        date: "2026-09-19",
        at: "2026-09-19T10:00:00Z",
      }).balance,
    ).toBe(30);
    expect(
      grantRewardedAd(state, {
        receiptId: "failed",
        completed: false,
        date: "2026-09-20",
        at: "2026-09-20T10:00:00Z",
      }).balance,
    ).toBe(30);
    expect(
      grantRewardedAd(state, {
        receiptId: "ad5",
        completed: true,
        date: "2026-09-20",
        at: "2026-09-20T10:00:00Z",
      }).balance,
    ).toBe(40);
  });
  test("theme unlock checks level, balance, and duplicate purchases", () => {
    const theme = { id: "cream", unlockLevel: 3, tokenCost: 300 };
    const state = { ...createEconomy(), balance: 400 };
    expect(() => unlockTheme(state, theme, 2, "2026-09-19")).toThrow(
      "LEVEL_REQUIRED",
    );
    expect(() => unlockTheme(createEconomy(), theme, 3, "2026-09-19")).toThrow(
      "INSUFFICIENT_BALANCE",
    );
    const bought = unlockTheme(state, theme, 3, "2026-09-19");
    expect(bought.balance).toBe(100);
    expect(unlockTheme(bought, theme, 3, "2026-09-19")).toEqual(bought);
  });
  test("session rewards penalize hints and guided pays less; XP levels are configurable", () => {
    expect(sessionReward("GUIDED", 3, 3, 0).tokens).toBeLessThan(
      sessionReward("RECALL", 3, 3, 0).tokens,
    );
    expect(sessionReward("RECALL", 3, 3, 2).xp).toBeLessThan(
      sessionReward("RECALL", 3, 3, 0).xp,
    );
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(300)).toBeGreaterThan(1);
  });
});

describe("Local calendar habits and rain", () => {
  test("local dates honor timezone and study interval splits at midnight", () => {
    expect(localDateKey(new Date("2026-09-19T16:00:00Z"), "Asia/Seoul")).toBe(
      "2026-09-20",
    );
    const progress = addStudyTime(
      {},
      new Date("2026-09-19T14:59:50Z"),
      new Date("2026-09-19T15:00:10Z"),
      300,
      "Asia/Seoul",
    );
    expect(progress["2026-09-19"].activeStudySeconds).toBe(10);
    expect(progress["2026-09-20"].activeStudySeconds).toBe(10);
  });
  test("streak is idempotent and freeze bridges exactly the missing day", () => {
    const state = {
      currentStreak: 2,
      longestStreak: 2,
      lastCompletedDate: "2026-09-17",
      streakFreezeCount: 1,
    };
    const completed = completeDay(state, "2026-09-19");
    expect(completed.currentStreak).toBe(3);
    expect(completed.streakFreezeCount).toBe(0);
    expect(completeDay(completed, "2026-09-19")).toEqual(completed);
    expect(completeDay(completed, "2026-09-22").currentStreak).toBe(1);
    expect(completeDay(completed, "2026-09-18")).toEqual(completed);
  });
  test("rain excludes guided and matches the lowest duplicate alias", () => {
    const words = [
      { instanceId: "one", y: 20, acceptedAnswers: ["color", "colour"] },
      { instanceId: "two", y: 100, acceptedAnswers: ["colour"] },
    ];
    expect(selectRainMatch(words, "colour")?.instanceId).toBe("two");
    expect(selectRainMatch(words, "missing")).toBeUndefined();
    expect(eligibleForRain({ stage: "RECALL" })).toBe(true);
    expect(eligibleForRain({ stage: "NEW" })).toBe(false);
    expect(rainWeight(20)).toBeGreaterThan(rainWeight(90));
    expect(
      selectWeightedRain(
        [
          { id: "a", masteryScore: 20 },
          { id: "b", masteryScore: 90 },
        ],
        0,
      )?.id,
    ).toBe("a");
    expect(selectWeightedRain([], 0.5)).toBeUndefined();
  });
});
