import type { ContentItem } from "../content";
import {
  compose,
  DEFAULT_TUNING,
  decomposeKeystrokes,
  eligibleForRain,
  isValidPrefix,
  rainWeight,
  scoreAnswer,
  selectRainMatch,
  updateCombo,
  updateTyping,
} from "../domain";
import type { Language, MasteryRecord } from "../domain";
import type { AnswerLog } from "./model";

export const RAIN_TUNING = {
  durationMs: DEFAULT_TUNING.rainDurationSeconds * 1000,
  maxObjects: DEFAULT_TUNING.rainMaxObjects,
  maxTickMs: 250,
  spawnIntervalMs: 2400,
  minimumSpawnIntervalMs: 1200,
  baseFallSpeed: DEFAULT_TUNING.rainBaseFallSpeed,
  fallSpeedIncrease: 0.5,
  dueWeightMultiplier: 1.75,
  scorePerCorrect: DEFAULT_TUNING.rainScorePerCorrect,
  comboBonusPerAnswer: 5,
  maxComboBonus: 100,
};

export interface RainFallingWord {
  instanceId: string;
  item: ContentItem;
  y: number;
  acceptedAnswers: string[];
  spawnedAtMs: number;
}

export interface RainState {
  elapsedMs: number;
  done: boolean;
  falling: RainFallingWord[];
  keys: string[];
  input: string;
  mistakes: number;
  invalid: boolean;
  combo: number;
  score: number;
  answers: AnswerLog[];
  pool: { item: ContentItem; weight: number }[];
  nextSpawnAtMs: number;
  nextInstanceId: number;
  startedAt: string;
}

function spawn(state: RainState, random: () => number): RainState {
  if (state.pool.length === 0 || state.falling.length >= RAIN_TUNING.maxObjects)
    return state;
  const total = state.pool.reduce(
    (sum, candidate) => sum + candidate.weight,
    0,
  );
  const value = random();
  let cursor =
    (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0) * total;
  let item = state.pool[state.pool.length - 1].item;
  for (const candidate of state.pool) {
    cursor -= candidate.weight;
    if (cursor < 0) {
      item = candidate.item;
      break;
    }
  }
  return {
    ...state,
    nextInstanceId: state.nextInstanceId + 1,
    falling: [
      ...state.falling,
      {
        instanceId: `rain-${state.nextInstanceId}`,
        item,
        y: 0,
        acceptedAnswers: [...item.acceptedAnswers],
        spawnedAtMs: state.elapsedMs,
      },
    ],
  };
}

/** Capture the clock once. Each subsequent transition depends only on its inputs. */
export function createRain(
  items: readonly ContentItem[],
  mastery: Record<string, MasteryRecord>,
  random: () => number = Math.random,
  now = new Date(),
): RainState {
  const pool = items
    .filter((item) => eligibleForRain(mastery[item.id]))
    .map((item) => {
      const record = mastery[item.id];
      const due =
        !record.nextReviewAt ||
        Date.parse(record.nextReviewAt) <= now.getTime();
      return {
        item,
        weight:
          rainWeight(record.masteryScore) *
          (due ? RAIN_TUNING.dueWeightMultiplier : 1),
      };
    });
  return spawn(
    {
      elapsedMs: 0,
      done: false,
      falling: [],
      keys: [],
      input: "",
      mistakes: 0,
      invalid: false,
      combo: 0,
      score: 0,
      answers: [],
      pool,
      nextSpawnAtMs: RAIN_TUNING.spawnIntervalMs,
      nextInstanceId: 1,
      startedAt: now.toISOString(),
    },
    random,
  );
}

/** Caller pauses its timer in the background; the cap is a second guard against long frame jumps. */
export function tickRain(
  state: RainState,
  deltaMs: number,
  random: () => number = Math.random,
): RainState {
  if (state.done || !Number.isFinite(deltaMs) || deltaMs <= 0) return state;
  const dt = Math.min(
    deltaMs,
    RAIN_TUNING.maxTickMs,
    RAIN_TUNING.durationMs - state.elapsedMs,
  );
  const elapsedMs = state.elapsedMs + dt;
  const phase = elapsedMs / RAIN_TUNING.durationMs;
  const movement =
    (RAIN_TUNING.baseFallSpeed *
      (1 + phase * RAIN_TUNING.fallSpeedIncrease) *
      dt) /
    1000;
  const moved = state.falling.map((word) => ({
    ...word,
    y: word.y + movement,
  }));
  const missed = moved.filter((word) => word.y >= 1);
  const falling = moved.filter((word) => word.y < 1);
  const answers: AnswerLog[] = [
    ...state.answers,
    ...missed.map((word) => ({
      contentItemId: word.item.id,
      correct: false,
      mistakes: state.mistakes,
      hintUsed: false,
      responseTimeMs: Math.max(0, elapsedMs - word.spawnedAtMs),
      rank: "F" as const,
      mode: "RAIN" as const,
    })),
  ];
  let next: RainState = {
    ...state,
    elapsedMs,
    falling,
    answers,
    done: elapsedMs >= RAIN_TUNING.durationMs,
  };
  if (missed.length)
    next = {
      ...next,
      combo: 0,
      keys: [],
      input: "",
      mistakes: 0,
      invalid: false,
    };
  if (next.done) return { ...next, falling: [] };
  if (elapsedMs >= state.nextSpawnAtMs) {
    const interval = Math.max(
      RAIN_TUNING.minimumSpawnIntervalMs,
      RAIN_TUNING.spawnIntervalMs * (1 - phase * 0.5),
    );
    next = spawn(next, random);
    next = { ...next, nextSpawnAtMs: elapsedMs + interval };
  }
  if (next.input)
    next = {
      ...next,
      invalid: !isValidPrefix(
        next.input,
        next.falling.flatMap((word) => word.acceptedAnswers),
      ),
    };
  return next;
}

export function typeRain(
  state: RainState,
  key: string,
  language: Language,
): RainState {
  if (
    state.done ||
    state.falling.length === 0 ||
    !key ||
    key === "ENTER" ||
    key === "Enter"
  )
    return state;
  const backspace = key === "BACKSPACE" || key === "Backspace" || key === "⌫";
  const keys = backspace
    ? state.keys.slice(0, -1)
    : [...state.keys, key === "SPACE" ? " " : key];
  const input = language === "ko" ? compose(keys) : keys.join("");
  const typing = updateTyping(
    state,
    input,
    state.falling.flatMap((word) => word.acceptedAnswers),
    { language },
  );
  const next = { ...state, ...typing, keys };
  const match = selectRainMatch(state.falling, input, { language });
  if (!match) return next;
  const responseTimeMs = Math.max(1, state.elapsedMs - match.spawnedAtMs);
  const result = {
    correct: true,
    mistakes: typing.mistakes,
    hintUsed: false,
    elapsedMs: responseTimeMs,
    expectedKeystrokes: decomposeKeystrokes(input).length,
  };
  const scored = scoreAnswer(result);
  const combo = updateCombo(state.combo, result).combo;
  const answer: AnswerLog = {
    contentItemId: match.item.id,
    correct: true,
    mistakes: typing.mistakes,
    hintUsed: false,
    responseTimeMs,
    rank: scored.rank,
    mode: "RAIN",
    wpm: scored.wpm,
  };
  return {
    ...next,
    falling: state.falling.filter(
      (word) => word.instanceId !== match.instanceId,
    ),
    keys: [],
    input: "",
    mistakes: 0,
    invalid: false,
    combo,
    score:
      state.score +
      RAIN_TUNING.scorePerCorrect +
      Math.min(
        RAIN_TUNING.maxComboBonus,
        combo * RAIN_TUNING.comboBonusPerAnswer,
      ),
    answers: [...state.answers, answer],
  };
}
