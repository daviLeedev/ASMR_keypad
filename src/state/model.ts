import { seedItems, type ContentItem } from "../content";
import {
  createEconomy,
  createHabit,
  createMastery,
  updateMastery,
  transact,
  sessionReward,
  levelForXp,
  localDateKey,
  addStudyTime,
  completeDay,
  type Language,
  type GameMode,
  type Rank,
  type EconomyState,
  type HabitState,
  type MasteryRecord,
} from "../domain";
export interface Settings {
  uiLanguage: Language;
  studyLanguage: Language;
  soundEnabled: boolean;
  volume: number;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  tutorialCompleted: boolean;
  dailyGoalMinutes: 5 | 10 | 20;
  reminderHour: number;
  reminderMinute: number;
  reminderEnabled: boolean;
}
export interface AnswerLog {
  contentItemId: string;
  correct: boolean;
  mistakes: number;
  hintUsed: boolean;
  responseTimeMs: number;
  rank: Rank;
  mode: GameMode;
  wpm?: number;
}
export interface SessionInput {
  id: string;
  mode: GameMode;
  tutorial: boolean;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  score?: number;
  answers: AnswerLog[];
}
export interface SessionSummary extends SessionInput {
  correct: number;
  total: number;
  mistakes: number;
  hints: number;
  xp: number;
  tokens: number;
  rank: Rank;
}
export function averageSessionWpm(
  answers: readonly Pick<AnswerLog, "wpm">[],
): number | null {
  const measured = answers.flatMap((answer) =>
    answer.wpm === undefined ? [] : [answer.wpm],
  );
  return measured.length
    ? measured.reduce((sum, wpm) => sum + wpm, 0) / measured.length
    : null;
}
export interface Profile {
  version: 1;
  settings: Settings;
  economy: EconomyState;
  habit: HabitState;
  mastery: Record<string, MasteryRecord>;
  xp: number;
  selectedThemeId: string;
  sessions: SessionSummary[];
  best: Record<string, number>;
  starterPackOwned: boolean;
}
export interface LessonStep {
  item: ContentItem;
  mode: GameMode;
}
export const APP_TUNING = {
  lessonItems: 5,
  rainDurationMs: 60000,
  rainMaxObjects: 8,
  rainSpawnMs: 2400,
  speedTimeoutMs: 30000,
  dailyReward: 20,
  levelReward: 25,
  streakMilestone: 7,
  streakReward: 30,
  starterTokens: 500,
  starterFreezes: 2,
  idleMs: 15000,
};
export interface SessionRankTuning {
  points: Record<Rank, number>;
  thresholds: readonly { rank: Rank; minAverage: number }[];
  hintRankCap: Rank;
  imperfectRankCap: Rank;
}
export const SESSION_RANK_TUNING: SessionRankTuning = {
  points: { "S+": 5, S: 4, A: 3, B: 2, C: 1, F: 0 },
  thresholds: [
    { rank: "S+", minAverage: 5 },
    { rank: "S", minAverage: 4 },
    { rank: "A", minAverage: 3 },
    { rank: "B", minAverage: 2 },
    { rank: "C", minAverage: 1 },
    { rank: "F", minAverage: 0 },
  ],
  hintRankCap: "A",
  imperfectRankCap: "S",
};
/** Preserve measured answer performance; clean completion alone does not imply speed. */
export function aggregateSessionRank(
  answers: readonly AnswerLog[],
  tuning: SessionRankTuning = SESSION_RANK_TUNING,
): Rank {
  if (!answers.length) return "F";
  const average =
    answers.reduce(
      (sum, answer) => sum + tuning.points[answer.correct ? answer.rank : "F"],
      0,
    ) / answers.length;
  let rank =
    [...tuning.thresholds]
      .sort((a, b) => b.minAverage - a.minAverage)
      .find((threshold) => average >= threshold.minAverage)?.rank ?? "F";
  if (
    answers.some((answer) => answer.hintUsed) &&
    tuning.points[rank] > tuning.points[tuning.hintRankCap]
  )
    rank = tuning.hintRankCap;
  if (
    answers.some((answer) => !answer.correct || answer.mistakes > 0) &&
    tuning.points[rank] > tuning.points[tuning.imperfectRankCap]
  )
    rank = tuning.imperfectRankCap;
  return rank;
}
export function createProfile(uiLanguage: Language): Profile {
  return {
    version: 1,
    settings: {
      uiLanguage,
      studyLanguage: uiLanguage === "ko" ? "en" : "ko",
      soundEnabled: true,
      volume: 0.65,
      hapticsEnabled: true,
      reducedMotion: false,
      tutorialCompleted: false,
      dailyGoalMinutes: 5,
      reminderHour: 19,
      reminderMinute: 0,
      reminderEnabled: false,
    },
    economy: createEconomy(),
    habit: createHabit(),
    mastery: {},
    xp: 0,
    selectedThemeId: "starter",
    sessions: [],
    best: {},
    starterPackOwned: false,
  };
}
export function tutorialLesson(language: Language): LessonStep[] {
  const items = seedItems.filter(
    (i) => i.targetLanguage === language && i.kind === "WORD",
  );
  return [
    { item: items[0], mode: "GUIDED" },
    { item: items[1], mode: "GUIDED" },
    { item: items[0], mode: "RECALL" },
  ];
}
export function selectLesson(
  profile: Profile,
  mode: GameMode,
  kind: ContentItem["kind"] = "WORD",
): LessonStep[] {
  const items = seedItems
    .filter(
      (i) =>
        i.targetLanguage === profile.settings.studyLanguage && i.kind === kind,
    )
    .filter((i) => {
      const stage = profile.mastery[i.id]?.stage ?? "NEW";
      return (
        mode === "GUIDED" ||
        (mode === "RECALL"
          ? stage !== "NEW"
          : ["RECALL", "SPEED", "MASTERED"].includes(stage))
      );
    });
  items.sort((a, b) => {
    const ma = profile.mastery[a.id],
      mb = profile.mastery[b.id];
    return mode === "GUIDED"
      ? (ma?.seenCount ?? 0) - (mb?.seenCount ?? 0)
      : (ma?.nextReviewAt ?? "").localeCompare(mb?.nextReviewAt ?? "") ||
          (ma?.masteryScore ?? 0) - (mb?.masteryScore ?? 0);
  });
  return (mode === "RAIN" ? items : items.slice(0, APP_TUNING.lessonItems)).map(
    (item) => ({ item, mode }),
  );
}
export function safeHint(answer: string): string {
  const chars = Array.from(answer);
  return chars.length < 2 ? "•" : chars[0] + "…";
}
export function applySession(profile: Profile, session: SessionInput): Profile {
  if (
    profile.sessions.some((s) => s.id === session.id) ||
    profile.economy.ledger.some(
      (l) => l.referenceId === `session:${session.id}`,
    ) ||
    !session.answers.length
  )
    return profile;
  const correct = session.answers.filter((a) => a.correct).length,
    hints = session.answers.filter((a) => a.hintUsed).length,
    mistakes = session.answers.reduce((n, a) => n + a.mistakes, 0);
  const rank = aggregateSessionRank(session.answers);
  const reward = sessionReward(
    session.mode,
    session.answers.length,
    correct,
    hints,
    rank,
  );
  let economy = transact(profile.economy, {
    id: `session:${session.id}`,
    referenceId: `session:${session.id}`,
    reason: "session",
    amount: reward.tokens,
    at: session.endedAt,
  });
  const xp = profile.xp + reward.xp;
  for (let level = levelForXp(profile.xp) + 1; level <= levelForXp(xp); level++)
    economy = transact(economy, {
      id: `level:${level}`,
      referenceId: `level:${level}`,
      reason: "level_up",
      amount: APP_TUNING.levelReward,
      at: session.endedAt,
    });
  const mastery = { ...profile.mastery };
  for (const answer of session.answers)
    mastery[answer.contentItemId] = updateMastery(
      mastery[answer.contentItemId] ?? createMastery(answer.contentItemId),
      {
        ...answer,
        elapsedMs: answer.responseTimeMs,
        at: session.endedAt,
        sessionId: session.id,
        localDate: localDateKey(new Date(session.endedAt)),
      },
    );
  const summary: SessionSummary = {
      ...session,
      correct,
      total: session.answers.length,
      mistakes,
      hints,
      rank,
      ...reward,
    },
    best = { ...profile.best };
  if (session.mode === "RAIN" && session.score !== undefined)
    best[`rain:${profile.settings.studyLanguage}`] = Math.max(
      best[`rain:${profile.settings.studyLanguage}`] ?? 0,
      session.score,
    );
  if (session.mode === "SPEED")
    for (const a of session.answers)
      if (a.correct && !a.hintUsed)
        best[a.contentItemId] = Math.min(
          best[a.contentItemId] ?? Infinity,
          a.responseTimeMs,
        );
  return {
    ...profile,
    economy,
    xp,
    mastery,
    best,
    sessions: [...profile.sessions, summary].slice(-100),
    settings: {
      ...profile.settings,
      tutorialCompleted: profile.settings.tutorialCompleted || session.tutorial,
    },
  };
}
export function recordActiveTime(
  profile: Profile,
  start: Date,
  end: Date,
  active: boolean,
): Profile {
  const delta = end.getTime() - start.getTime();
  if (!active || delta <= 0 || delta > 2500) return profile;
  const daily = addStudyTime(
    profile.habit.daily,
    start,
    end,
    profile.settings.dailyGoalMinutes * 60,
  );
  let streak = profile.habit.streak,
    economy = profile.economy;
  for (const day of Object.values(daily))
    if (
      day.activeStudySeconds >= day.goalSeconds &&
      !profile.habit.daily[day.date]?.goalCompleted
    ) {
      day.goalCompleted = true;
      streak = completeDay(streak, day.date);
      economy = transact(economy, {
        id: `daily:${day.date}`,
        referenceId: `daily:${day.date}`,
        reason: "daily_goal",
        amount: APP_TUNING.dailyReward,
        at: end.toISOString(),
      });
      if (
        streak.currentStreak > 0 &&
        streak.currentStreak % APP_TUNING.streakMilestone === 0
      )
        economy = transact(economy, {
          id: `streak:${day.date}`,
          referenceId: `streak:${day.date}`,
          reason: "streak_milestone",
          amount: APP_TUNING.streakReward,
          at: end.toISOString(),
        });
    }
  return { ...profile, economy, habit: { daily, streak } };
}
export function applyStarterPack(
  profile: Profile,
  transactionId: string,
): Profile {
  if (profile.starterPackOwned || !transactionId) return profile;
  const economy = transact(profile.economy, {
    id: `purchase:${transactionId}`,
    referenceId: "starter-pack-entitlement",
    reason: "starter_pack",
    amount: APP_TUNING.starterTokens,
    at: new Date().toISOString(),
  });
  return {
    ...profile,
    starterPackOwned: true,
    economy: {
      ...economy,
      unlockedThemeIds: [...new Set([...economy.unlockedThemeIds, "midnight"])],
    },
    habit: {
      ...profile.habit,
      streak: {
        ...profile.habit.streak,
        streakFreezeCount:
          profile.habit.streak.streakFreezeCount + APP_TUNING.starterFreezes,
      },
    },
  };
}
