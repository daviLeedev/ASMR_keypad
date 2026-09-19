import { matchesAnswer } from "./answers";
import { DEFAULT_TUNING, TuningConfig } from "./config";
import { AnswerOptions, LearningStage } from "./types";

export function eligibleForRain(
  record: { stage: LearningStage } | undefined,
): boolean {
  return (
    record !== undefined &&
    ["RECALL", "SPEED", "MASTERED"].includes(record.stage)
  );
}

export function selectRainMatch<
  T extends { y: number; acceptedAnswers: readonly string[] },
>(
  falling: readonly T[],
  input: string,
  options: AnswerOptions = {},
): T | undefined {
  return falling.reduce<T | undefined>(
    (lowest, word) =>
      matchesAnswer(input, word.acceptedAnswers, options) &&
      (!lowest || word.y > lowest.y)
        ? word
        : lowest,
    undefined,
  );
}

export function rainWeight(
  masteryScore: number,
  config: TuningConfig = DEFAULT_TUNING,
): number {
  return (
    1 +
    (1 - Math.max(0, Math.min(100, masteryScore)) / 100) *
      config.rainMasteryWeight
  );
}

export function selectWeightedRain<T extends { masteryScore: number }>(
  items: readonly T[],
  random: number,
  config: TuningConfig = DEFAULT_TUNING,
): T | undefined {
  if (items.length === 0) return undefined;
  const total = items.reduce(
    (sum, item) => sum + rainWeight(item.masteryScore, config),
    0,
  );
  let cursor = Math.max(0, Math.min(1, random)) * total;
  for (const item of items) {
    cursor -= rainWeight(item.masteryScore, config);
    if (cursor < 0) return item;
  }
  return items[items.length - 1];
}
