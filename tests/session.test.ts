import {
  createProfile,
  selectLesson,
  tutorialLesson,
  applySession,
  recordActiveTime,
  applyStarterPack,
  safeHint,
  averageSessionWpm,
} from "../src/state/model";
import { ActiveTimer } from "../src/state/timing";
import { ghostSegments } from "../src/state/ghost";
import { seedItems } from "../src/content";
import { createMastery } from "../src/domain";

test("session WPM averages only sentence answers that measured WPM", () => {
  expect(
    averageSessionWpm([{ wpm: 24 }, { wpm: undefined }, { wpm: 36 }]),
  ).toBe(30);
  expect(averageSessionWpm([{ wpm: undefined }])).toBeNull();
});

test("tutorial uses two guided items and recalls an already shown item", () => {
  const steps = tutorialLesson("en");
  expect(steps.map((s) => s.mode)).toEqual(["GUIDED", "GUIDED", "RECALL"]);
  expect(steps[2].item.id).toBe(steps[0].item.id);
});
test("fresh profile cannot enter speed or rain with unseen vocabulary", () => {
  const p = createProfile("en");
  expect(selectLesson(p, "SPEED", "WORD")).toHaveLength(0);
  expect(selectLesson(p, "RAIN", "WORD")).toHaveLength(0);
});
test("recall selects exposed vocabulary and prioritizes due reviews", () => {
  const p = createProfile("ko");
  const item = seedItems.find((i) => i.targetLanguage === "en")!;
  p.mastery[item.id] = { ...createMastery(item.id), stage: "GUIDED" };
  expect(selectLesson(p, "RECALL", "WORD")[0].item.id).toBe(item.id);
});
test("hint never exposes a whole one-character or longer answer", () => {
  expect(safeHint("a")).toBe("•");
  expect(safeHint("apple")).toBe("a…");
  expect(safeHint("사과")).toBe("사…");
});
test("session completion grants rewards, mastery and xp exactly once", () => {
  const p = createProfile("ko");
  const item = seedItems.find((i) => i.targetLanguage === "en")!;
  const session = {
    id: "s1",
    mode: "GUIDED" as const,
    tutorial: true,
    startedAt: "2026-09-19T01:00:00.000Z",
    endedAt: "2026-09-19T01:01:00.000Z",
    durationMs: 60000,
    answers: [
      {
        contentItemId: item.id,
        correct: true,
        mistakes: 0,
        hintUsed: false,
        responseTimeMs: 1200,
        rank: "A" as const,
        mode: "GUIDED" as const,
      },
    ],
  };
  const next = applySession(p, session);
  expect(next.xp).toBeGreaterThan(0);
  expect(next.mastery[item.id].stage).toBe("GUIDED");
  expect(next.settings.tutorialCompleted).toBe(true);
  expect(applySession(next, session)).toEqual(next);
});
test("active time ignores background and long suspended intervals and daily grant is idempotent", () => {
  const p = createProfile("en");
  const now = new Date("2026-09-19T12:00:00");
  expect(
    recordActiveTime(p, now, new Date(now.getTime() + 1000), false),
  ).toEqual(p);
  expect(
    recordActiveTime(p, now, new Date(now.getTime() + 600000), true),
  ).toEqual(p);
  let current = p;
  for (let i = 0; i < 301; i++)
    current = recordActiveTime(
      current,
      new Date(now.getTime() + i * 1000),
      new Date(now.getTime() + (i + 1) * 1000),
      true,
    );
  expect(current.habit.streak.currentStreak).toBe(1);
  expect(
    current.economy.ledger.filter((l) => l.reason === "daily_goal"),
  ).toHaveLength(1);
});
test("purchase restore never duplicates consumable starter benefits", () => {
  const p = createProfile("en");
  const a = applyStarterPack(p, "store-tx-1");
  expect(a.economy.balance).toBe(p.economy.balance + 500);
  expect(a.economy.unlockedThemeIds).toContain("midnight");
  expect(applyStarterPack(a, "store-tx-1")).toEqual(a);
  expect(applyStarterPack(a, "restored-different-id")).toEqual(a);
});

test("clean but slow Speed answers retain C rank and receive no high-rank bonus", () => {
  const profile = createProfile("ko");
  const contentItemId = seedItems.find((i) => i.targetLanguage === "en")!.id;
  const base = {
    id: "slow-speed",
    mode: "SPEED" as const,
    tutorial: false,
    startedAt: "2026-09-19T00:00:00Z",
    endedAt: "2026-09-19T00:01:00Z",
    durationMs: 60000,
  };
  const answer = {
    contentItemId,
    correct: true,
    mistakes: 0,
    hintUsed: false,
    responseTimeMs: 20000,
    rank: "C" as const,
    mode: "SPEED" as const,
  };
  const slow = applySession(profile, { ...base, answers: [answer, answer] });
  expect(slow.sessions[0].rank).toBe("C");
  expect(slow.sessions[0].tokens).toBe(6);
  const fast = applySession(profile, {
    ...base,
    id: "fast-speed",
    answers: [
      { ...answer, responseTimeMs: 600, rank: "S+" },
      { ...answer, responseTimeMs: 500, rank: "S+" },
    ],
  });
  expect(fast.sessions[0].rank).toBe("S+");
  expect(fast.sessions[0].tokens).toBe(10);
  expect(
    applySession(
      { ...slow, sessions: [] },
      { ...base, answers: [answer, answer] },
    ),
  ).toEqual({ ...slow, sessions: [] });
});

test("session rank accounts for failed and mixed per-answer ranks", () => {
  const profile = createProfile("ko");
  const contentItemId = seedItems[0].id;
  const session = {
    id: "mixed",
    mode: "SPEED" as const,
    tutorial: false,
    startedAt: "2026-09-19T00:00:00Z",
    endedAt: "2026-09-19T00:01:00Z",
    durationMs: 60000,
  };
  const answer = {
    contentItemId,
    correct: true,
    mistakes: 0,
    hintUsed: false,
    responseTimeMs: 1000,
    rank: "S" as const,
    mode: "SPEED" as const,
  };
  const mixed = applySession(profile, {
    ...session,
    answers: [answer, { ...answer, rank: "C" }],
  });
  expect(mixed.sessions[0].rank).toBe("B");
  const failed = applySession(profile, {
    ...session,
    answers: [{ ...answer, correct: false, rank: "F" }],
  });
  expect(failed.sessions[0].rank).toBe("F");
});

test("active timer measures a sub-500ms answer exactly and excludes pauses", () => {
  const timer = new ActiveTimer();
  expect(timer.elapsed(1000)).toBe(0);
  timer.start(1000);
  expect(timer.elapsed(1123.75)).toBe(123.75);
  timer.pause(1200);
  expect(timer.elapsed(9000)).toBe(200);
  timer.pause(9500);
  timer.resume(10000);
  timer.resume(10100);
  expect(timer.elapsed(10250)).toBe(450);
  timer.start(11000);
  expect(timer.elapsed(11150)).toBe(150);
});

test("rain completion retains final score and records best independently by study language", () => {
  const p = createProfile("ko");
  const result = applySession(p, {
    id: "rain-score",
    mode: "RAIN",
    tutorial: false,
    startedAt: "2026-09-19T00:00:00Z",
    endedAt: "2026-09-19T00:01:00Z",
    durationMs: 60000,
    score: 420,
    answers: [
      {
        contentItemId: seedItems[0].id,
        mode: "RAIN",
        correct: true,
        mistakes: 0,
        hintUsed: false,
        responseTimeMs: 2000,
        rank: "A",
      },
    ],
  });
  expect(result.sessions[0].score).toBe(420);
  expect(result.best["rain:en"]).toBe(420);
});

test("active timer does not return negative duration for stale monotonic samples", () => {
  const timer = new ActiveTimer();
  timer.start(100);
  expect(timer.elapsed(90)).toBe(0);
  timer.pause(90);
  expect(timer.elapsed(500)).toBe(0);
});

test.each([
  [[], { committed: "", composing: "", ghost: "사과" }],
  [["ㅅ"], { committed: "", composing: "ㅅ", ghost: "사과" }],
  [["ㅅ", "ㅏ"], { committed: "사", composing: "", ghost: "과" }],
  [["ㅅ", "ㅏ", "ㄱ"], { committed: "사", composing: "ㄱ", ghost: "과" }],
  [["ㅅ", "ㅏ", "ㄱ", "ㅗ"], { committed: "사", composing: "고", ghost: "과" }],
  [
    ["ㅅ", "ㅏ", "ㄱ", "ㅗ", "ㅏ"],
    { committed: "사과", composing: "", ghost: "" },
  ],
])(
  "guided Korean ghost preserves incomplete syllables for %j",
  (keys, expected) => {
    expect(ghostSegments(keys as string[], "사과")).toEqual(expected);
  },
);

test("ghost segments preserve compound finals, English and invalid composing text", () => {
  expect(ghostSegments(["ㄷ", "ㅏ", "ㄹ"], "닭")).toEqual({
    committed: "",
    composing: "달",
    ghost: "닭",
  });
  expect(ghostSegments(["ㄷ", "ㅏ", "ㄹ", "ㄱ"], "닭")).toEqual({
    committed: "닭",
    composing: "",
    ghost: "",
  });
  expect(ghostSegments(["a", "p"], "apple")).toEqual({
    committed: "ap",
    composing: "",
    ghost: "ple",
  });
  expect(ghostSegments(["ㅅ", "ㅓ"], "사과")).toEqual({
    committed: "",
    composing: "서",
    ghost: "사과",
  });
});
