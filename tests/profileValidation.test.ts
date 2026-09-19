import { parseProfile } from "../src/state/validation";
import {
  createProfile,
  applySession,
  applyStarterPack,
} from "../src/state/model";
import { createMastery, transact } from "../src/domain";

describe("saved profile validation", () => {
  test("roundtrips a current profile with actual tutorial, purchase and ledger data", () => {
    const initial = createProfile("ko");
    const learned = applySession(initial, {
      id: "tutorial-1",
      mode: "GUIDED",
      tutorial: true,
      startedAt: "2026-09-19T00:00:00.000Z",
      endedAt: "2026-09-19T00:00:10.000Z",
      durationMs: 10000,
      answers: [
        {
          contentItemId: "ko-en-word-001",
          correct: true,
          mistakes: 0,
          hintUsed: false,
          responseTimeMs: 800,
          rank: "A",
          mode: "GUIDED",
        },
      ],
    });
    const purchased = applyStarterPack(learned, "purchase-1");
    const saved = JSON.parse(JSON.stringify(purchased));
    expect(parseProfile(saved)).toEqual(saved);
    expect(parseProfile(createProfile("en"))).toEqual(createProfile("en"));
  });
  test("throws on corrupt objects without mutating or resetting saved progress", () => {
    const corrupted = {
      ...createProfile("ko"),
      xp: 123,
      economy: { balance: 500, ledger: "broken" },
    };
    const before = JSON.stringify(corrupted);
    expect(() => parseProfile(corrupted)).toThrow();
    expect(JSON.stringify(corrupted)).toBe(before);
  });
  test.each([
    ["version", { version: 2 }],
    ["negative xp", { xp: -1 }],
    ["NaN xp", { xp: NaN }],
    ["infinite xp", { xp: Infinity }],
    ["sessions", { sessions: {} }],
    ["best", { best: { one: -1 } }],
    ["best NaN", { best: { one: NaN } }],
    ["unknown theme", { selectedThemeId: "made-up" }],
    ["unowned theme", { selectedThemeId: "midnight" }],
  ])("rejects %s", (_name, change) => {
    expect(() => parseProfile({ ...createProfile("en"), ...change })).toThrow();
  });
  test.each([
    { soundEnabled: "false" },
    { volume: 1.1 },
    { volume: NaN },
    { uiLanguage: "fr" },
    { studyLanguage: "ja" },
    { dailyGoalMinutes: 6 },
    { reminderHour: 24 },
    { reminderMinute: -1 },
    { tutorialCompleted: null },
  ])("rejects malformed settings %j", (settings) => {
    const profile = createProfile("en");
    expect(() =>
      parseProfile({
        ...profile,
        settings: { ...profile.settings, ...settings },
      }),
    ).toThrow();
  });
  test("checks every ledger balance, final total, unique IDs and accepts zero grants", () => {
    const profile = createProfile("en");
    let economy = transact(profile.economy, {
      id: "grant",
      amount: 30,
      reason: "session",
      at: "2026-09-19T00:00:00Z",
    });
    economy = transact(economy, {
      id: "spend",
      amount: -10,
      reason: "theme",
      at: "2026-09-19T00:01:00Z",
    });
    economy = transact(economy, {
      id: "zero",
      amount: 0,
      reason: "session",
      at: "2026-09-19T00:02:00Z",
    });
    expect(parseProfile({ ...profile, economy }).economy.balance).toBe(20);
    for (const invalid of [
      { ...economy, balance: 21 },
      { ...economy, balance: -1 },
      { ...economy, balance: NaN },
      {
        ...economy,
        ledger: [
          { ...economy.ledger[0], balanceAfter: 31 },
          ...economy.ledger.slice(1),
        ],
      },
      { ...economy, ledger: [...economy.ledger, economy.ledger[2]] },
      { ...economy, ledger: [{ ...economy.ledger[0], amount: 1.5 }] },
    ])
      expect(() => parseProfile({ ...profile, economy: invalid })).toThrow();
  });
  test("checks mastery ranges and keys and rejects impossible stages", () => {
    const profile = createProfile("en"),
      record = createMastery("en-ko-word-001");
    expect(
      parseProfile({ ...profile, mastery: { [record.contentItemId]: record } })
        .mastery[record.contentItemId].stage,
    ).toBe("NEW");
    for (const change of [
      { stage: "UNLOCKED" },
      { masteryScore: 101 },
      { seenCount: -1 },
      { hintCount: NaN },
      { bestTimeMs: -1 },
      { highRankDates: ["not-a-date"] },
      { contentItemId: "other" },
    ])
      expect(() =>
        parseProfile({
          ...profile,
          mastery: { [record.contentItemId]: { ...record, ...change } },
        }),
      ).toThrow();
  });
  test("checks calendar days, day keys and streak bounds", () => {
    const profile = createProfile("en");
    for (const habit of [
      { daily: [], streak: profile.habit.streak },
      {
        daily: {
          "2026-09-19": {
            date: "2026-09-20",
            activeStudySeconds: 0,
            goalSeconds: 300,
            goalCompleted: false,
          },
        },
        streak: profile.habit.streak,
      },
      {
        daily: {
          "2026-02-30": {
            date: "2026-02-30",
            activeStudySeconds: 0,
            goalSeconds: 300,
            goalCompleted: false,
          },
        },
        streak: profile.habit.streak,
      },
      {
        daily: {},
        streak: { ...profile.habit.streak, currentStreak: 2, longestStreak: 1 },
      },
    ])
      expect(() => parseProfile({ ...profile, habit })).toThrow();
  });
  test("rejects malformed answer rows and more than 100 stored sessions", () => {
    const profile = applySession(createProfile("en"), {
      id: "one",
      mode: "SPEED",
      tutorial: false,
      startedAt: "2026-09-19T00:00:00Z",
      endedAt: "2026-09-19T00:00:10Z",
      durationMs: 10000,
      answers: [
        {
          contentItemId: "en-ko-word-001",
          correct: true,
          mistakes: 0,
          hintUsed: false,
          responseTimeMs: 500,
          rank: "A",
          mode: "SPEED",
        },
      ],
    });
    expect(() =>
      parseProfile({
        ...profile,
        sessions: Array.from({ length: 101 }, (_, i) => ({
          ...profile.sessions[0],
          id: String(i),
        })),
      }),
    ).toThrow();
    expect(() =>
      parseProfile({
        ...profile,
        sessions: [{ ...profile.sessions[0], tokens: -1 }],
      }),
    ).toThrow();
    expect(() =>
      parseProfile({
        ...profile,
        sessions: [
          {
            ...profile.sessions[0],
            answers: [{ ...profile.sessions[0].answers[0], hintUsed: "no" }],
          },
        ],
      }),
    ).toThrow();
  });
});
