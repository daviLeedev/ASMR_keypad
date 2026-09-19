import type { Profile } from "./model";
import { z } from "zod";
import { themes } from "../design-system/theme";

const id = z.string().min(1).max(500);
const natural = z.number().finite().int().min(0).max(Number.MAX_SAFE_INTEGER);
const positiveTime = z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER);
const language = z.enum(["ko", "en"]);
const mode = z.enum(["GUIDED", "RECALL", "SPEED", "RAIN"]);
const rank = z.enum(["S+", "S", "A", "B", "C", "F"]);
const timestamp = z.string().datetime({ offset: true });
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = Date.parse(`${value}T00:00:00Z`);
    return (
      Number.isFinite(parsed) &&
      new Date(parsed).toISOString().slice(0, 10) === value
    );
  }, "Invalid calendar date");
const themeIds = new Set(themes.map((theme) => theme.id));
const themeId = id.refine(
  (value) => themeIds.has(value),
  "Unknown keyboard theme",
);
const unique = (values: readonly string[]) =>
  new Set(values).size === values.length;

const settingsSchema = z
  .object({
    uiLanguage: language,
    studyLanguage: language,
    soundEnabled: z.boolean(),
    volume: z.number().finite().min(0).max(1),
    hapticsEnabled: z.boolean(),
    reducedMotion: z.boolean(),
    tutorialCompleted: z.boolean(),
    dailyGoalMinutes: z.union([z.literal(5), z.literal(10), z.literal(20)]),
    reminderHour: natural.max(23),
    reminderMinute: natural.max(59),
    reminderEnabled: z.boolean(),
  })
  .strict();

const ledgerEntrySchema = z
  .object({
    id,
    reason: id,
    amount: z
      .number()
      .finite()
      .int()
      .min(Number.MIN_SAFE_INTEGER)
      .max(Number.MAX_SAFE_INTEGER),
    balanceAfter: natural,
    referenceId: id.optional(),
    createdAt: timestamp,
  })
  .strict();
const economySchema = z
  .object({
    balance: natural,
    ledger: z.array(ledgerEntrySchema),
    unlockedThemeIds: z
      .array(themeId)
      .min(1)
      .refine(unique, "Duplicate keyboard ownership"),
    rewardedAdsByDate: z.record(calendarDate, natural),
  })
  .strict()
  .superRefine((economy, context) => {
    let runningBalance = 0;
    const ids = new Set<string>(),
      references = new Set<string>();
    economy.ledger.forEach((entry, index) => {
      const reference =
        entry.referenceId === undefined
          ? undefined
          : JSON.stringify([entry.reason, entry.referenceId]);
      if (
        ids.has(entry.id) ||
        (reference !== undefined && references.has(reference))
      )
        context.addIssue({
          code: "custom",
          path: ["ledger", index],
          message: "Duplicate economy transaction",
        });
      ids.add(entry.id);
      if (reference !== undefined) references.add(reference);
      runningBalance += entry.amount;
      if (
        !Number.isSafeInteger(runningBalance) ||
        runningBalance < 0 ||
        entry.balanceAfter !== runningBalance
      )
        context.addIssue({
          code: "custom",
          path: ["ledger", index, "balanceAfter"],
          message: "Economy ledger balance does not reconcile",
        });
    });
    if (runningBalance !== economy.balance)
      context.addIssue({
        code: "custom",
        path: ["balance"],
        message: "Token balance does not match the ledger",
      });
    if (!economy.unlockedThemeIds.includes("starter"))
      context.addIssue({
        code: "custom",
        path: ["unlockedThemeIds"],
        message: "Starter keyboard ownership is missing",
      });
  });

const masterySchema = z
  .object({
    contentItemId: id,
    stage: z.enum(["NEW", "GUIDED", "RECALL", "SPEED", "MASTERED"]),
    seenCount: natural,
    correctCount: natural,
    wrongCount: natural,
    hintCount: natural,
    bestTimeMs: positiveTime.optional(),
    masteryScore: z.number().finite().min(0).max(100),
    lastSeenAt: timestamp.optional(),
    nextReviewAt: timestamp.optional(),
    guidedSuccesses: natural,
    recallSuccesses: natural,
    cleanRecallSuccesses: natural,
    highRankDates: z
      .array(calendarDate)
      .refine(unique, "Duplicate mastery dates"),
    highRankSessionIds: z
      .array(id)
      .refine(unique, "Duplicate mastery sessions"),
  })
  .strict()
  .refine(
    (record) =>
      record.correctCount + record.wrongCount === record.seenCount &&
      record.hintCount <= record.seenCount &&
      record.guidedSuccesses <= record.correctCount &&
      record.cleanRecallSuccesses <= record.recallSuccesses &&
      record.recallSuccesses <= record.correctCount,
    "Mastery counters are inconsistent",
  );

const dailySchema = z
  .object({
    date: calendarDate,
    activeStudySeconds: positiveTime,
    goalSeconds: z.union([z.literal(300), z.literal(600), z.literal(1200)]),
    goalCompleted: z.boolean(),
  })
  .strict();
const streakSchema = z
  .object({
    currentStreak: natural,
    longestStreak: natural,
    lastCompletedDate: calendarDate.optional(),
    streakFreezeCount: natural,
  })
  .strict()
  .refine(
    (streak) => streak.currentStreak <= streak.longestStreak,
    "Current streak exceeds longest streak",
  );
const habitSchema = z
  .object({ daily: z.record(calendarDate, dailySchema), streak: streakSchema })
  .strict()
  .superRefine((habit, context) => {
    for (const [date, day] of Object.entries(habit.daily))
      if (date !== day.date)
        context.addIssue({
          code: "custom",
          path: ["daily", date],
          message: "Daily progress key does not match its date",
        });
  });

const answerSchema = z
  .object({
    contentItemId: id,
    correct: z.boolean(),
    mistakes: natural,
    hintUsed: z.boolean(),
    responseTimeMs: positiveTime,
    rank,
    mode,
    wpm: positiveTime.optional(),
  })
  .strict();
const sessionSchema = z
  .object({
    id,
    mode,
    tutorial: z.boolean(),
    startedAt: timestamp,
    endedAt: timestamp,
    durationMs: positiveTime,
    score: natural.optional(),
    answers: z.array(answerSchema).min(1),
    correct: natural,
    total: natural,
    mistakes: natural,
    hints: natural,
    xp: natural,
    tokens: natural,
    rank,
  })
  .strict()
  .refine(
    (session) =>
      session.total === session.answers.length &&
      session.correct ===
        session.answers.filter((answer) => answer.correct).length &&
      session.hints ===
        session.answers.filter((answer) => answer.hintUsed).length &&
      session.mistakes ===
        session.answers.reduce((sum, answer) => sum + answer.mistakes, 0),
    "Session totals do not match its answers",
  );

const profileSchema = z
  .object({
    version: z.literal(1),
    settings: settingsSchema,
    economy: economySchema,
    habit: habitSchema,
    mastery: z.record(id, masterySchema),
    xp: natural,
    selectedThemeId: themeId,
    sessions: z
      .array(sessionSchema)
      .max(100)
      .refine(
        (sessions) => unique(sessions.map((session) => session.id)),
        "Duplicate session IDs",
      ),
    best: z.record(id, positiveTime),
    starterPackOwned: z.boolean(),
  })
  .strict()
  .superRefine((profile, context) => {
    if (!profile.economy.unlockedThemeIds.includes(profile.selectedThemeId))
      context.addIssue({
        code: "custom",
        path: ["selectedThemeId"],
        message: "Selected keyboard is not owned",
      });
    for (const [key, mastery] of Object.entries(profile.mastery))
      if (key !== mastery.contentItemId)
        context.addIssue({
          code: "custom",
          path: ["mastery", key],
          message: "Mastery key does not match its content item",
        });
  });

/** Validate without mutation, coercion, fallback resets, or silently discarded fields. */
export function parseProfile(value: unknown): Profile {
  return profileSchema.parse(value);
}
