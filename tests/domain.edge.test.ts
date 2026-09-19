import { describe, expect, test } from "@jest/globals";
import {
  addStudyTime,
  compose,
  createEconomy,
  createHabit,
  createMastery,
  DEFAULT_TUNING,
  decomposeKeystrokes,
  dubeolsikKey,
  localDateKey,
  scoreAnswer,
  transact,
  updateMastery,
} from "../src/domain";

describe("Domain edge regressions", () => {
  test("all modern precomposed syllables survive a keyboard-stroke roundtrip", () => {
    for (let code = 0xac00; code <= 0xd7a3; code++) {
      const text = String.fromCharCode(code);
      expect(compose(decomposeKeystrokes(text))).toBe(text);
    }
  });
  test("Dubeolsik rows, shifted keys, and sequential final migration", () => {
    expect([..."qwertyuiop"].map(dubeolsikKey).join("")).toBe(
      "ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ",
    );
    expect([..."QWERTOP"].map(dubeolsikKey).join("")).toBe("ㅃㅉㄸㄲㅆㅒㅖ");
    expect(compose([..."rksk"].map(dubeolsikKey))).toBe("가나");
    expect(compose(["ㄱ", "ㅗ", "ㅏ", "Backspace", "ㅣ"])).toBe("괴");
    expect(compose(["Backspace"])).toBe("");
  });
  test("mastery evidence must pair distinct dates with distinct sessions", () => {
    const record = {
      ...createMastery("one"),
      stage: "SPEED" as const,
      masteryScore: 100,
    };
    const attempt = {
      mode: "SPEED" as const,
      correct: true,
      mistakes: 0,
      hintUsed: false,
      elapsedMs: 500,
      rank: "S" as const,
      at: "2026-09-19T00:00:00Z",
      sessionId: "one",
    };
    let updated = updateMastery(record, attempt);
    updated = updateMastery(updated, { ...attempt, sessionId: "two" });
    updated = updateMastery(updated, { ...attempt, sessionId: "three" });
    updated = updateMastery(updated, {
      ...attempt,
      at: "2026-09-20T00:00:00Z",
    });
    updated = updateMastery(updated, {
      ...attempt,
      at: "2026-09-21T00:00:00Z",
    });
    expect(updated.stage).toBe("SPEED");
    expect(updated.highRankDates).toEqual(["2026-09-19"]);
  });
  test("invalid numeric economy inputs cannot corrupt balance", () => {
    for (const amount of [NaN, Infinity, 1.5])
      expect(() =>
        transact(createEconomy(), {
          id: "one",
          amount,
          reason: "TEST",
          at: "2026-09-19",
        }),
      ).toThrow("INVALID_TRANSACTION");
  });
  test("local study intervals handle daylight saving fall-back and spring-forward", () => {
    const spring = addStudyTime(
      {},
      new Date("2026-03-08T05:00:00Z"),
      new Date("2026-03-09T04:00:00Z"),
      300,
      "America/New_York",
    );
    expect(spring["2026-03-08"].activeStudySeconds).toBe(23 * 3600);
    expect(Object.keys(spring)).toEqual(["2026-03-08"]);
    const fall = addStudyTime(
      {},
      new Date("2026-11-01T04:00:00Z"),
      new Date("2026-11-02T05:00:00Z"),
      300,
      "America/New_York",
    );
    expect(fall["2026-11-01"].activeStudySeconds).toBe(25 * 3600);
    expect(Object.keys(fall)).toEqual(["2026-11-01"]);
  });
  test("completed daily progress stays complete and inactive intervals add nothing", () => {
    const date = new Date("2026-09-19T00:00:00Z");
    const original = createHabit();
    expect(addStudyTime(original.daily, date, date, 300)).toBe(original.daily);
    const progress = addStudyTime(
      {},
      date,
      new Date(date.getTime() + 300000),
      300,
      "Asia/Seoul",
    );
    expect(progress["2026-09-19"].goalCompleted).toBe(true);
    expect(localDateKey(date, "Asia/Seoul")).toBe("2026-09-19");
  });
  test("ranking includes time thresholds exactly and clamps accuracy", () => {
    const input = {
      correct: true,
      expectedKeystrokes: 5,
      mistakes: 0,
      hintUsed: false,
      elapsedMs: 0,
    };
    const config = { ...DEFAULT_TUNING, baseTimeMs: 1000, perKeyTimeMs: 0 };
    for (const [elapsedMs, rank] of [
      [650, "S+"],
      [850, "S"],
      [1100, "A"],
      [1400, "B"],
      [1401, "C"],
    ] as const)
      expect(scoreAnswer({ ...input, elapsedMs }, config).rank).toBe(rank);
    expect(scoreAnswer({ ...input, mistakes: -5 }).accuracy).toBe(100);
    expect(scoreAnswer(input).wpm).toBe(0);
  });
});
