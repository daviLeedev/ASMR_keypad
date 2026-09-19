import { DEFAULT_TUNING, TuningConfig } from "./config";
import { AnswerAttempt, GameMode, Rank } from "./types";

export function scoreAnswer(
  attempt: AnswerAttempt,
  config: TuningConfig = DEFAULT_TUNING,
): {
  rank: Rank;
  accuracy: number;
  wpm: number;
  expectedTimeMs: number;
  perfect: boolean;
} {
  const keys = Math.max(0, attempt.expectedKeystrokes);
  const accuracy = Math.max(
    0,
    Math.min(
      100,
      keys === 0 ? 0 : (1 - Math.max(0, attempt.mistakes) / keys) * 100,
    ),
  );
  const expectedTimeMs = config.baseTimeMs + keys * config.perKeyTimeMs;
  const ratio = Math.max(0, attempt.elapsedMs) / Math.max(1, expectedTimeMs);
  const perfect =
    attempt.correct && attempt.mistakes === 0 && !attempt.hintUsed;
  let rank: Rank = "F";
  if (attempt.correct) {
    rank =
      ratio <= config.rankRatios["S+"] && perfect
        ? "S+"
        : ratio <= config.rankRatios.S
          ? "S"
          : ratio <= config.rankRatios.A
            ? "A"
            : ratio <= config.rankRatios.B
              ? "B"
              : "C";
    if (attempt.hintUsed && (rank === "S+" || rank === "S")) rank = "A";
  }
  return {
    rank,
    accuracy,
    wpm: attempt.elapsedMs > 0 ? keys / 5 / (attempt.elapsedMs / 60000) : 0,
    expectedTimeMs,
    perfect,
  };
}

export function updateCombo(
  combo: number,
  result: Pick<AnswerAttempt, "correct" | "mistakes" | "hintUsed">,
  config: TuningConfig = DEFAULT_TUNING,
): { combo: number; milestone?: number } {
  const next = !result.correct
    ? 0
    : result.mistakes === 0 && !result.hintUsed
      ? combo + 1
      : combo;
  return {
    combo: next,
    ...(next > combo && config.comboMilestones.includes(next)
      ? { milestone: next }
      : {}),
  };
}

/** Session-only token grant calculation. Caller supplies a unique session ledger id. */
export function sessionReward(
  mode: GameMode,
  presented: number,
  correct: number,
  hints: number,
  rank: Rank = "C",
  config: TuningConfig = DEFAULT_TUNING,
): { xp: number; tokens: number } {
  if (presented <= 0 || correct <= 0) return { xp: 0, tokens: 0 };
  const completed = Math.min(presented, Math.max(0, correct));
  const quality = Math.max(
    0,
    1 -
      (Math.min(presented, Math.max(0, hints)) / presented) *
        (1 - config.hintMultiplier),
  );
  const bonus =
    mode === "SPEED" || mode === "RAIN" ? config.rankTokenBonus[rank] : 0;
  return {
    xp: Math.floor(config.sessionXp[mode] * completed * quality),
    tokens: Math.floor(
      (((config.sessionTokens[mode] + bonus) * completed) / presented) *
        quality,
    ),
  };
}

export function levelForXp(
  xp: number,
  config: TuningConfig = DEFAULT_TUNING,
): number {
  return 1 + Math.floor(Math.max(0, xp) / Math.max(1, config.xpPerLevel));
}
