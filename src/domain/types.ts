export type Language = "en" | "ko";
export type LearningStage = "NEW" | "GUIDED" | "RECALL" | "SPEED" | "MASTERED";
export type GameMode = "GUIDED" | "RECALL" | "SPEED" | "RAIN";
export type Rank = "S+" | "S" | "A" | "B" | "C" | "F";

export interface AnswerOptions {
  language?: Language;
  caseSensitive?: boolean;
  punctuation?: "preserve" | "ignore-terminal";
}
export interface TypingState {
  input: string;
  mistakes: number;
  invalid: boolean;
}
export interface AnswerAttempt {
  correct: boolean;
  mistakes: number;
  hintUsed: boolean;
  elapsedMs: number;
  expectedKeystrokes: number;
}
export interface MasteryRecord {
  contentItemId: string;
  stage: LearningStage;
  seenCount: number;
  correctCount: number;
  wrongCount: number;
  hintCount: number;
  bestTimeMs?: number;
  masteryScore: number;
  lastSeenAt?: string;
  nextReviewAt?: string;
  guidedSuccesses: number;
  recallSuccesses: number;
  cleanRecallSuccesses: number;
  highRankDates: string[];
  highRankSessionIds: string[];
}
export interface MasteryAttempt
  extends Omit<AnswerAttempt, "expectedKeystrokes"> {
  mode: GameMode;
  at: string;
  sessionId: string;
  rank?: Rank;
  /** Supply the device-local date; UTC date is the deterministic fallback. */
  localDate?: string;
}
export interface LedgerEntry {
  id: string;
  reason: string;
  amount: number;
  balanceAfter: number;
  referenceId?: string;
  createdAt: string;
}
export interface EconomyState {
  balance: number;
  ledger: LedgerEntry[];
  unlockedThemeIds: string[];
  rewardedAdsByDate: Record<string, number>;
}
export interface DailyProgress {
  date: string;
  activeStudySeconds: number;
  goalSeconds: number;
  goalCompleted: boolean;
}
export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string;
  streakFreezeCount: number;
}
export interface HabitState {
  daily: Record<string, DailyProgress>;
  streak: StreakState;
}
export interface ThemeUnlock {
  id: string;
  unlockLevel: number;
  tokenCost: number;
}
