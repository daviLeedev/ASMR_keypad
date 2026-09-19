import { GameMode, Rank } from "./types";

export interface TuningConfig {
  baseTimeMs: number;
  perKeyTimeMs: number;
  rankRatios: { "S+": number; S: number; A: number; B: number };
  comboMilestones: readonly number[];
  guidedToRecallSuccesses: number;
  recallToSpeedSuccesses: number;
  speedMasteryThreshold: number;
  masteredThreshold: number;
  masteredDistinctDays: number;
  masteredDistinctSessions: number;
  masteryGain: Record<GameMode, number>;
  mistakeMasteryMultiplier: number;
  hintMultiplier: number;
  wrongMasteryLoss: number;
  guidedMasteryCap: number;
  reviewIntervals: readonly { minScore: number; days: number }[];
  retryReviewMinutes: number;
  sameDayReviewMinutes: number;
  sessionXp: Record<GameMode, number>;
  sessionTokens: Record<GameMode, number>;
  rankTokenBonus: Record<Rank, number>;
  rewardedAdDailyCap: number;
  rewardedAdTokens: number;
  dailyGoalTokens: number;
  levelUpTokens: number;
  streakMilestones: readonly number[];
  streakMilestoneTokens: number;
  xpPerLevel: number;
  rainDurationSeconds: number;
  rainMaxObjects: number;
  rainScorePerCorrect: number;
  rainSpawnIntervalMs: number;
  rainMinimumSpawnIntervalMs: number;
  rainBaseFallSpeed: number;
  rainMasteryWeight: number;
}

/** Product tuning lives here; cosmetics are deliberately absent. */
export const DEFAULT_TUNING: TuningConfig = {
  baseTimeMs: 700,
  perKeyTimeMs: 280,
  rankRatios: { "S+": 0.65, S: 0.85, A: 1.1, B: 1.4 },
  comboMilestones: [5, 10, 20, 50],
  guidedToRecallSuccesses: 2,
  recallToSpeedSuccesses: 3,
  speedMasteryThreshold: 50,
  masteredThreshold: 90,
  masteredDistinctDays: 3,
  masteredDistinctSessions: 3,
  masteryGain: { GUIDED: 4, RECALL: 12, SPEED: 10, RAIN: 8 },
  mistakeMasteryMultiplier: 0.6,
  hintMultiplier: 0.4,
  wrongMasteryLoss: 12,
  guidedMasteryCap: 24,
  reviewIntervals: [
    { minScore: 90, days: 14 },
    { minScore: 75, days: 7 },
    { minScore: 50, days: 3 },
    { minScore: 25, days: 1 },
    { minScore: 0, days: 0 },
  ],
  retryReviewMinutes: 10,
  sameDayReviewMinutes: 60,
  sessionXp: { GUIDED: 5, RECALL: 12, SPEED: 15, RAIN: 12 },
  sessionTokens: { GUIDED: 1, RECALL: 5, SPEED: 6, RAIN: 6 },
  rankTokenBonus: { "S+": 4, S: 3, A: 2, B: 1, C: 0, F: 0 },
  rewardedAdDailyCap: 3,
  rewardedAdTokens: 10,
  dailyGoalTokens: 20,
  levelUpTokens: 25,
  streakMilestones: [3, 7, 14, 30, 60, 100],
  streakMilestoneTokens: 30,
  xpPerLevel: 150,
  rainDurationSeconds: 60,
  rainMaxObjects: 8,
  rainScorePerCorrect: 100,
  rainSpawnIntervalMs: 2500,
  rainMinimumSpawnIntervalMs: 900,
  rainBaseFallSpeed: 0.045,
  rainMasteryWeight: 3,
};
